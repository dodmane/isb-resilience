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

  it('logs only the status and gives safe proxy-token guidance', async () => {
    const upstreamBody = 'Invalid proxy token test-proxy-token';
    const text = jest.fn().mockResolvedValue(upstreamBody);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text } as unknown as Response);
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(callLLM('system', 'user')).rejects.toThrow(
      'LLM API authentication failed (401). Verify that the API key or proxy token is valid for the configured base URL.'
    );
    expect(log).toHaveBeenCalledWith('LLM API error:', 401);
    expect(text).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join(' ')).not.toContain('test-proxy-token');
  });
});
