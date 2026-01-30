import { describe, expect, it } from 'vitest';
import { generateTanstackQueryConfig } from '../../src/config-builders/tanstack-query-config';
import type { RouteConfig } from '../../src/types/route-config';
import type { ParsedRoute, RawRouteInfo } from '../../src/types/swagger-typescript-api';

/** 테스트용: raw에 x-staleTime, x-gcTime 등 확장 프로퍼티 허용 */
type TestParsedRoute = Omit<ParsedRoute, 'raw'> & {
  raw: RawRouteInfo & Record<string, unknown>;
};

const baseRaw: RawRouteInfo = {
  operationId: 'getUsers',
  method: 'get',
  route: '/users',
  moduleName: 'users',
  responsesTypes: [],
};

// Helper to create minimal ParsedRoute mock
function createMockRoute(
  overrides: Partial<Omit<ParsedRoute, 'raw'>> & {
    raw?: Partial<RawRouteInfo> & Record<string, unknown>;
  } = {},
): TestParsedRoute {
  const { raw: rawOverrides, ...rest } = overrides;
  return {
    id: '',
    namespace: '',
    routeName: {
      usage: 'getUsers',
      original: 'GetUsers',
      duplicate: false,
    },
    request: {
      method: 'get',
      path: '/users',
    },
    response: {},
    ...rest,
    raw: { ...baseRaw, ...rawOverrides },
  };
}

// Helper to create minimal RouteConfig mock
function createMockRouteConfig(overrides: Partial<RouteConfig> = {}): RouteConfig {
  return {
    request: {
      functionName: 'getUsers',
      pathParams: {
        signatures: [],
        arguments: [],
      },
      query: {
        dtoName: '',
        schema: { name: '' },
      },
      headers: {
        dtoName: '',
        schema: { name: '' },
      },
      payload: {
        dtoName: '',
      },
      options: {
        typeExpr: 'Options',
      },
      parameters: {
        signatures: {
          required: [],
          all: ['kyInstance?: KyInstance', 'options?: Options'],
        },
        arguments: {
          required: [],
          all: ['kyInstance', 'options'],
        },
      },
      schema: {
        list: [],
        expression: null,
      },
    },
    response: {
      dtoName: 'UserDto',
      schema: {
        list: [],
        expression: null,
      },
    },
    ...overrides,
  };
}

describe('tanstack-query-config', () => {
  describe('generateTanstackQueryConfig', () => {
    describe('basic configuration', () => {
      it('should generate query hook names correctly', () => {
        const route = createMockRoute({
          routeName: { usage: 'getUserById', original: 'GetUserById', duplicate: false },
        });
        const routeConfig = createMockRouteConfig();

        const result = generateTanstackQueryConfig(route, routeConfig);

        expect(result.query.queryHookName).toBe('useGetUserByIdQuery');
        expect(result.query.suspenseQueryHookName).toBe('useGetUserByIdSuspenseQuery');
      });

      it('should generate mutation hook name correctly', () => {
        const route = createMockRoute({
          routeName: { usage: 'createUser', original: 'CreateUser', duplicate: false },
          request: { method: 'post', path: '/users' },
        });
        const routeConfig = createMockRouteConfig();

        const result = generateTanstackQueryConfig(route, routeConfig);

        expect(result.mutation.mutationHookName).toBe('useCreateUserMutation');
      });

      it('should generate query key constants name', () => {
        const route = createMockRoute({
          request: { method: 'get', path: '/users' },
        });
        const routeConfig = createMockRouteConfig();

        const result = generateTanstackQueryConfig(route, routeConfig);

        expect(result.query.queryKeyConstanstName).toBe('GET_USERS');
      });

      it('should generate query key rootKey and variable parts with path params', () => {
        const route = createMockRoute({
          request: { method: 'get', path: '/users/${userId}' },
        });
        const routeConfig = createMockRouteConfig({
          request: {
            ...createMockRouteConfig().request,
            parameters: {
              signatures: {
                required: ['userId: string'],
                all: ['userId: string', 'kyInstance?: KyInstance', 'options?: Options'],
              },
              arguments: {
                required: ['userId'],
                all: ['userId', 'kyInstance', 'options'],
              },
            },
          },
        });

        const result = generateTanstackQueryConfig(route, routeConfig);

        expect(result.query.queryKeyRootKey).toBe("['users', 'getUsers']");
        expect(result.query.queryKeyVariablePartsExpression).toBe(
          '...(userId != null ? [userId] : [])',
        );
        expect(result.query.queryKeySignatures).toBe('userId: string');
      });

      it('should generate query key rootKey and variable parts with literal path segments', () => {
        const route = createMockRoute({
          request: { method: 'get', path: '/users/{userId}' },
        });
        const routeConfig = createMockRouteConfig({
          request: {
            ...createMockRouteConfig().request,
            parameters: {
              signatures: {
                required: ['userId: string'],
                all: ['userId: string', 'kyInstance?: KyInstance', 'options?: Options'],
              },
              arguments: {
                required: ['userId'],
                all: ['userId', 'kyInstance', 'options'],
              },
            },
          },
        });

        const result = generateTanstackQueryConfig(route, routeConfig);

        // {userId} is treated as literal; first segment is 'users'
        expect(result.query.queryKeyRootKey).toBe("['users', 'getUsers']");
        expect(result.query.queryKeyVariablePartsExpression).toBe(
          '...(userId != null ? [userId] : [])',
        );
      });

      it('should include query params in query key variable parts', () => {
        const route = createMockRoute({
          request: {
            method: 'get',
            path: '/users',
            query: { type: 'GetUsersQueryParams' },
          },
        });
        const routeConfig = createMockRouteConfig({
          request: {
            ...createMockRouteConfig().request,
            query: { dtoName: 'GetUsersQueryParams', schema: { name: '' } },
            parameters: {
              signatures: {
                required: ['params: GetUsersQueryParams'],
                all: ['params: GetUsersQueryParams', 'kyInstance?: KyInstance', 'options?: Options'],
              },
              arguments: {
                required: ['params'],
                all: ['params', 'kyInstance', 'options'],
              },
            },
          },
        });

        const result = generateTanstackQueryConfig(route, routeConfig);

        expect(result.query.queryKeyRootKey).toBe("['users', 'getUsers']");
        expect(result.query.queryKeyVariablePartsExpression).toBe(
          '...(params ? [params] : [])',
        );
        expect(result.query.queryKeySignatures).toBe('params: GetUsersQueryParams');
      });

      it('should include payload in query key variable parts', () => {
        const route = createMockRoute({
          request: {
            method: 'post',
            path: '/users/search',
            payload: { name: null, type: 'SearchUsersPayload' },
          },
        });
        const routeConfig = createMockRouteConfig({
          request: {
            ...createMockRouteConfig().request,
            parameters: {
              signatures: {
                required: ['payload: SearchUsersPayload'],
                all: ['payload: SearchUsersPayload', 'kyInstance?: KyInstance', 'options?: Options'],
              },
              arguments: {
                required: ['payload'],
                all: ['payload', 'kyInstance', 'options'],
              },
            },
          },
        });

        const result = generateTanstackQueryConfig(route, routeConfig);

        expect(result.query.queryKeyRootKey).toBe("['users', 'getUsers']");
        expect(result.query.queryKeyVariablePartsExpression).toBe(
          '...(payload ? [payload] : [])',
        );
      });

      it('should generate mutation key constants content', () => {
        const route = createMockRoute({
          request: { method: 'post', path: '/users/{userId}/posts' },
        });
        const routeConfig = createMockRouteConfig();

        const result = generateTanstackQueryConfig(route, routeConfig);

        expect(result.mutation.mutationKeyConstanstContent).toBe("['users', 'userId', 'posts']");
      });

      it('should handle empty path in mutation key', () => {
        const route = createMockRoute({
          request: { method: 'post', path: '' },
        });
        const routeConfig = createMockRouteConfig();

        const result = generateTanstackQueryConfig(route, routeConfig);

        expect(result.mutation.mutationKeyConstanstContent).toBe('[]');
      });

      it('should leave query key rootKey and variable parts empty when path or method is missing', () => {
        const route = createMockRoute({
          request: { method: '', path: '' },
        });
        const routeConfig = createMockRouteConfig();

        const result = generateTanstackQueryConfig(route, routeConfig);

        expect(result.query.queryKeyRootKey).toBe('');
        expect(result.query.queryKeyVariablePartsExpression).toBe('');
      });
    });

    describe('x-staleTime and x-gcTime parsing', () => {
      describe('number values', () => {
        it('should handle numeric staleTime', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-staleTime': 60000,
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).toContain('staleTime: 60000');
        });

        it('should handle numeric gcTime', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-gcTime': 300000,
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).toContain('gcTime: 300000');
        });

        it('should handle both numeric staleTime and gcTime', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-staleTime': 60000,
              'x-gcTime': 300000,
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).toContain('staleTime: 60000');
          expect(result.query.extraOptionContent).toContain('gcTime: 300000');
        });
      });

      describe('Infinity value', () => {
        it('should handle Infinity staleTime (lowercase)', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-staleTime': 'infinity',
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).toContain('staleTime: Number.POSITIVE_INFINITY');
        });

        it('should handle Infinity staleTime (mixed case)', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-staleTime': 'Infinity',
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).toContain('staleTime: Number.POSITIVE_INFINITY');
        });

        it('should handle Infinity gcTime', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-gcTime': 'Infinity',
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).toContain('gcTime: Number.POSITIVE_INFINITY');
        });
      });

      describe('static value', () => {
        it('should handle static staleTime', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-staleTime': 'static',
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).toContain("staleTime: 'static'");
        });
      });

      describe('time unit parsing', () => {
        it('should parse hours', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-staleTime': '2h',
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).toContain('staleTime: 2 * 60 * 60 * 1000');
          expect(result.query.extraOptionContent).toContain('// 2시간');
        });

        it('should parse minutes', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-staleTime': '30m',
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).toContain('staleTime: 30 * 60 * 1000');
          expect(result.query.extraOptionContent).toContain('// 30분');
        });

        it('should parse seconds', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-staleTime': '45s',
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).toContain('staleTime: 45 * 1000');
          expect(result.query.extraOptionContent).toContain('// 45초');
        });

        it('should parse combined time units (hours and minutes)', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-staleTime': '1h30m',
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).toContain(
            'staleTime: 1 * 60 * 60 * 1000 + 30 * 60 * 1000',
          );
          expect(result.query.extraOptionContent).toContain('// 1시간 30분');
        });

        it('should parse combined time units (hours, minutes, and seconds)', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-staleTime': '1h30m45s',
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).toContain(
            'staleTime: 1 * 60 * 60 * 1000 + 30 * 60 * 1000 + 45 * 1000',
          );
          expect(result.query.extraOptionContent).toContain('// 1시간 30분 45초');
        });

        it('should parse gcTime with time units', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-gcTime': '5m',
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).toContain('gcTime: 5 * 60 * 1000');
          expect(result.query.extraOptionContent).toContain('// 5분');
        });
      });

      describe('invalid values', () => {
        it('should ignore invalid string values', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-staleTime': 'invalid',
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).not.toContain('staleTime');
        });

        it('should ignore non-string, non-number values', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
              'x-staleTime': { invalid: true },
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).not.toContain('staleTime');
        });

        it('should ignore undefined values', () => {
          const route = createMockRoute({
            raw: {
              moduleName: 'users',
            },
          });
          const routeConfig = createMockRouteConfig();

          const result = generateTanstackQueryConfig(route, routeConfig);

          expect(result.query.extraOptionContent).not.toContain('staleTime');
          expect(result.query.extraOptionContent).not.toContain('gcTime');
        });
      });
    });

    describe('queryKeyArgs', () => {
      it('should set queryKeyArgs from required arguments', () => {
        const route = createMockRoute();
        const routeConfig = createMockRouteConfig({
          request: {
            ...createMockRouteConfig().request,
            parameters: {
              signatures: {
                required: ['userId: string', 'postId: number'],
                all: ['userId: string', 'postId: number', 'kyInstance?: KyInstance'],
              },
              arguments: {
                required: ['userId', 'postId'],
                all: ['userId', 'postId', 'kyInstance'],
              },
            },
          },
        });

        const result = generateTanstackQueryConfig(route, routeConfig);

        expect(result.query.queryKeyArgs).toBe('userId, postId');
      });

      it('should handle empty required arguments', () => {
        const route = createMockRoute();
        const routeConfig = createMockRouteConfig();

        const result = generateTanstackQueryConfig(route, routeConfig);

        expect(result.query.queryKeyArgs).toBe('');
      });
    });
  });
});
