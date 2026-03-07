import { apiGet, apiPost } from './client';

export interface SystemSetting {
    key: string;
    value: string;
    is_encrypted: boolean;
    description?: string;
    updated_at: string;
}

export interface SettingUpdateReq {
    key: string;
    value: string;
    is_encrypted: boolean;
    description?: string;
}

export interface TestResult {
    success: boolean;
    message?: string;
    error?: string;
}

export interface AdminUser {
    id: number;
    username: string;
    email: string;
    is_active: boolean;
    is_admin: boolean;
    created_at: string;
}

export interface AdminOrg {
    id: number;
    name: string;
    subscription_tier: string;
    subscription_status: string;
    stripe_customer_id?: string;
    created_at: string;
}

export interface AuditLog {
    id: number;
    user_id: number;
    action: string;
    module: string;
    details?: string;
    created_at: string;
}

export async function listSystemSettings(): Promise<SystemSetting[]> {
    return apiGet<SystemSetting[]>('admin/settings/keys');
}

export async function updateSystemSetting(req: SettingUpdateReq): Promise<{ status: string; key: string }> {
    return apiPost<{ status: string; key: string }>('admin/settings/update', req);
}

export async function testStripe(): Promise<TestResult> {
    return apiGet<TestResult>('admin/settings/test/stripe');
}

export async function testGDrive(): Promise<TestResult> {
    return apiGet<TestResult>('admin/settings/test/gdrive');
}

export async function syncEnv(): Promise<{ status: string; message: string }> {
    return apiPost<{ status: string; message: string }>('admin/settings/sync-env', {});
}

export async function listAllUsers(): Promise<AdminUser[]> {
    return apiGet<AdminUser[]>('admin/settings/users');
}

export async function updateUserStatus(userId: number, isActive: boolean): Promise<any> {
    return apiPost(`admin/settings/users/${userId}/status?is_active=${isActive}`, {});
}

export async function listAllOrgs(): Promise<AdminOrg[]> {
    return apiGet<AdminOrg[]>('admin/settings/organizations');
}

export async function updateOrgTier(orgId: number, tier: string): Promise<any> {
    return apiPost(`admin/settings/organizations/${orgId}/tier?tier=${tier}`, {});
}

export async function getGlobalAuditLogs(): Promise<AuditLog[]> {
    return apiGet<AuditLog[]>('admin/settings/audit-logs');
}
