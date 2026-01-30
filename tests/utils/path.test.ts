import { describe, expect, it } from 'vitest';
import { generateAlias } from '../../src/utils/path';

describe('path', () => {
  describe('generateAlias', () => {
    it('should return alias path when output path matches alias root', () => {
      const aliasMap = {
        '@shared': '/project/src/shared',
      };
      const result = generateAlias('/project/src/shared/api/dto.ts', aliasMap);
      expect(result).toBe('@shared/api/dto');
    });

    it('should remove .ts extension from result', () => {
      const aliasMap = {
        '@entities': '/project/src/entities',
      };
      const result = generateAlias('/project/src/entities/user/api/index.ts', aliasMap);
      expect(result).toBe('@entities/user/api/index');
    });

    it('should match first alias in iteration order', () => {
      // Note: generateAlias uses first match, not most specific
      const aliasMap = {
        '@': '/project/src',
        '@shared': '/project/src/shared',
      };
      const result = generateAlias('/project/src/shared/utils/helper.ts', aliasMap);
      // First match wins (@ matches /project/src)
      expect(result).toBe('@/shared/utils/helper');
    });

    it('should return original path without .ts when no alias matches', () => {
      const aliasMap = {
        '@': '/project/src',
      };
      const result = generateAlias('/other/path/file.ts', aliasMap);
      expect(result).toBe('/other/path/file');
    });

    it('should handle paths without .ts extension', () => {
      const aliasMap = {
        '@shared': '/project/src/shared',
      };
      const result = generateAlias('/project/src/shared/api/dto', aliasMap);
      expect(result).toBe('@shared/api/dto');
    });

    it('should handle empty alias map', () => {
      const result = generateAlias('/project/src/file.ts', {});
      expect(result).toBe('/project/src/file');
    });
  });
});
