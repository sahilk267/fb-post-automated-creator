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

export function uploadMedia(file: File): Promise<Media> {
    const formData = new FormData();
    formData.append('file', file);

    return apiPost<Media>('media/upload', formData);
}

export function listMedia(): Promise<Media[]> {
    return apiGet<Media[]>('media/');
}

export function getMedia(id: number): Promise<Media> {
    return apiGet<Media>(`media/${id}`);
}
