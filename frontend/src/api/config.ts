function configurationError(message: string): Error {
  return new Error(`Invalid VITE_API_BASE_URL: ${message}`);
}

export function normalizeApiBaseUrl(value: string | undefined): string {
  if (!value?.trim()) {
    throw configurationError('a non-empty URL is required.');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw configurationError('the value must be an absolute URL.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw configurationError('only HTTP and HTTPS URLs are supported.');
  }
  if (url.username || url.password) {
    throw configurationError('credentials must not be embedded in the public URL.');
  }
  if (url.search || url.hash) {
    throw configurationError('query strings and fragments are not supported.');
  }

  return url.toString().replace(/\/$/, '');
}

export const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
