import { apiGet, apiPost } from './client';

export interface MetaPage {
  id: number;
  page_id: string;
  page_name: string | null;
  category: string | null;
}

export function listPages(organizationId?: number): Promise<MetaPage[]> {
  return apiGet<MetaPage[]>('meta/pages/', { organization_id: organizationId });
}

/** Sync pages from Facebook (requires connected account). Returns { synced: number }. */
export function syncPages(): Promise<{ synced: number }> {
  return apiPost<{ synced: number }>('meta/pages/sync');
}
