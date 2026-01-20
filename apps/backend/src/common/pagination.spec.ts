import { normalizePagination, DEFAULT_PAGINATION_LIMIT } from './pagination';

describe('Pagination Utils', () => {
  describe('normalizePagination', () => {
    it('should return default values when no params provided', () => {
      const result = normalizePagination();
      expect(result.take).toBe(DEFAULT_PAGINATION_LIMIT);
      expect(result.skip).toBe(0);
    });

    it('should calculate skip correctly for page 1', () => {
      const result = normalizePagination(1, 10);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(10);
    });

    it('should calculate skip correctly for page 2', () => {
      const result = normalizePagination(2, 10);
      expect(result.skip).toBe(10);
      expect(result.take).toBe(10);
    });

    it('should calculate skip correctly for page 3 with limit 20', () => {
      const result = normalizePagination(3, 20);
      expect(result.skip).toBe(40);
      expect(result.take).toBe(20);
    });

    it('should handle page 0 as page 1', () => {
      const result = normalizePagination(0, 10);
      expect(result.skip).toBe(0);
    });

    it('should handle negative page as page 1', () => {
      const result = normalizePagination(-5, 10);
      expect(result.skip).toBe(0);
    });

    it('should handle limit 0 as default limit', () => {
      const result = normalizePagination(1, 0);
      expect(result.take).toBe(1);
    });

    it('should handle negative limit as default limit', () => {
      const result = normalizePagination(1, -10);
      expect(result.take).toBe(1);
    });

    it('should respect custom limit', () => {
      const result = normalizePagination(1, 50);
      expect(result.take).toBe(50);
    });

    it('should cap limit at maximum (100)', () => {
      const result = normalizePagination(1, 500);
      expect(result.take).toBeLessThanOrEqual(100);
    });

    it('should handle large page numbers', () => {
      const result = normalizePagination(1000, 10);
      expect(result.skip).toBe(9990);
    });

    it('should use custom maxLimit', () => {
      const result = normalizePagination(1, 200, 200);
      expect(result.take).toBe(200);
    });

    it('should use custom defaultLimit', () => {
      const result = normalizePagination(1, undefined, 100, 25);
      expect(result.take).toBe(25);
    });
  });
});
