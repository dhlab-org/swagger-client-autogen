#!/usr/bin/env node

import path from 'node:path';
import minimist from 'minimist';
import { generateCode } from '../utils/swagger-typescript-api.js';
import { saveDto, saveEntitiesFile } from '../utils/file.js';

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
  ],
  alias: {
    u: 'uri',
    un: 'username',
    pw: 'password',
    dp: 'dto-output-path',
    ap: 'api-output-path',
    aip: 'api-instance-output-path',
    qp: 'query-output-path',
    mp: 'mutation-output-path',
  },
});

const {
  uri,
  username,
  password,
  'dto-output-path': dtoOutputPath,
  'api-output-path': apiOutputPath,
  'api-instance-output-path': apiInstanceOutputPath,
  'query-output-path': queryOutputPath,
  'mutation-output-path': mutationOutputPath,
} = argv;

const outputPath = {
  dto: dtoOutputPath ?? path.resolve(process.cwd(), 'src/shared/api/dto.ts'),
  api: apiOutputPath ?? path.resolve(process.cwd(), 'src/entities/{moduleName}/api/index.ts'),
  apiInstance: apiInstanceOutputPath ?? path.resolve(process.cwd(), 'src/entities/{moduleName}/api/instance.ts'),
  query: queryOutputPath ?? path.resolve(process.cwd(), 'src/entities/{moduleName}/api/queries.ts'),
  mutation:
    mutationOutputPath ?? path.resolve(process.cwd(), 'src/entities/{moduleName}/api/mutations.ts'),
};

if (!uri) {
  console.error('❗️ Error: Please provide the swagger URL or swagger file name');
  console.error(
    'Usage: node generate-all.js --uri <swagger-url|swagger-file-name> ' +
      '[--username <username>] [--password <password>] ' +
      '[--dto-output-path <dto-output-path>] ' +
      '[--api-output-path <api-output-path>] ' +
      '[--query-output-path <query-output-path>] ' +
      '[--mutation-output-path <mutation-output-path>]'
  );
  console.error(
    `Current output paths:\n` +
      `DTO Path: ${outputPath.dto}\n` +
      `API Path: ${outputPath.api}\n` +
      `Query Path: ${outputPath.query}\n` +
      `Mutation Path: ${outputPath.mutation}`
  );
  process.exit(1);
}

try {
  const apiAndDtoCode = await generateCode('api', uri, username, password);
  const apiInstanceCode = await generateCode('apiInstance', uri, username, password);
  const queriesCode = await generateCode('query', uri, username, password);
  const mutationsCode = await generateCode('mutation', uri, username, password);

  await saveDto(outputPath.dto, apiAndDtoCode.files);
  await saveEntitiesFile(outputPath.api, apiAndDtoCode.files);
  await saveEntitiesFile(outputPath.apiInstance, apiInstanceCode.files);
  await saveEntitiesFile(outputPath.query, queriesCode.files);
  await saveEntitiesFile(outputPath.mutation, mutationsCode.files);
} catch (e) {
  console.error(e);
}
