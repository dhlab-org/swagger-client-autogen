import path from 'node:path';
import { AnyOfSchemaParser } from './parser.js';
import { generateApi } from 'swagger-typescript-api';
import { fetchSwagger } from './fetch-swagger.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
};

export const generateCode = async (type, uri, username, password) => {
  const templatePath = {
    api: path.resolve(__dirname, '../templates'),
    apiInstance: path.resolve(__dirname, '../templates/api-instance'),
    query: path.resolve(__dirname, `../templates/queries`),
    mutation: path.resolve(__dirname, `../templates/mutations`),
  };
  const isLocal = !isUrl(uri);

  // type이 templatePath에 있는 key와 일치하지 않는 경우 에러 발생
  if (!templatePath.hasOwnProperty(type)) {
    throw new Error(
      `❗  Invalid type: ${type}. Expected one of ${Object.keys(templatePath).join(', ')}.`
    );
  }

  return generateApi({
    input: isLocal ? path.resolve(process.cwd(), uri) : undefined,
    spec: !isLocal && (await fetchSwagger(uri, username, password)),
    templates: templatePath[type],
    generateClient: true,
    generateUnionEnums: true,
    cleanOutput: false,
    prettier: {
      semi: true,
      trailingComma: 'es5',
      singleQuote: true,
      printWidth: 100,
      tabWidth: 2,
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
  });
};
