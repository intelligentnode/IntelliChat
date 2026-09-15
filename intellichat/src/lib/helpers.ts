export const serializeError = (error: any) => {
  return {
    message: error.message || 'Unknown error',
    name: error.name,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  };
};

// Providers answer errors as JSON inside the message text ("HTTP error 401: {...}"); show the readable part.
export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || '');
  const jsonStart = raw.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart));
      const nested = parsed?.error?.message || parsed?.message || parsed?.detail || parsed?.error;
      if (typeof nested === 'string' && nested.trim()) return nested;
    } catch {
      // not JSON, fall through
    }
  }
  return raw;
}
