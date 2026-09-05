import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from './auth';

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wraps a route handler body so thrown AuthError/ZodError/etc become clean JSON responses. */
export function withApiErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof AuthError) {
        return jsonError(err.message, err.status);
      }
      if (err instanceof ZodError) {
        return jsonError(err.issues[0]?.message || 'Invalid request', 400);
      }
      if (err instanceof Error) {
        console.error('[API ERROR]', err);
        return jsonError(err.message || 'Internal server error', 500);
      }
      console.error('[API ERROR]', err);
      return jsonError('Internal server error', 500);
    }
  };
}
