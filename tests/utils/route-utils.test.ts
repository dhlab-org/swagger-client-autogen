import { describe, expect, it } from 'vitest';
import type { RawRouteInfo } from '../../src/types/swagger-typescript-api';
import { buildRequestFunctionName, getDiscriminatorMatcher, isValidType } from '../../src/utils/route-utils';

describe('route-utils', () => {
  describe('buildRequestFunctionName', () => {
    it('should convert GET /users to getUsers', () => {
      const route: RawRouteInfo = { method: 'get', route: '/users' };
      expect(buildRequestFunctionName(route)).toBe('getUsers');
    });

    it('should convert POST /users to postUsers', () => {
      const route: RawRouteInfo = { method: 'post', route: '/users' };
      expect(buildRequestFunctionName(route)).toBe('postUsers');
    });

    it('should convert path params with {param} to ByParam', () => {
      const route: RawRouteInfo = { method: 'get', route: '/users/{id}' };
      expect(buildRequestFunctionName(route)).toBe('getUsersById');
    });

    it('should convert DELETE /users/{id} to deleteUsersById', () => {
      const route: RawRouteInfo = { method: 'delete', route: '/users/{id}' };
      expect(buildRequestFunctionName(route)).toBe('deleteUsersById');
    });

    it('should handle multiple path params', () => {
      const route: RawRouteInfo = {
        method: 'get',
        route: '/users/{userId}/posts/{postId}',
      };
      expect(buildRequestFunctionName(route)).toBe('getUsersByUserIdPostsByPostId');
    });

    it('should handle nested paths with api version', () => {
      const route: RawRouteInfo = {
        method: 'delete',
        route: '/api/v1/items/{itemId}/comments/{commentId}',
      };
      expect(buildRequestFunctionName(route)).toBe('deleteApiV1ItemsByItemIdCommentsByCommentId');
    });

    it('should handle PUT method', () => {
      const route: RawRouteInfo = { method: 'put', route: '/users/{id}' };
      expect(buildRequestFunctionName(route)).toBe('putUsersById');
    });

    it('should handle PATCH method', () => {
      const route: RawRouteInfo = { method: 'patch', route: '/users/{id}' };
      expect(buildRequestFunctionName(route)).toBe('patchUsersById');
    });

    it('should handle routes with hyphens', () => {
      const route: RawRouteInfo = { method: 'get', route: '/user-profiles' };
      expect(buildRequestFunctionName(route)).toBe('getUserProfiles');
    });
  });

  describe('isValidType', () => {
    it('should return false for null', () => {
      expect(isValidType(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidType(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidType('')).toBe(false);
    });

    it('should return false for void', () => {
      expect(isValidType('void')).toBe(false);
    });

    it('should return false for any', () => {
      expect(isValidType('any')).toBe(false);
    });

    it('should return false for null type string', () => {
      expect(isValidType('null')).toBe(false);
    });

    it('should return false for undefined type string', () => {
      expect(isValidType('undefined')).toBe(false);
    });

    it('should return false for object', () => {
      expect(isValidType('object')).toBe(false);
    });

    it('should return false for string', () => {
      expect(isValidType('string')).toBe(false);
    });

    it('should return true for UserDto', () => {
      expect(isValidType('UserDto')).toBe(true);
    });

    it('should return true for CreateUserRequest', () => {
      expect(isValidType('CreateUserRequest')).toBe(true);
    });

    it('should return true for ApiResponse', () => {
      expect(isValidType('ApiResponse')).toBe(true);
    });

    it('should return false for types containing invalid keywords (case insensitive)', () => {
      expect(isValidType('VOID')).toBe(false);
      expect(isValidType('Any')).toBe(false);
      expect(isValidType('Object')).toBe(false);
    });
  });

  describe('getDiscriminatorMatcher', () => {
    it('should generate matcher code from discriminator mapping', () => {
      // Note: function appends 'DtoSchema' to camelCased schema name
      // CatDto -> catDto + DtoSchema = catDtoDtoSchema
      const discriminator = {
        propertyName: 'type',
        mapping: {
          cat: '#/components/schemas/CatDto',
          dog: '#/components/schemas/DogDto',
        },
      } as Record<string, unknown>;

      const result = getDiscriminatorMatcher(discriminator);

      expect(result).toContain('with({ type: "cat" }, () => catDtoDtoSchema)');
      expect(result).toContain('with({ type: "dog" }, () => dogDtoDtoSchema)');
    });

    it('should handle different property names', () => {
      const discriminator = {
        propertyName: 'kind',
        mapping: {
          admin: '#/components/schemas/AdminUser',
        },
      } as Record<string, unknown>;

      const result = getDiscriminatorMatcher(discriminator);

      // AdminUser -> adminUser + DtoSchema = adminUserDtoSchema
      expect(result).toContain('with({ kind: "admin" }, () => adminUserDtoSchema)');
    });
  });
});
