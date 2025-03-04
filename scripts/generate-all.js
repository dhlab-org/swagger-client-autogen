#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'node:path';
import minimist from 'minimist';
import { fileURLToPath } from 'url';
import { generateApi } from 'swagger-typescript-api';
import { fetchSwagger } from '../utils/fetch-swagger.js';
import { saveDto, saveEntitiesFile, saveZodApiFile, writeFileToPath } from '../utils/file.js';
import { AnyOfSchemaParser } from '../utils/parser.js';
import { isUrl } from '../utils/url.js';
const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseArguments = () => {
  const argv = minimist(process.argv.slice(2), {
    string: [
      'uri',
      'username',
      'password',
      'dto-output-path',
      'api-output-path',
      'api-instance-output-path',
      'query-output-path',
      'mutation-output-path',
      'schema-output-path',
      'project-template',
    ],
    boolean: ['create-schema'],
    alias: {
      u: 'uri',
      un: 'username',
      pw: 'password',
      dp: 'dto-output-path',
      ap: 'api-output-path',
      aip: 'api-instance-output-path',
      qp: 'query-output-path',
      mp: 'mutation-output-path',
      pt: 'project-template',
      sp: 'schema-output-path',
      cs: 'create-schema',
    },
  });

  return {
    uri: argv.uri,
    username: argv.username,
    password: argv.password,
    dtoOutputPath: argv['dto-output-path'],
    apiOutputPath: argv['api-output-path'],
    apiInstanceOutputPath: argv['api-instance-output-path'],
    queryOutputPath: argv['query-output-path'],
    mutationOutputPath: argv['mutation-output-path'],
    schemaOutputPath: argv['schema-output-path'],
    projectTemplate: argv['project-template'],
    createSchema: argv['create-schema'],
  };
};

const setupOutputPaths = (args) => {
  return {
    dto: {
      relativePath: args.dtoOutputPath ?? 'src/shared/api/dto.ts',
      absolutePath: path.resolve(process.cwd(), args.dtoOutputPath ?? 'src/shared/api/dto.ts'),
    },
    api: {
      relativePath: args.apiOutputPath ?? 'src/entities/{moduleName}/api/index.ts',
      absolutePath: path.resolve(process.cwd(), args.apiOutputPath ?? 'src/entities/{moduleName}/api/index.ts'),
    },
    apiInstance: {
      relativePath: args.apiInstanceOutputPath ?? 'src/entities/{moduleName}/api/instance.ts',
      absolutePath: path.resolve(process.cwd(), args.apiInstanceOutputPath ?? 'src/entities/{moduleName}/api/instance.ts'),
    },
    query: {
      relativePath: args.queryOutputPath ?? 'src/entities/{moduleName}/api/queries.ts',
      absolutePath: path.resolve(process.cwd(), args.queryOutputPath ?? 'src/entities/{moduleName}/api/queries.ts'),
    },
    mutation: {
      relativePath: args.mutationOutputPath ?? 'src/entities/{moduleName}/api/mutations.ts',
      absolutePath: path.resolve(process.cwd(), args.mutationOutputPath ?? 'src/entities/{moduleName}/api/mutations.ts'),
    },
    schema: {
      relativePath: args.schemaOutputPath ?? 'src/shared/api/schema.ts',
      absolutePath: path.resolve(process.cwd(), args.schemaOutputPath ?? 'src/shared/api/schema.ts'),
    },
  };
};

const printUsage = (outputPaths) => {
  console.error('❗️ Error: Please provide the swagger URL or swagger file name');
  console.error(
    'Usage: node generate-all.js --uri <swagger-url|swagger-file-name> ' +
      '[--username <username>] [--password <password>] ' +
      '[--dto-output-path <dto-output-path>] ' +
      '[--api-output-path <api-output-path>] ' +
      '[--query-output-path <query-output-path>] ' +
      '[--mutation-output-path <mutation-output-path>] ' +
      '[--schema-output-path <schema-output-path>] ' +
      '[--project-template <project-template>]' +
      '[--create-schema]'
  );
  console.error(
    `Current output paths:\n` +
      `DTO Path: ${outputPaths.dto.relativePath}\n` +
      `API Path: ${outputPaths.api.relativePath}\n` +
      `Query Path: ${outputPaths.query.relativePath}\n` +
      `Mutation Path: ${outputPaths.mutation.relativePath}\n` +
      `Project Template Path: ${outputPaths.projectTemplate}\n` +
      `Schema Path: ${outputPaths.schema.relativePath}\n`
  );
};

export const generateApiCode = async ({uri, username, password, templates, ...params}) => {
  const isLocal = !isUrl(uri);

  return generateApi({
    input: isLocal ? path.resolve(process.cwd(), uri) : undefined,
    spec: !isLocal && (await fetchSwagger(uri, username, password)),
    templates: templates,
    generateClient: true,
    generateUnionEnums: true,
    cleanOutput: false,
    silent: true,
    prettier: {
      semi: true,
      trailingComma: 'es5',
      singleQuote: true,
      printWidth: 100,
      tabWidth: 2,
      arrowParens: 'always',
      jsxBracketSameLine: false,
      jsxSingleQuote: false,
    },
    modular: true,
    moduleNameFirstTag: true,
    moduleNameIndex: 1,
    typeSuffix: 'Dto',
    schemaParsers: {
      complexAnyOf: AnyOfSchemaParser,
    },
    ...params
  });
}

const generateApiFunctionCode = async (args, outputPaths) => {
  const {projectTemplatePath,createSchema, uri, username, password} = args;
  const templatePath = projectTemplatePath ? path.resolve(projectTemplatePath) : createSchema ? path.resolve(__dirname, '../templates/schema') : path.resolve(__dirname, '../templates');

  const apiFunctionCode = await generateApiCode({
    uri, username, password, templates: templatePath,
  });

  for (const { fileName, fileContent } of apiFunctionCode.files) {
    if (fileName === 'http-client') continue;

    if(fileName === 'data-contracts'){
      writeFileToPath(outputPaths.dto.absolutePath, fileContent);
    }else if(fileName === 'route-types'){
      writeFileToPath(outputPaths.apiInstance.absolutePath, fileContent);
    }else {
      const moduleName = fileName.toLowerCase();
      const output = outputPaths.api.absolutePath.replace('{moduleName}', moduleName);
      await writeFileToPath(output, fileContent);
    }
  }
}

const generateTanstackQueryCode = async (args, outputPaths) => {
  const {projectTemplatePath,createSchema, uri, username, password} = args;
  const templatePath = projectTemplatePath ? path.resolve(projectTemplatePath, 'tanstack-query') : path.resolve(__dirname, '../templates/tanstack-query');

  const tanstackQueryCode = await generateApiCode({
    uri, username, password, templates: templatePath,
  })

  for (const { fileName, fileContent } of tanstackQueryCode.files) {
    if (fileName === 'http-client' || fileName === 'data-contracts') continue;

    // mutaion
    if(fileName === 'route-types'){
      const moduleName = fileName.toLowerCase();
      const output = outputPaths.mutaion.absolutePath.replace('{moduleName}', moduleName);
      await writeFileToPath(output, fileContent); 
    }else{
      // query
      const moduleName = fileName.toLowerCase();
      const output = outputPaths.query.absolutePath.replace('{moduleName}', moduleName);
      await writeFileToPath(output, fileContent); 
    }
  }
}

const main = async () => {
  const args = parseArguments();
  const outputPaths = setupOutputPaths(args);

  if (!args.uri) {
    printUsage(outputPaths);
    process.exit(1);
  }

  try {
    await generateApiFunctionCode(args, outputPaths);
    await generateTanstackQueryCode(args, outputPaths);
  } catch (e) {
    console.error(e);
  }
};

main();
