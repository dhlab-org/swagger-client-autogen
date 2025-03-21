#!/usr/bin/env node

import path from 'node:path';
import minimist from 'minimist';
import yaml from 'js-yaml';
import { fetchSwagger } from '../utils/fetch-swagger.js';
import { toKebabCase } from '../utils/string.js';
import { writeFileToPath } from '../utils/file.js';

const argv = minimist(process.argv.slice(2), {
  string: ['url'],
  alias: {
    u: 'url',
    un: 'username',
    pw: 'password',
  },
});

const { url } = argv;

const usernameArg = argv['username'];
const passwordArg = argv['password'];

if (!url) {
  console.error('❗️ 오류: Swagger URL 또는 Swagger 파일 이름을 제공해주세요');
  console.error(
    '사용법: node fetch-swagger.js --uri <swagger-url|swagger-file-name> ' +
      '[--username <username>] [--password <password>] '
  );
  process.exit(1);
}

try {
  const swaggerData = await fetchSwagger(url, usernameArg, passwordArg);

  const yamlData = yaml.dump(swaggerData);

  await writeFileToPath(
    path.resolve(process.cwd(), `swagger/${toKebabCase(swaggerData.info.title)}.yml`),
    yamlData
  );

  console.log('✅  Successfully imported and converted swagger file to YAML.');
} catch (e) {
  console.error('❗️ Failed to import and convert swagger file.', e);
}
