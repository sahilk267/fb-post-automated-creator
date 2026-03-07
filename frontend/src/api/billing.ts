import { apiPost } from './client';

export interface CheckoutRequest {
    organization_id: number;
    price_id: string;
    success_url: string;
    cancel_url: string;
}

export interface PortalRequest {
    organization_id: number;
    return_url: string;
}

export async function createCheckout(req: CheckoutRequest): Promise<{ url: string }> {
    return apiPost<{ url: string }>('billing/checkout', req);
}

export async function createPortal(req: PortalRequest): Promise<{ url: string }> {
    return apiPost<{ url: string }>('billing/portal', req);
}
