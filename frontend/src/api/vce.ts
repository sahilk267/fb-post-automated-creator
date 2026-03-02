import { apiGet } from './client';

export interface ContentCategory {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

export interface GenerateThemesResponse {
  themes: string[];
  available: boolean;
}

export function getCategories(userId: number): Promise<ContentCategory[]> {
  return apiGet<ContentCategory[]>('vce/categories', userId);
}

export function generateThemes(
  userId: number,
  params: { category_id?: number; category_name?: string; count?: number }
): Promise<GenerateThemesResponse> {
  return apiGet<GenerateThemesResponse>('vce/generate-themes', userId, params as Record<string, string | number | undefined>);
}
