jest.mock('@/lib/llm/client', () => ({
  isLLMConfigured: jest.fn(() => true),
  callLLMJSON: jest.fn(),
}));

import { callLLMJSON } from '@/lib/llm/client';
import { discoverCompany } from '@/lib/llm/discovery';

describe('company discovery diagnostics', () => {
  afterEach(() => jest.clearAllMocks());

  it('preserves safe request diagnostics when discovery falls back to mock data', async () => {
    (callLLMJSON as jest.Mock).mockRejectedValue(new Error(
      'fetch failed (UNABLE_TO_GET_ISSUER_CERT_LOCALLY)\nRequest URL: https://api.anthropic.com/v1/messages\nDiagnostic cURL (credential omitted; uses $ANTHROPIC_API_KEY): curl --request POST',
    ));

    const result = await discoverCompany('Example SaaS', 'assessment-1');

    expect(result.profile.isMock).toBe(true);
    expect(result.diagnostic).toContain('https://api.anthropic.com/v1/messages');
    expect(result.diagnostic).toContain('$ANTHROPIC_API_KEY');
  });
});
