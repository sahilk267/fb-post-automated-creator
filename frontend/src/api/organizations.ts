import { apiGet, apiPost, apiDelete } from './client';

export type OrganizationRole = "owner" | "admin" | "member" | "editor";

export type SubscriptionTier = "free" | "pro" | "agency";

export interface Organization {
    id: number;
    name: string;
    slug: string;
    created_by_id: number;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
    subscription_tier: SubscriptionTier;
    subscription_status?: string;
    subscription_ends_at?: string;
    stripe_customer_id?: string;
}

export interface OrgMember {
    id: number;
    user_id: number;
    organization_id: number;
    role: OrganizationRole;
    joined_at: string;
    username?: string;
}

export async function createOrganization(name: string, slug: string): Promise<Organization> {
    return apiPost<Organization>('organizations/', { name, slug });
}

export async function listMyOrganizations(): Promise<Organization[]> {
    return apiGet<Organization[]>('organizations/');
}

export async function listOrgMembers(orgId: number): Promise<OrgMember[]> {
    return apiGet<OrgMember[]>(`organizations/${orgId}/members`);
}

export async function addOrgMember(orgId: number, userEmail: string, role: OrganizationRole = "member"): Promise<OrgMember> {
    return apiPost<OrgMember>(`organizations/${orgId}/members`, { user_email: userEmail, role });
}

export async function removeOrgMember(orgId: number, userId: number): Promise<void> {
    return apiDelete(`organizations/${orgId}/members/${userId}`);
}
