"""Organization API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.models.organization import OrganizationRole
from app.schemas.organization import OrgCreate, OrgResponse, OrgMemberResponse, OrgAddMemberRequest
from app.services.org_service import OrgService

router = APIRouter()


@router.post("/", response_model=OrgResponse, status_code=status.HTTP_201_CREATED)
def create_org(
    org_data: OrgCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new organization."""
    service = OrgService(db)
    try:
        org = service.create_organization(org_data.name, org_data.slug, current_user.id)
        return org
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[OrgResponse])
def list_my_orgs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List organizations the current user belongs to."""
    service = OrgService(db)
    return service.get_user_organizations(current_user.id)


@router.get("/{org_id}/members", response_model=List[OrgMemberResponse])
def list_org_members(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List members of an organization."""
    # Check if user is a member of this org
    service = OrgService(db)
    my_orgs = service.get_user_organizations(current_user.id)
    if not any(o.id == org_id for o in my_orgs):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this organization")
    
    members = service.get_organization_members(org_id)
    # Populate username for response
    for m in members:
        m.username = m.user.username
    return members


@router.post("/{org_id}/members", response_model=OrgMemberResponse)
def add_org_member(
    org_id: int,
    req: OrgAddMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a member to an organization by email."""
    # Verify current user is OWNER or ADMIN in this org
    service = OrgService(db)
    from app.models.organization import OrganizationMember
    current_member = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == current_user.id
    ).first()
    
    if not current_member or current_member.role not in [OrganizationRole.OWNER, OrganizationRole.ADMIN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    
    # Find user by email
    new_user = db.query(User).filter(User.email == req.user_email).first()
    if not new_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    try:
        member = service.add_member(org_id, new_user.id, req.role, current_user.id)
        member.username = new_user.username
        return member
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{org_id}/members/{user_id}")
def remove_org_member(
    org_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a member from an organization."""
    service = OrgService(db)
    from app.models.organization import OrganizationMember
    current_member = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == current_user.id
    ).first()
    
    if not current_member or current_member.role not in [OrganizationRole.OWNER, OrganizationRole.ADMIN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    
    try:
        success = service.remove_member(org_id, user_id, current_user.id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
        return {"detail": "Member removed"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
