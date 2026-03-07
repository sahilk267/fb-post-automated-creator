"""Service for managing Organizations and memberships."""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.organization import Organization, OrganizationMember, OrganizationRole
from app.services.audit_service import AuditService


class OrgService:
    def __init__(self, db: Session):
        self.db = db
        self.audit = AuditService()

    def create_organization(self, name: str, slug: str, creator_id: int) -> Organization:
        """Create a new organization and add the creator as OWNER."""
        org = Organization(name=name, slug=slug, created_by_id=creator_id)
        self.db.add(org)
        self.db.flush()

        member = OrganizationMember(
            organization_id=org.id,
            user_id=creator_id,
            role=OrganizationRole.OWNER
        )
        self.db.add(member)
        
        self.audit.log_action(
            db=self.db,
            action="org.created",
            entity_type="organization",
            entity_id=org.id,
            user_id=creator_id,
            description=f"Organization '{name}' created"
        )
        
        self.db.commit()
        self.db.refresh(org)
        return org

    def get_org(self, org_id: int) -> Optional[Organization]:
        """Fetch an organization by ID."""
        return self.db.query(Organization).filter(Organization.id == org_id).first()

    def verify_admin_access(self, org_id: int, user_id: int) -> bool:
        """Verify if a user has ADMIN or OWNER role in an organization."""
        member = (
            self.db.query(OrganizationMember)
            .filter(OrganizationMember.organization_id == org_id, OrganizationMember.user_id == user_id)
            .first()
        )
        return member is not None and member.role in [OrganizationRole.OWNER, OrganizationRole.ADMIN]

    def get_user_organizations(self, user_id: int) -> List[Organization]:
        """List all organizations where the user is a member."""
        return (
            self.db.query(Organization)
            .join(OrganizationMember)
            .filter(OrganizationMember.user_id == user_id)
            .all()
        )

    def get_organization_members(self, org_id: int) -> List[OrganizationMember]:
        """List all members of an organization."""
        return (
            self.db.query(OrganizationMember)
            .filter(OrganizationMember.organization_id == org_id)
            .all()
        )

    def add_member(self, org_id: int, user_id: int, role: OrganizationRole, admin_id: int) -> OrganizationMember:
        """Add a user to an organization."""
        # Verification of admin_id's role should happen in API layer or here
        member = OrganizationMember(organization_id=org_id, user_id=user_id, role=role)
        self.db.add(member)
        
        self.audit.log_action(
            db=self.db,
            action="org.member_added",
            entity_type="organization",
            entity_id=org_id,
            user_id=admin_id,
            description=f"User {user_id} added to org {org_id} as {role.value}"
        )
        
        self.db.commit()
        return member

    def remove_member(self, org_id: int, user_id: int, admin_id: int) -> bool:
        """Remove a member from an organization."""
        member = (
            self.db.query(OrganizationMember)
            .filter(OrganizationMember.organization_id == org_id, OrganizationMember.user_id == user_id)
            .first()
        )
        if not member:
            return False
            
        if member.role == OrganizationRole.OWNER:
            raise ValueError("Cannot remove the OWNER of an organization")
            
        self.db.delete(member)
        
        self.audit.log_action(
            db=self.db,
            action="org.member_removed",
            entity_type="organization",
            entity_id=org_id,
            user_id=admin_id,
            description=f"User {user_id} removed from org {org_id}"
        )
        
        self.db.commit()
        return True
