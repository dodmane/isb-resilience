jest.mock('@/lib/llm/settings', () => ({
  getLLMRuntimeSettings: () => ({
    apiKey: 'test-proxy-token',
    baseUrl: 'https://gateway.example.com',
    model: 'test-model',
    provider: 'custom-gateway',
  }),
}));

import { callLLM } from '@/lib/llm/client';

describe('LLM client authentication errors', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('includes the request URL and safe cURL while redacting proxy tokens', async () => {
    const upstreamBody = 'Invalid proxy token test-proxy-token';
    const text = jest.fn().mockResolvedValue(upstreamBody);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text } as unknown as Response);
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});

    let thrownMessage = '';
    try {
      await callLLM('system', 'user');
    } catch (error) {
      thrownMessage = error instanceof Error ? error.message : '';
    }
    expect(thrownMessage).toContain('https://gateway.example.com/v1/messages');
    expect(thrownMessage).toContain('curl --request POST');
    expect(thrownMessage).toContain('$ANTHROPIC_API_KEY');
    expect(thrownMessage).toContain('Invalid proxy token [REDACTED]');
    expect(text).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(thrownMessage);
    expect(log.mock.calls.flat().join(' ')).not.toContain('test-proxy-token');
  });

  it('includes TLS cause details and the request URL for network failures', async () => {
    const failure = Object.assign(new Error('fetch failed'), { cause: { code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' } });
    global.fetch = jest.fn().mockRejectedValue(failure);
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(callLLM('system', 'user')).rejects.toThrow('UNABLE_TO_GET_ISSUER_CERT_LOCALLY');
    expect(log.mock.calls[0][0]).toContain('https://gateway.example.com/v1/messages');
    expect(log.mock.calls[0][0]).toContain('curl --request POST');
  });
});
