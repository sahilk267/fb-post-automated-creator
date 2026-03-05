import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import { type Media } from './media';

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
  media_id?: number | null;
}

export interface ContentCreate {
  title: string;
  body: string;
  schedule_at?: string | null;
  schedule_meta_page_id?: number | null;
  media_id?: number | null;
}

export interface ContentUpdate {
  title?: string;
  body?: string;
  media_id?: number | null;
}

export interface ApprovalRequest {
  approved: boolean;
  comment?: string;
}

export function listContent(params?: { skip?: number; limit?: number; status?: string }): Promise<Content[]> {
  return apiGet<Content[]>('content/', params as Record<string, string | number | undefined>);
}

export function getContent(id: number): Promise<Content> {
  return apiGet<Content>(`content/${id}`);
}

export function createContent(data: ContentCreate): Promise<Content> {
  return apiPost<Content>('content/', data);
}

export function updateContent(id: number, data: ContentUpdate): Promise<Content> {
  return apiPatch<Content>(`content/${id}`, data);
}

export function submitForApproval(id: number): Promise<Content> {
  return apiPost<Content>(`content/${id}/submit`);
}

export function approveContent(id: number, data: ApprovalRequest): Promise<Content> {
  return apiPost<Content>(`content/${id}/approve`, data);
}

export function deleteContent(id: number): Promise<void> {
  return apiDelete(`content/${id}`);
}

export function publishToFacebook(contentId: number, metaPageId: number): Promise<Content> {
  return apiPost<Content>(`content/${contentId}/publish-to-facebook`, { meta_page_id: metaPageId });
}
