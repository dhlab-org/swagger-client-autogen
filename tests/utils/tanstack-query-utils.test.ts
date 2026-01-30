import { describe, expect, it } from 'vitest';
import { buildKeyConstantsName } from '../../src/utils/tanstack-query-utils';

describe('tanstack-query-utils', () => {
  describe('buildKeyConstantsName', () => {
    it('should convert GET /users to GET_USERS', () => {
      const result = buildKeyConstantsName({ method: 'get', path: '/users' });
      expect(result).toBe('GET_USERS');
    });

    it('should convert POST /users to POST_USERS', () => {
      const result = buildKeyConstantsName({ method: 'post', path: '/users' });
      expect(result).toBe('POST_USERS');
    });

    it('should convert path params {id} to uppercase ID', () => {
      const result = buildKeyConstantsName({ method: 'get', path: '/users/{id}' });
      expect(result).toBe('GET_USERS_ID');
    });

    it('should handle multiple path params', () => {
      const result = buildKeyConstantsName({
        method: 'get',
        path: '/users/{userId}/posts/{postId}',
      });
      expect(result).toBe('GET_USERS_USERID_POSTS_POSTID');
    });

    it('should handle DELETE method', () => {
      const result = buildKeyConstantsName({ method: 'delete', path: '/users/{id}' });
      expect(result).toBe('DELETE_USERS_ID');
    });

    it('should handle PUT method', () => {
      const result = buildKeyConstantsName({ method: 'put', path: '/users/{id}' });
      expect(result).toBe('PUT_USERS_ID');
    });

    it('should handle PATCH method', () => {
      const result = buildKeyConstantsName({ method: 'patch', path: '/users/{id}' });
      expect(result).toBe('PATCH_USERS_ID');
    });

    it('should convert hyphens to underscores', () => {
      const result = buildKeyConstantsName({ method: 'get', path: '/user-profiles' });
      expect(result).toBe('GET_USER_PROFILES');
    });

    it('should handle complex paths with api version', () => {
      const result = buildKeyConstantsName({
        method: 'get',
        path: '/api/v1/items/{itemId}/comments',
      });
      expect(result).toBe('GET_API_V1_ITEMS_ITEMID_COMMENTS');
    });

    it('should return falsy when method is missing', () => {
      const result = buildKeyConstantsName({ method: '', path: '/users' });
      expect(result).toBeFalsy();
    });

    it('should return falsy when path is missing', () => {
      const result = buildKeyConstantsName({ method: 'get', path: '' });
      expect(result).toBeFalsy();
    });

    it('should handle path params with ${} syntax', () => {
      const result = buildKeyConstantsName({ method: 'get', path: '/users/${id}' });
      expect(result).toBe('GET_USERS_ID');
    });

    it('should remove underscores from path params', () => {
      const result = buildKeyConstantsName({ method: 'get', path: '/users/{user_id}' });
      expect(result).toBe('GET_USERS_USERID');
    });
  });
});
