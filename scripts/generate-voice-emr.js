#!/usr/bin/env node

import path from "node:path";
import minimist from "minimist";
import { generateCode } from "../utils/voice-emr/swagger-typescript-api.js";
import { saveDto, saveEntitiesFile } from "../utils/file.js";

const argv = minimist(process.argv.slice(2), {
  string: [
    "uri",
    "username",
    "password",
    "dto-output-path",
    "api-output-path",
    "query-output-path",
    "mutation-output-path",
    "domain-name",
  ],
  alias: {
    u: "uri",
    un: "username",
    pw: "password",
    dp: "dto-output-path",
    ap: "api-output-path",
    qp: "query-output-path",
    mp: "mutation-output-path",
    dn: "domain-name",
  },
});

const {
  uri,
  username,
  password,
  "dto-output-path": dtoOutputPath,
  "api-output-path": apiOutputPath,
  "query-output-path": queryOutputPath,
  "mutation-output-path": mutationOutputPath,
  "domain-name": domainName,
} = argv;

const outputPath = {
  dto:
    dtoOutputPath ??
    path.resolve(
      process.cwd(),
      domainName
        ? `src/shared/api/${domainName}/dto.ts`
        : "src/shared/api/dto.ts"
    ),
  api:
    apiOutputPath ??
    path.resolve(
      process.cwd(),
      domainName
        ? `src/entities/${domainName}/{moduleName}/api/index.ts`
        : "src/entities/{moduleName}/api/index.ts"
    ),
  query:
    queryOutputPath ??
    path.resolve(
      process.cwd(),
      domainName
        ? `src/entities/${domainName}/{moduleName}/api/queries.ts`
        : "src/entities/{moduleName}/api/queries.ts"
    ),
  mutation:
    mutationOutputPath ??
    path.resolve(
      process.cwd(),
      domainName
        ? `src/entities/${domainName}/{moduleName}/api/mutations.ts`
        : "src/entities/{moduleName}/api/mutations.ts"
    ),
};

if (!uri) {
  console.error(
    "❗️ Error: Please provide the swagger URL or swagger file name"
  );
  process.exit(1);
}

try {
  const apiAndDtoCode = await generateCode("api", uri, username, password);
  const queriesCode = await generateCode("query", uri, username, password);
  const mutationsCode = await generateCode("mutation", uri, username, password);
  await saveDto(outputPath.dto, apiAndDtoCode.files);
  await saveEntitiesFile(outputPath.api, apiAndDtoCode.files);
  await saveEntitiesFile(outputPath.query, queriesCode.files);
  await saveEntitiesFile(outputPath.mutation, mutationsCode.files);
} catch (e) {
  console.error(e);
}
