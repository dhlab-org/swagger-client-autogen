import { describe, expect, it } from 'vitest';
import { resolveRelativeImportPath } from '../../src/config-builders/module-config';

describe('module-config', () => {
  describe('resolveRelativeImportPath', () => {
    describe('relative path resolution', () => {
      it('should return relative path when depth is within limit', () => {
        const aliasMap = { '@': '/project/src' };
        const resolver = resolveRelativeImportPath(aliasMap, 2);
        const result = resolver({ fromPath: '/project/src/entities/user/api/index.ts' })(
          '/project/src/entities/user/model/types.ts',
        );
        expect(result).toBe('../model/types');
      });

      it('should return alias when depth exceeds limit and not FSD cross-layer', () => {
        const aliasMap = { '@': '/project/src' };
        const resolver = resolveRelativeImportPath(aliasMap, 1);
        const result = resolver({ fromPath: '/project/src/utils/deep/nested/index.ts' })(
          '/project/src/utils/helper.ts',
        );
        expect(result).toBe('@/utils/helper');
      });

      it('should add ./ prefix for same directory imports', () => {
        const aliasMap = { '@': '/project/src' };
        const resolver = resolveRelativeImportPath(aliasMap, 2);
        const result = resolver({ fromPath: '/project/src/entities/user/api/index.ts' })(
          '/project/src/entities/user/api/types.ts',
        );
        expect(result).toBe('./types');
      });
    });

    describe('FSD cross-layer imports', () => {
      it('should use alias for cross-layer imports (entities -> shared)', () => {
        const aliasMap = { '@': '/project/src' };
        const resolver = resolveRelativeImportPath(aliasMap, 10);
        const result = resolver({ fromPath: '/project/src/entities/user/api/index.ts' })(
          '/project/src/shared/api/dto.ts',
        );
        // Cross-layer import triggers alias usage
        expect(result).toBe('@/shared/api/dto');
      });

      it('should use alias for cross-layer imports (features -> entities)', () => {
        const aliasMap = { '@': '/project/src' };
        const resolver = resolveRelativeImportPath(aliasMap, 10);
        const result = resolver({ fromPath: '/project/src/features/auth/api/index.ts' })(
          '/project/src/entities/user/model/types.ts',
        );
        expect(result).toBe('@/entities/user/model/types');
      });

      it('should use relative path for same-layer imports within depth limit', () => {
        const aliasMap = { '@': '/project/src' };
        const resolver = resolveRelativeImportPath(aliasMap, 5);
        const result = resolver({ fromPath: '/project/src/entities/user/api/index.ts' })(
          '/project/src/entities/post/api/index.ts',
        );
        expect(result).toBe('../../post/api/index');
      });
    });

    describe('edge cases', () => {
      it('should handle paths without FSD layers', () => {
        const aliasMap = { '@': '/project/src' };
        const resolver = resolveRelativeImportPath(aliasMap, 2);
        const result = resolver({ fromPath: '/project/src/utils/helper.ts' })(
          '/project/src/utils/format.ts',
        );
        expect(result).toBe('./format');
      });

      it('should remove .ts extension from result', () => {
        const aliasMap = { '@': '/project/src' };
        const resolver = resolveRelativeImportPath(aliasMap, 2);
        const result = resolver({ fromPath: '/project/src/entities/user/api/index.ts' })(
          '/project/src/entities/user/api/types.ts',
        );
        expect(result).not.toContain('.ts');
      });

      it('should handle .tsx extension', () => {
        const aliasMap = { '@': '/project/src' };
        const resolver = resolveRelativeImportPath(aliasMap, 2);
        const result = resolver({ fromPath: '/project/src/entities/user/ui/Card.tsx' })(
          '/project/src/entities/user/ui/Button.tsx',
        );
        expect(result).toBe('./Button');
        expect(result).not.toContain('.tsx');
      });

      it('should fallback to relative path when alias conversion fails', () => {
        const emptyAliasMap = {};
        const resolver = resolveRelativeImportPath(emptyAliasMap, 1);
        const result = resolver({ fromPath: '/project/src/a/b/c/index.ts' })(
          '/project/src/x/y/z/file.ts',
        );
        // Should return relative path even though depth exceeds limit (alias fallback)
        expect(result).toContain('..');
      });
    });

    describe('depth limit behavior', () => {
      it('should use relative path when depth equals maxDepth', () => {
        const aliasMap = { '@': '/project/src' };
        const resolver = resolveRelativeImportPath(aliasMap, 2);
        const result = resolver({ fromPath: '/project/src/a/b/c/index.ts' })(
          '/project/src/a/file.ts',
        );
        // depth is 2 (../../), which equals maxDepth
        expect(result).toBe('../../file');
      });

      it('should use alias when depth is greater than maxDepth for cross-layer', () => {
        const aliasMap = { '@': '/project/src' };
        const resolver = resolveRelativeImportPath(aliasMap, 1);
        const result = resolver({ fromPath: '/project/src/entities/user/api/index.ts' })(
          '/project/src/shared/api/dto.ts',
        );
        // Cross-layer import uses alias
        expect(result).toBe('@/shared/api/dto');
      });
    });
  });
});
