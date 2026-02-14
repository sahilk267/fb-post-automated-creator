import { apiGet } from './client';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string | null;
}

export function getMe(userId: number): Promise<User> {
  return apiGet<User>('users/me', userId);
}

export function listUsers(userId: number): Promise<User[]> {
  return apiGet<User[]>('users/', userId);
}
