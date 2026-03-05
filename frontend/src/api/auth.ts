import { apiPost } from './client';
import type { User } from './users';

export interface Token {
    access_token: string;
    token_type: string;
}

export interface SignupData {
    username: string;
    email: string;
    password: string;
    full_name?: string;
}

export async function login(username: string, password: string): Promise<{ token: Token; user: User }> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const res = await fetch(`${import.meta.env.VITE_API_BASE ?? ''}/api/v1/auth/login`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Incorrect username or password' }));
        throw new Error(err.detail);
    }

    const token = await res.json();

    // Fetch user info after login
    const userRes = await fetch(`${import.meta.env.VITE_API_BASE ?? ''}/api/v1/users/me`, {
        headers: {
            'Authorization': `Bearer ${token.access_token}`,
        },
    });

    const user = await userRes.json();

    return { token, user };
}

export function signup(data: SignupData): Promise<User> {
    return apiPost<User>('auth/signup', data);
}
