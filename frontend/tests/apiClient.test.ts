import { describe, expect, it, vi } from 'vitest';
import { getApiHealth, requestJson } from '../src/api/client';
import { normalizeApiBaseUrl } from '../src/api/config';
import { ApiProtocolError, ApiResponseError, ApiUnavailableError } from '../src/api/errors';

describe('API configuration', () => {
  it('normalizes an explicit HTTP(S) base URL', () => {
    expect(normalizeApiBaseUrl('http://127.0.0.1:8000/')).toBe('http://127.0.0.1:8000');
    expect(normalizeApiBaseUrl('https://api.example.test')).toBe('https://api.example.test');
  });

  it('rejects missing, relative, credentialed, and non-HTTP configuration', () => {
    expect(() => normalizeApiBaseUrl(undefined)).toThrow('non-empty URL');
    expect(() => normalizeApiBaseUrl('/api')).toThrow('absolute URL');
    expect(() => normalizeApiBaseUrl('ftp://example.test')).toThrow('HTTP and HTTPS');
    expect(() => normalizeApiBaseUrl('https://user:secret@example.test')).toThrow('credentials');
  });
});

describe('typed API client', () => {
  it('returns a validated health response from the configured API', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(getApiHealth(fetchImplementation)).resolves.toEqual({ status: 'ok' });
    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('distinguishes HTTP errors from transport failures', async () => {
    const rejectedResponse = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Request is too large.' }), { status: 413 }),
      );
    const unavailable = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));

    await expect(requestJson('/bounded', {}, rejectedResponse)).rejects.toMatchObject({
      name: ApiResponseError.name,
      status: 413,
      message: 'Request is too large.',
    });
    await expect(requestJson('/health', {}, unavailable)).rejects.toBeInstanceOf(
      ApiUnavailableError,
    );
  });

  it('rejects invalid JSON and unexpected health payloads', async () => {
    const invalidJson = vi.fn<typeof fetch>().mockResolvedValue(new Response('not JSON'));
    const invalidHealth = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ status: 'degraded' })));

    await expect(requestJson('/health', {}, invalidJson)).rejects.toBeInstanceOf(ApiProtocolError);
    await expect(getApiHealth(invalidHealth)).rejects.toThrow('unexpected shape');
  });
});
