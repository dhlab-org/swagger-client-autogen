import path from 'node:path';
import { kebabCase } from 'es-toolkit';
import { generateApi } from 'swagger-typescript-api';
import { describe, expect, test } from 'vitest';
import { setupCodegenConfig } from '../src/config-builders/codegen-config';
import { generateModuleConfig } from '../src/config-builders/module-config';
import { generateConfig } from '../src/config-builders/route-config';
import { generateTanstackQueryConfig } from '../src/config-builders/tanstack-query-config';
import type { InputCodegenConfig } from '../src/types/codegen-config';
import type { ParsedRoute } from '../src/types/swagger-typescript-api';
import { buildRequestFunctionName } from '../src/utils/route-utils';

const FIXTURES_DIR = path.join(__dirname, 'fixtures/schemas');
const TEMPLATES_DIR = path.join(__dirname, '../src/templates');

// edu-max-fe의 local.config.ts와 동일한 설정
const createTestConfig = (schemaPath: string): InputCodegenConfig => ({
  uri: schemaPath,
  createSchema: true,
  createQueryHook: false,
  customOutput: {
    aliasInfo: {
      aliasMap: {
        '@': 'src',
      },
      aliasMapDepth: 2,
    },
    pathInfo: {
      api: 'src/entities/{moduleName}/__generated__/api/index.ts',
      apiInstance: 'src/entities/{moduleName}/__generated__/api/instance.ts',
      queries: 'src/entities/{moduleName}/__generated__/api/queries.ts',
      mutations: 'src/entities/{moduleName}/__generated__/api/mutations.ts',
      dto: 'src/shared/api/__generated__/dto.ts',
      schema: 'src/shared/api/__generated__/schema.ts',
      apiUtils: 'src/shared/api/__generated__/utils.ts',
      typeGuards: 'src/shared/api/__generated__/type-guards.ts',
      streamUtils: 'src/shared/api/__generated__/stream-utils.ts',
      globalMutationEffectType: 'src/shared/api/__generated__/global-mutation-effect.type.ts',
    },
  },
});

const ignoreRoute = (route: ParsedRoute) => {
  return (route.raw as Record<string, unknown>)['x-ignore'] === true;
};

describe('snapshot tests', () => {
  const schemas = [
    { name: 'petstore', filePath: path.join(FIXTURES_DIR, 'petstore.yaml') },
    { name: 'ai-chat', filePath: path.join(FIXTURES_DIR, 'ai-chat.yaml') },
  ];

  describe('API code generation', () => {
    test.each(schemas)('$name - api, apiInstance, dto', async ({ name, filePath }) => {
      const inputConfig = createTestConfig(filePath);
      const config = setupCodegenConfig(inputConfig);

      const result = await generateApi({
        input: filePath,
        output: false,
        generateClient: true,
        generateUnionEnums: true,
        silent: true,
        moduleNameFirstTag: true,
        typeSuffix: 'Dto',
        generateRouteTypes: true,
        // @ts-expect-error: templates, modular 옵션은 cli 옵션이라서 타입에 없음
        templates: TEMPLATES_DIR,
        modular: true,
        templateInfos: [
          { name: 'api', fileName: 'api' },
          { name: 'routeTypes', fileName: 'api-instance' },
          { name: 'dataContracts', fileName: 'data-contracts' },
          { name: 'dataContractJsDoc', fileName: 'data-contract-jsdoc' },
          { name: 'objectFieldJsDoc', fileName: 'object-field-jsdoc' },
          { name: 'interfaceDataContract', fileName: 'interface-data-contract' },
          { name: 'typeDataContract', fileName: 'type-data-contract' },
          { name: 'enumDataContract', fileName: 'enum-data-contract' },
          { name: 'httpClient', fileName: 'http-client' },
        ],
        hooks: {
          onCreateRouteName: (routeNameInfo, rawRouteInfo) => {
            return {
              ...routeNameInfo,
              usage: buildRequestFunctionName(rawRouteInfo),
            };
          },
          onCreateRoute: (route) => {
            if (ignoreRoute(route)) {
              return false;
            }

            const routeConfig = generateConfig(route);
            const moduleConfig = generateModuleConfig(route, config);

            return {
              ...route,
              routeConfig,
              moduleConfig,
              codegenConfig: config,
            };
          },
        },
      });

      // 생성된 파일별 스냅샷
      for (const file of result.files) {
        if (file.fileName === 'http-client') continue;

        if (file.fileName === 'data-contracts') {
          expect(file.fileContent).toMatchSnapshot(`${name}/dto`);
        } else if (file.fileName.match(/Route$/)) {
          const moduleName = kebabCase(file.fileName.replace('Route', ''));
          expect(file.fileContent).toMatchSnapshot(`${name}/api-instance/${moduleName}`);
        } else {
          const moduleName = kebabCase(file.fileName);
          expect(file.fileContent).toMatchSnapshot(`${name}/api/${moduleName}`);
        }
      }
    });
  });

  describe('TanStack Query code generation', () => {
    test.each(schemas)('$name - queries, mutations', async ({ name, filePath }) => {
      const inputConfig = createTestConfig(filePath);
      const config = setupCodegenConfig(inputConfig);
      const tanstackQueryTemplatePath = path.join(TEMPLATES_DIR, 'tanstack-query');

      const result = await generateApi({
        input: filePath,
        output: false,
        generateClient: true,
        generateUnionEnums: true,
        silent: true,
        moduleNameFirstTag: true,
        typeSuffix: 'Dto',
        generateRouteTypes: true,
        // @ts-expect-error: templates, modular 옵션은 cli 옵션이라서 타입에 없음
        templates: tanstackQueryTemplatePath,
        modular: true,
        templateInfos: [
          { name: 'api', fileName: 'queries' },
          { name: 'routeTypes', fileName: 'mutations' },
          { name: 'dataContracts', fileName: 'data-contracts' },
          { name: 'dataContractJsDoc', fileName: 'data-contract-jsdoc' },
          { name: 'interfaceDataContract', fileName: 'interface-data-contract' },
          { name: 'typeDataContract', fileName: 'type-data-contract' },
          { name: 'enumDataContract', fileName: 'enum-data-contract' },
          { name: 'objectFieldJsDoc', fileName: 'object-field-jsdoc' },
          { name: 'httpClient', fileName: 'http-client' },
        ],
        extraTemplates: [
          {
            name: 'global-mutation-effect',
            path: path.join(tanstackQueryTemplatePath, 'global-mutation-effect.ejs'),
          },
        ],
        hooks: {
          onPrepareConfig: (prepareConfig) => {
            return {
              ...prepareConfig,
              utils: {
                ...prepareConfig.utils,
                kebabCase: (str: string) => kebabCase(str),
              },
            };
          },
          onCreateRouteName: (routeNameInfo, rawRouteInfo) => {
            return {
              ...routeNameInfo,
              usage: buildRequestFunctionName(rawRouteInfo),
            };
          },
          onCreateRoute: (route) => {
            if (ignoreRoute(route)) {
              return false;
            }

            const { moduleName } = route.raw;
            const routeConfig = generateConfig(route);
            const moduleConfig = generateModuleConfig(route, config);
            const tanstackQueryConfig = generateTanstackQueryConfig(route, routeConfig);

            return {
              ...route,
              routeConfig,
              codegenConfig: config,
              moduleConfig: {
                ...moduleConfig,
                query: {
                  queryKeyObjectName: `${moduleName.toUpperCase()}_QUERY_KEY`,
                },
                mutation: {
                  mutationKeyObjectName: `${moduleName.toUpperCase()}_MUTATION_KEY`,
                },
              },
              hookConfig: tanstackQueryConfig,
            };
          },
        },
      });

      // 생성된 파일별 스냅샷
      for (const file of result.files) {
        if (file.fileName === 'http-client' || file.fileName === 'data-contracts') continue;

        if (file.fileName === 'global-mutation-effect') {
          expect(file.fileContent).toMatchSnapshot(`${name}/global-mutation-effect`);
        } else if (file.fileName.match(/Route$/)) {
          const moduleName = kebabCase(file.fileName.replace('Route', ''));
          expect(file.fileContent).toMatchSnapshot(`${name}/mutations/${moduleName}`);
        } else {
          const moduleName = kebabCase(file.fileName);
          expect(file.fileContent).toMatchSnapshot(`${name}/queries/${moduleName}`);
        }
      }
    });
  });

  describe('Route configuration', () => {
    test.each(schemas)('$name - route metadata', async ({ name, filePath }) => {
      const routes: Array<{
        method: string;
        path: string;
        functionName: string;
        moduleName: string;
        hasQuery: boolean;
        hasPayload: boolean;
        responseType: string | null;
      }> = [];

      await generateApi({
        input: filePath,
        output: false,
        generateClient: true,
        silent: true,
        moduleNameFirstTag: true,
        typeSuffix: 'Dto',
        generateRouteTypes: true,
        hooks: {
          onCreateRouteName: (routeNameInfo, rawRouteInfo) => {
            return {
              ...routeNameInfo,
              usage: buildRequestFunctionName(rawRouteInfo),
            };
          },
          onCreateRoute: (route) => {
            if (ignoreRoute(route)) {
              return false;
            }

            const routeConfig = generateConfig(route);

            routes.push({
              method: route.request.method ?? '',
              path: route.request.path ?? '',
              functionName: routeConfig.request.functionName,
              moduleName: route.raw.moduleName,
              hasQuery: Boolean(route.request.query),
              hasPayload: Boolean(route.request.payload),
              responseType: routeConfig.response.dtoName,
            });

            return route;
          },
        },
      });

      expect(routes).toMatchSnapshot(`${name}/routes`);
    });
  });
});
