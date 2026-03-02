import { apiGet, apiFetch } from './client';

export type ScheduledPostStatus = 'pending' | 'processing' | 'posted' | 'cancelled' | 'failed';

export interface ScheduledPost {
  id: number;
  content_id: number;
  meta_page_id: number;
  scheduled_at: string;
  status: ScheduledPostStatus;
  posted_at: string | null;
  failure_reason: string | null;
  created_at: string;
}

export function listScheduledPosts(
  userId: number,
  params?: { status?: string; meta_page_id?: number; skip?: number; limit?: number }
): Promise<ScheduledPost[]> {
  return apiGet<ScheduledPost[]>('scheduled-posts/', userId, params as Record<string, string | number | undefined>);
}

export function cancelScheduledPost(userId: number, scheduledPostId: number): Promise<{ cancelled: boolean }> {
  return apiFetch<{ cancelled: boolean }>(`scheduled-posts/${scheduledPostId}/cancel`, {
    method: 'PATCH',
    userId,
  });
}

export interface PostingPreference {
  id: number;
  meta_page_id: number;
  cooldown_minutes: number;
  max_posts_per_day: number;
}

export function getPostingPreference(userId: number, metaPageId: number): Promise<PostingPreference> {
  return apiFetch<PostingPreference>(`scheduled-posts/preferences/${metaPageId}`, {
    method: 'GET',
    userId,
  });
}

export function updatePostingPreference(
  userId: number,
  metaPageId: number,
  data: { cooldown_minutes: number; max_posts_per_day: number }
): Promise<PostingPreference> {
  return apiFetch<PostingPreference>(`scheduled-posts/preferences/${metaPageId}`, {
    method: 'PUT',
    userId,
    body: JSON.stringify(data),
  } as any);
}
