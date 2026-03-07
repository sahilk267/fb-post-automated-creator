import { apiPost } from './client';

export interface OptimizeRequest {
    title: string;
    body: string;
}

export interface OptimizeResponse {
    optimized_title: string;
    optimized_body: string;
}

export function optimizeContent(data: OptimizeRequest): Promise<OptimizeResponse> {
    return apiPost<OptimizeResponse>('ai/optimize', data);
}
