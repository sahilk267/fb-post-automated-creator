import { apiGet, apiPost } from './client';

export interface Media {
    id: number;
    filename: string;
    mime_type: string;
    file_size: number;
    user_id: number;
    created_at: string;
    url: string;
}

export async function uploadMedia(file: File, organizationId?: number): Promise<Media> {
    const formData = new FormData();
    formData.append('file', file);
    if (organizationId) {
        formData.append('organization_id', organizationId.toString());
    }

    return apiPost<Media>('media/upload', formData, organizationId ? { organization_id: organizationId } : {});
}

export function listMedia(): Promise<Media[]> {
    return apiGet<Media[]>('media/');
}

export function getMedia(id: number): Promise<Media> {
    return apiGet<Media>(`media/${id}`);
}
