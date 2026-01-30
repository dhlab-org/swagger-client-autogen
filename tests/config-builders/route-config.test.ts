import { describe, expect, it } from 'vitest';
import type { ParsedRoute } from '../../src/types/swagger-typescript-api';
import { generateConfig } from '../../src/config-builders/route-config';

// Helper to create minimal ParsedRoute mock
function createMockRoute(overrides: Partial<ParsedRoute> = {}): ParsedRoute {
  return {
    routeName: {
      usage: 'getUsers',
      original: 'GetUsers',
    },
    request: {
      parameters: [],
      query: null,
      headers: null,
      payload: null,
      path: '/users',
      method: 'get',
    },
    response: {
      type: null,
    },
    raw: {
      moduleName: 'users',
    },
    specificArgs: {
      body: null,
    },
    requestBodyInfo: null,
    responseBodyInfo: null,
    ...overrides,
  } as ParsedRoute;
}

describe('route-config', () => {
  describe('generateConfig', () => {
    describe('basic route configuration', () => {
      it('should set function name from routeName.usage', () => {
        const route = createMockRoute({
          routeName: { usage: 'getUserById', original: 'GetUserById' },
        });

        const config = generateConfig(route);

        expect(config.request.functionName).toBe('getUserById');
      });

      it('should handle route with no parameters', () => {
        const route = createMockRoute();

        const config = generateConfig(route);

        expect(config.request.pathParams.signatures).toEqual([]);
        expect(config.request.pathParams.arguments).toEqual([]);
        expect(config.request.parameters.signatures.required).toEqual([]);
        expect(config.request.parameters.arguments.required).toEqual([]);
      });
    });

    describe('path parameters', () => {
      it('should extract path parameter signatures', () => {
        const route = createMockRoute({
          request: {
            parameters: [{ name: 'id', type: 'string', optional: false }],
            query: null,
            headers: null,
            payload: null,
            path: '/users/{id}',
            method: 'get',
          },
        });

        const config = generateConfig(route);

        expect(config.request.pathParams.signatures).toEqual(['id:string']);
        expect(config.request.pathParams.arguments).toEqual(['id']);
      });

      it('should handle optional path parameters', () => {
        const route = createMockRoute({
          request: {
            parameters: [{ name: 'id', type: 'number', optional: true }],
            query: null,
            headers: null,
            payload: null,
            path: '/users/{id}',
            method: 'get',
          },
        });

        const config = generateConfig(route);

        expect(config.request.pathParams.signatures).toEqual(['id?:number']);
      });

      it('should handle multiple path parameters', () => {
        const route = createMockRoute({
          request: {
            parameters: [
              { name: 'userId', type: 'string', optional: false },
              { name: 'postId', type: 'number', optional: false },
            ],
            query: null,
            headers: null,
            payload: null,
            path: '/users/{userId}/posts/{postId}',
            method: 'get',
          },
        });

        const config = generateConfig(route);

        expect(config.request.pathParams.signatures).toEqual(['userId:string', 'postId:number']);
        expect(config.request.pathParams.arguments).toEqual(['userId', 'postId']);
      });
    });

    describe('query parameters', () => {
      it('should set query DTO name when query params exist', () => {
        const route = createMockRoute({
          routeName: { usage: 'getUsers', original: 'GetUsers' },
          request: {
            parameters: [],
            query: { type: 'object' },
            headers: null,
            payload: null,
            path: '/users',
            method: 'get',
          },
        });

        const config = generateConfig(route);

        expect(config.request.query.dtoName).toBe('GetUsersQueryParams');
        expect(config.request.query.schema.name).toBe('GetUsersQueryParamsSchema');
      });

      it('should set query DTO name to null when no query params', () => {
        const route = createMockRoute({
          request: {
            parameters: [],
            query: null,
            headers: null,
            payload: null,
            path: '/users',
            method: 'get',
          },
        });

        const config = generateConfig(route);

        expect(config.request.query.dtoName).toBeNull();
        expect(config.request.query.schema.name).toBe('');
      });
    });

    describe('headers', () => {
      it('should set headers DTO name when headers exist', () => {
        const route = createMockRoute({
          routeName: { usage: 'getUsers', original: 'GetUsers' },
          request: {
            parameters: [],
            query: null,
            headers: { type: 'object' },
            payload: null,
            path: '/users',
            method: 'get',
          },
        });

        const config = generateConfig(route);

        expect(config.request.headers.dtoName).toBe('GetUsersHeaders');
        expect(config.request.headers.schema.name).toBe('GetUsersHeadersSchema');
      });

      it('should modify options type expression when headers exist', () => {
        const route = createMockRoute({
          routeName: { usage: 'getUsers', original: 'GetUsers' },
          request: {
            parameters: [],
            query: null,
            headers: { type: 'object' },
            payload: null,
            path: '/users',
            method: 'get',
          },
        });

        const config = generateConfig(route);

        expect(config.request.options.typeExpr).toBe(
          "Omit<Options, 'headers'> & { headers: GetUsersHeaders }",
        );
      });

      it('should use default Options type when no headers', () => {
        const route = createMockRoute();

        const config = generateConfig(route);

        expect(config.request.options.typeExpr).toBe('Options');
      });
    });

    describe('payload', () => {
      it('should set payload DTO name from specificArgs.body.type', () => {
        const route = createMockRoute({
          specificArgs: {
            body: { type: 'CreateUserDto' },
          },
        });

        const config = generateConfig(route);

        expect(config.request.payload.dtoName).toBe('CreateUserDto');
      });
    });

    describe('response', () => {
      it('should set response DTO name from response.type', () => {
        const route = createMockRoute({
          response: { type: 'UserDto' },
        });

        const config = generateConfig(route);

        expect(config.response.dtoName).toBe('UserDto');
      });

      it('should set response DTO name to null when no response type', () => {
        const route = createMockRoute({
          response: { type: null },
        });

        const config = generateConfig(route);

        expect(config.response.dtoName).toBeNull();
      });
    });

    describe('combined signatures and arguments', () => {
      it('should combine path params and query params in signatures', () => {
        const route = createMockRoute({
          routeName: { usage: 'getUserPosts', original: 'GetUserPosts' },
          request: {
            parameters: [{ name: 'userId', type: 'string', optional: false }],
            query: { type: 'object', optional: false },
            headers: null,
            payload: null,
            path: '/users/{userId}/posts',
            method: 'get',
          },
        });

        const config = generateConfig(route);

        expect(config.request.parameters.signatures.required).toContain('userId:string');
        expect(config.request.parameters.signatures.required).toContain(
          'params: GetUserPostsQueryParams',
        );
        expect(config.request.parameters.arguments.required).toContain('userId');
        expect(config.request.parameters.arguments.required).toContain('params');
      });

      it('should add kyInstance and options to all signatures', () => {
        const route = createMockRoute();

        const config = generateConfig(route);

        expect(config.request.parameters.signatures.all).toContain('kyInstance?: KyInstance');
        expect(config.request.parameters.signatures.all).toContain('options?: Options');
        expect(config.request.parameters.arguments.all).toContain('kyInstance');
        expect(config.request.parameters.arguments.all).toContain('options');
      });
    });

    describe('schema configuration', () => {
      it('should set request schema expression for valid payload type', () => {
        const route = createMockRoute({
          specificArgs: {
            body: { type: 'CreateUserDto' },
          },
          requestBodyInfo: {
            schema: { type: 'object' },
          },
        });

        const config = generateConfig(route);

        expect(config.request.schema.expression).toBe('createUserDtoSchema');
        expect(config.request.schema.list).toContain('createUserDtoSchema');
      });

      it('should set request schema expression to null for invalid payload type', () => {
        const route = createMockRoute({
          specificArgs: {
            body: { type: 'void' },
          },
        });

        const config = generateConfig(route);

        expect(config.request.schema.expression).toBeNull();
      });

      it('should set response schema expression for valid response type', () => {
        const route = createMockRoute({
          response: { type: 'UserDto' },
          responseBodyInfo: {
            responses: [
              {
                isSuccess: true,
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                  },
                },
              },
            ],
          },
        });

        const config = generateConfig(route);

        expect(config.response.schema.expression).toBe('userDtoSchema');
        expect(config.response.schema.list).toContain('userDtoSchema');
      });

      it('should handle array response schema', () => {
        const route = createMockRoute({
          response: { type: 'UserDto' },
          responseBodyInfo: {
            responses: [
              {
                isSuccess: true,
                content: {
                  'application/json': {
                    schema: { type: 'array' },
                  },
                },
              },
            ],
          },
        });

        const config = generateConfig(route);

        expect(config.response.schema.expression).toBe('z.array(userDtoSchema)');
      });
    });
  });
});
