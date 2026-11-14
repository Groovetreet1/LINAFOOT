import type { ApiErrorShape } from '@/types';

const DEFAULT_API_URL = 'http://10.0.2.2:3000/api/v1';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  token?: string;
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as T & ApiErrorShape;
    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError('Session expirée. Reconnectez-vous.', 'UNAUTHORIZED', 401);
      }
      throw new ApiError(
        payload.error?.message ?? 'Le serveur ne répond pas correctement.',
        payload.error?.code ?? 'REQUEST_FAILED',
        response.status,
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('La connexion a pris trop de temps.', 'TIMEOUT', 0);
    }
    throw new ApiError(
      'Serveur inaccessible. Vérifiez votre connexion et EXPO_PUBLIC_API_URL.',
      'NETWORK_ERROR',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}
