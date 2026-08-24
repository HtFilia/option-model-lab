import { apiBaseUrl } from './config';
import { ApiProtocolError, ApiResponseError, ApiUnavailableError } from './errors';

const DEFAULT_TIMEOUT_MS = 8_000;

export interface ApiRequestOptions extends Omit<RequestInit, 'signal'> {
  timeoutMs?: number;
}

export interface HealthResponse {
  status: 'ok';
}

function endpointUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new ApiProtocolError('API paths must begin with a slash.');
  }
  return `${apiBaseUrl}${path}`;
}

async function responseMessage(response: Response): Promise<string> {
  const fallback = `The API returned HTTP ${response.status}.`;
  try {
    const body: unknown = await response.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'detail' in body &&
      typeof body.detail === 'string'
    ) {
      return body.detail;
    }
  } catch {
    // A non-JSON error response still has a useful HTTP status fallback.
  }
  return fallback;
}

export async function requestJson<T>(
  path: string,
  options: ApiRequestOptions = {},
  fetchImplementation: typeof fetch = fetch,
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...requestOptions } = options;
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImplementation(endpointUrl(path), {
      ...requestOptions,
      headers: {
        Accept: 'application/json',
        ...requestOptions.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiResponseError(response.status, await responseMessage(response));
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new ApiProtocolError('The API returned invalid JSON.', { cause: error });
    }
  } catch (error) {
    if (error instanceof ApiResponseError || error instanceof ApiProtocolError) {
      throw error;
    }
    const message = controller.signal.aborted
      ? 'The API request timed out.'
      : 'The computation API is unavailable.';
    throw new ApiUnavailableError(message, { cause: error });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export async function getApiHealth(fetchImplementation: typeof fetch = fetch) {
  const response = await requestJson<unknown>('/health', {}, fetchImplementation);
  if (
    typeof response !== 'object' ||
    response === null ||
    !('status' in response) ||
    response.status !== 'ok'
  ) {
    throw new ApiProtocolError('The API health response has an unexpected shape.');
  }
  return response as HealthResponse;
}
