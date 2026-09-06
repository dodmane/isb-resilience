import { DIMENSIONS } from '@/lib/framework/dimensions';
import { SUBDIVISIONS, getSubdivisionsForDimension } from '@/lib/framework/subdivisions';
import { SAAS_MATERIALITY } from '@/lib/framework/materiality';

describe('Subdivisions', () => {
  it('should have exactly 3 subdivisions for every dimension', () => {
    for (const dim of DIMENSIONS) {
      const subs = SUBDIVISIONS[dim.key];
      expect(subs).toBeDefined();
      expect(subs).toHaveLength(3);
    }
  });

  it('should have 45 total subdivisions (15 × 3)', () => {
    const total = Object.values(SUBDIVISIONS).reduce((sum, subs) => sum + subs.length, 0);
    expect(total).toBe(45);
  });

  it('should have unique subdivision keys within each dimension', () => {
    for (const dim of DIMENSIONS) {
      const subs = SUBDIVISIONS[dim.key];
      const keys = subs.map(s => s.key);
      expect(new Set(keys).size).toBe(3);
    }
  });

  it('should have non-empty name and description for every subdivision', () => {
    for (const dim of DIMENSIONS) {
      for (const sub of SUBDIVISIONS[dim.key]) {
        expect(sub.name.length).toBeGreaterThan(0);
        expect(sub.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('should have evidence hints for every subdivision', () => {
    for (const dim of DIMENSIONS) {
      for (const sub of SUBDIVISIONS[dim.key]) {
        expect(sub.evidenceHints.length).toBeGreaterThan(0);
      }
    }
  });

  it('getSubdivisionsForDimension should return correct subdivisions', () => {
    const subs = getSubdivisionsForDimension('revenue_durability');
    expect(subs).toHaveLength(3);
    expect(subs[0].key).toBe('retention_nrr');
  });
});

describe('SaaS/IT Materiality', () => {
  it('should have materiality info for all 15 dimensions', () => {
    for (const dim of DIMENSIONS) {
      const mat = SAAS_MATERIALITY[dim.key];
      expect(mat).toBeDefined();
      expect(mat.saasRelevance.length).toBeGreaterThan(50);
    }
  });

  it('should have company-size-specific notes', () => {
    for (const dim of DIMENSIONS) {
      const mat = SAAS_MATERIALITY[dim.key];
      expect(mat.smallCompanyNote.length).toBeGreaterThan(0);
      expect(mat.largeCompanyNote.length).toBeGreaterThan(0);
    }
  });

  it('should have a boolean defaultSelected for each dimension', () => {
    for (const dim of DIMENSIONS) {
      expect(typeof SAAS_MATERIALITY[dim.key].defaultSelected).toBe('boolean');
    }
  });

  it('should default-select at least 10 dimensions for deep assessment', () => {
    const defaultSelected = Object.values(SAAS_MATERIALITY).filter(m => m.defaultSelected);
    expect(defaultSelected.length).toBeGreaterThanOrEqual(10);
  });
});
