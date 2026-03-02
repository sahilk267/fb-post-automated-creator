import { apiGet, apiPost, apiPatch, apiDelete } from './client';

export interface Content {
  id: number;
  title: string;
  body: string;
  status: string;
  created_by_id: number;
  approved_by_id: number | null;
  created_at: string;
  updated_at: string | null;
  approved_at: string | null;
  fb_page_id?: string | null;
  fb_post_id?: string | null;
  fb_status?: string | null;
  schedule_at?: string | null;
  schedule_meta_page_id?: number | null;
}

export interface ContentCreate {
  title: string;
  body: string;
  schedule_at?: string | null;
  schedule_meta_page_id?: number | null;
}

export interface ContentUpdate {
  title?: string;
  body?: string;
}

export interface ApprovalRequest {
  approved: boolean;
  comment?: string;
}

export function listContent(userId: number, params?: { skip?: number; limit?: number; status?: string }): Promise<Content[]> {
  return apiGet<Content[]>('content/', userId, params as Record<string, string | number | undefined>);
}

export function getContent(userId: number, id: number): Promise<Content> {
  return apiGet<Content>(`content/${id}`, userId);
}

export function createContent(userId: number, data: ContentCreate): Promise<Content> {
  return apiPost<Content>('content/', userId, data);
}

export function updateContent(userId: number, id: number, data: ContentUpdate): Promise<Content> {
  return apiPatch<Content>(`content/${id}`, userId, data);
}

export function submitForApproval(userId: number, id: number): Promise<Content> {
  return apiPost<Content>(`content/${id}/submit`, userId);
}

export function approveContent(userId: number, id: number, data: ApprovalRequest): Promise<Content> {
  return apiPost<Content>(`content/${id}/approve`, userId, data);
}

export function deleteContent(userId: number, id: number): Promise<void> {
  return apiDelete(`content/${id}`, userId);
}

export function publishToFacebook(userId: number, contentId: number, metaPageId: number): Promise<Content> {
  return apiPost<Content>(`content/${contentId}/publish-to-facebook`, userId, { meta_page_id: metaPageId });
}
