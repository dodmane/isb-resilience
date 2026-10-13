import { latestDataPriorityInstruction, prioritizeLatestEvidence } from '@/lib/llm/evidence-priority';

describe('latest evidence priority', () => {
  it('orders evidence by publication date descending and leaves undated items last', () => {
    const evidence = [
      { id: '2024', publicationDate: '2024-12-31' },
      { id: 'undated', publicationDate: null },
      { id: '2026', publicationDate: '2026-01-01' },
      { id: '2025', publicationDate: '2025-06-30' },
    ];

    expect(prioritizeLatestEvidence(evidence).map(item => item.id)).toEqual(['2026', '2025', '2024', 'undated']);
    expect(evidence[0].id).toBe('2024');
  });

  it('instructs analysts to prioritize the current reporting year and fall back to older data', () => {
    const currentYear = new Date().getFullYear();
    const instruction = latestDataPriorityInstruction();

    expect(instruction).toContain(`${currentYear} before ${currentYear - 1} before ${currentYear - 2}`);
    expect(instruction).toContain('Distinguish the reporting period from the source publication date');
  });
});