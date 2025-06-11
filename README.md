# Swagger Client Autogen

이 프로젝트는 Swagger 문서를 기반으로 API 클라이언트를 자동으로 생성하는 도구입니다. 아래의 가이드를 따라 프로젝트를 로컬 환경에 클론한 후, 전역으로 설치하여 사용할 수 있습니다.

<!-- TOC -->
* [Swagger Client Autogen](#swagger-client-autogen)
    * [설치 방법](#설치-방법)
        * [1. 저장소 클론](#1-저장소-클론)
        * [2. 디렉토리 이동](#2-디렉토리-이동)
        * [3. 패키지 의존성 설치](#3-패키지-의존성-설치)
        * [4. npm link를 통한 글로벌 설치](#4-npm-link를-통한-글로벌-설치)
    * [프로젝트 업데이트](#프로젝트-업데이트)
    * [사용 방법](#사용-방법)
        * [1. `fetch-swagger`](#1-fetch-swagger)
            * [사용법](#사용법)
            * [옵션 설명](#옵션-설명)
            * [예시](#예시)
            * [결과](#결과)
        * [2. `generate-all`](#2-generate-all)
            * [사용법](#사용법-1)
            * [옵션 설명](#옵션-설명-1)
            * [예시](#예시-1)
            * [결과](#결과-1)
        * [3. `generate-msw`](#3-generate-msw)
            * [사용법](#사용법-2)
            * [옵션 설명](#옵션-설명-2)
            * [예시](#예시-2)
            * [결과](#결과-2)
            * [주요 파일](#주요-파일)
            * [변환 후 예시](#변환-후-예시)
            * [에러 처리](#에러-처리)
<!-- TOC -->

## 설치 방법

### 1. 저장소 클론
먼저, GitHub에서 프로젝트 저장소를 로컬로 클론합니다.

```
git clone https://github.com/dhlab-org/swagger-client-autogen/tree/main
```

### 2. 디렉토리 이동
프로젝트 디렉토리로 이동합니다.

```
cd swagger-client-autogen
```

### 3. 패키지 의존성 설치
`yarn`을 사용하여 패키지 의존성을 설치합니다.

```
yarn install
```

### 4. yarn link를 통한 글로벌 설치
`yarn link` 명령어를 사용하여 이 프로젝트를 전역적으로 설치합니다. 이를 통해 로컬에서 명령어를 글로벌로 사용할 수 있습니다.

```
yarn link
```

## 프로젝트 업데이트

저장소의 최신 코드를 받아 반영하려면 아래 명령어를 실행하세요.

```
git pull origin main
yarn install
```

> #### ⚠️ 주의사항
>
> - `yarn link`를 사용하면 프로젝트가 전역적으로 설치되지만, 로컬 프로젝트에서 발생하는 모든 변경 사항은 즉시 반영됩니다. 개발 중인 프로젝트에 사용하기에 적합한 방식입니다.
> - 전역적으로 설치된 이 프로젝트를 제거하려면 `yarn unlink` 명령어를 사용할 수 있습니다.
>
> ```
> yarn unlink -g swagger-client-autogen
> ```

## 사용 방법
### 1. `fetch-swagger`

이 스크립트는 Swagger 문서를 가져와 로컬에 YAML 파일로 저장하는 역할을 합니다. HTTP Basic Authentication이 필요한 경우, 사용자 이름과 비밀번호를 옵션으로 전달할 수 있습니다.

#### 사용법

```
fetch-swagger --url <swagger-url> [--username <username>] [--password <password>]
```

#### 옵션 설명

| 옵션              | 설명                                                    | 필수 여부 |
|-------------------|---------------------------------------------------------|-----------|
| `--url`, `-u`     | 가져올 Swagger 문서의 URL을 지정합니다.                  | 필수      |
| `--username`, `-un`| HTTP Basic Authentication을 위한 사용자 이름을 지정합니다.| 선택      |
| `--password`, `-pw`| HTTP Basic Authentication을 위한 비밀번호를 지정합니다.  | 선택      |

#### 예시

1. 인증이 필요하지 않은 Swagger 문서를 가져오는 경우:

```
fetch-swagger --url http://example.com/swagger.json
```

2. 인증이 필요한 Swagger 문서를 가져오는 경우:

```
fetch-swagger --url http://example.com/swagger.json --username admin --password secret
```

#### 결과

Swagger 문서가 성공적으로 가져오면, 프로젝트의 `swagger/` 디렉토리에 Swagger 문서 제목을 케밥 케이스로 변환한 파일명이 YAML 형식으로 저장됩니다.

예를 들어, `Swagger API`라는 제목의 문서를 가져오면 다음과 같이 저장됩니다:

```
swagger/swagger-api.yml
```

문서가 성공적으로 저장되면 다음과 같은 메시지가 출력됩니다:

```
✅  Successfully imported and converted swagger file to YAML.
```

만약 실패할 경우, 에러 메시지가 출력됩니다.


### 2. `generate-all`

이 스크립트는 Swagger 문서를 기반으로 DTO, API 클라이언트, Query, Mutation 파일을 자동으로 생성합니다. 각 경로는 기본 경로나 사용자가 지정한 경로에 따라 파일이 생성됩니다.

#### 사용법

```
generate-all --uri <swagger-url|swagger-file-name> [--username <username>] [--password <password>]
[--dto-output-path <dto-output-path>]
[--api-output-path <api-output-path>]
[--api-instance-output-path <api-instance-output-path>]
[--query-output-path <query-output-path>]
[--mutation-output-path <mutation-output-path>]
```

#### 옵션 설명

| 옵션                                   | 설명                                                                         | 필수 여부 |
|--------------------------------------|----------------------------------------------------------------------------|-----------|
| `--uri`, `-u`                        | Swagger 문서의 URL 또는 로컬 파일 경로를 지정합니다.                                        | 필수      |
| `--username`, `-un`                  | HTTP Basic Authentication을 위한 사용자 이름을 지정합니다.                               | 선택      |
| `--password`, `-pw`                  | HTTP Basic Authentication을 위한 비밀번호를 지정합니다.                                 | 선택      |
| `--dto-output-path`, `-dp`           | DTO 파일을 출력할 경로를 지정합니다. 지정하지 않으면 기본 경로인 `src/shared/api/dto.ts`에 저장됩니다.     | 선택      |
| `--api-output-path`, `-ap`           | API 클라이언트 파일을 출력할 경로를 지정합니다. **`{moduleName}`**을 포함하면 모듈 이름으로 대체됩니다.       | 선택      |
| `--api-instance-output-path`, `-aip` | API 클라이언트의 인스턴스 파일을 출력할 경로를 지정합니다. **`{moduleName}`**을 포함하면 모듈 이름으로 대체됩니다. | 선택      |
| `--query-output-path`, `-qp`         | Query 파일을 출력할 경로를 지정합니다. **`{moduleName}`**을 포함하면 모듈 이름으로 대체됩니다.           | 선택      |
| `--mutation-output-path`, `-mp`      | Mutation 파일을 출력할 경로를 지정합니다. **`{moduleName}`**을 포함하면 모듈 이름으로 대체됩니다.        | 선택      |

> **🔔 `{moduleName}`에 대한 설명**
>
> `--api-output-path`, `--query-output-path`, `--mutation-output-path` 경로에서 `{moduleName}`을 사용하면, Swagger 문서에서 가져온 모듈 이름으로 자동 대체됩니다.
> 예를 들어, 모듈 이름이 `User`인 경우, `{moduleName}`이 포함된 경로는 자동으로 `user`로 변환됩니다.

---

#### 예시

1. 인증이 필요하지 않은 Swagger 문서를 기반으로 모든 파일을 생성하는 경우:

```
generate-all --uri http://example.com/swagger.json
```

2. 인증이 필요한 Swagger 문서를 기반으로 모든 파일을 생성하는 경우:

```
generate-all --uri http://example.com/swagger.json --username admin --password secret
```

3. DTO, API, Query, Mutation 파일의 출력 경로를 직접 지정하는 경우:

```
generate-all --uri http://example.com/swagger.json
--dto-output-path ./custom/path/dto.ts
--api-output-path ./custom/path/{moduleName}/api/index.ts
--api-instance-output-path ./custom/path/{moduleName}/api/instance.ts
--query-output-path ./custom/path/{moduleName}/api/queries.ts
--mutation-output-path ./custom/path/{moduleName}/api/mutations.ts
```

이 경우, Swagger 문서에서 모듈 이름이 `User`라면, 다음과 같은 파일 경로로 파일이 생성됩니다:

- API 클라이언트: `./custom/path/user/api/index.ts`
- API 클라이언트 인스턴스: `./custom/path/user/api/instance.ts`
- Query 파일: `./custom/path/user/api/queries.ts`
- Mutation 파일: `./custom/path/user/api/mutations.ts`

#### 결과

이 스크립트는 지정된 경로 또는 기본 경로에 다음 파일들을 생성합니다:

- DTO 파일: `src/shared/api/dto.ts` (또는 지정된 경로)
- API 클라이언트 파일: `src/entities/{moduleName}/api/index.ts` (또는 지정된 경로)
- API 클라이언트 인스턴스 파일: `src/entities/{moduleName}/api/instance.ts` (또는 지정된 경로)
- Query 파일: `src/entities/{moduleName}/api/queries.ts` (또는 지정된 경로)
- Mutation 파일: `src/entities/{moduleName}/api/mutations.ts` (또는 지정된 경로)

각 파일은 Swagger 문서에 기반하여 자동으로 생성되며, 생성이 완료되면 아래와 같은 메시지가 출력됩니다:

```
✅  Successfully wrote file at <output-path>
```

에러가 발생한 경우, 해당 에러 메시지가 출력됩니다.

### 3. `generate-msw`

이 스크립트는 Swagger 문서를 기반으로 **Mock Service Worker (MSW)** 핸들러 파일을 자동으로 생성하고, 그 후 TypeScript로 변환하며, 특정 코드 수정 작업을 수행합니다.

#### 사용법

```
generate-msw --swagger-path <swagger-path> [--api-base-url <api-base-url>]
```

#### 옵션 설명

| 옵션                  | 설명                                                        | 필수 여부 |
|-----------------------|-------------------------------------------------------------|-----------|
| `--swagger-path`, `-s`| Swagger 파일의 경로를 지정합니다.                           | 필수      |
| `--api-base-url`, `-a`| API 기본 URL을 지정합니다. 기본값은 `https://api.example.com/v1`입니다. | 선택      |

#### 예시

1. 기본 API URL을 사용하여 MSW 핸들러 파일을 생성하는 경우:

```
generate-msw --swagger-path ./swagger-file.yml
```

2. 사용자 지정 API 기본 URL을 사용하여 MSW 핸들러 파일을 생성하는 경우:

```
generate-msw --swagger-path ./swagger-file.yml --api-base-url https://custom-api.com/v2
```

#### 결과

이 스크립트는 다음과 같은 작업을 수행합니다:

1. `pnpm msw-auto-mock` 명령어를 사용하여 Swagger 문서를 기반으로 MSW 핸들러 파일을 생성합니다. 이 파일들은 `msw` 폴더에 저장됩니다.
2. `.js` 파일을 `.ts` 파일로 변환합니다. 즉, `browser.js` 및 `node.js` 파일을 각각 `browser.ts` 및 `node.ts` 파일로 변환합니다.
3. `handlers.js` 파일의 특정 코드 패턴을 수정하여, 핸들러 로직을 업데이트합니다:
    - `responseSelector` 함수를 사용하도록 핸들러 로직을 변경합니다.
    - `faker` 라이브러리의 특정 사용 방식을 업데이트합니다.

#### 주요 파일

- **`handlers.js`**: 스크립트가 수정하는 주요 핸들러 파일입니다. 자동 생성된 후 특정 코드 패턴을 교체하여 수정됩니다.
- **`browser.ts`**, **`node.ts`**: `.js` 파일에서 `.ts`로 변환된 핸들러 파일입니다.

#### 변환 후 예시

1. `native.js` 파일은 삭제됩니다.
2. `browser.js` 및 `node.js` 파일은 각각 `browser.ts`와 `node.ts`로 변환됩니다.
3. `handlers.js` 파일에 다음과 같은 코드 수정이 이루어집니다:
    - `responseSelector` 함수가 도입됩니다.
    - `faker` 라이브러리의 `Faker` 클래스와 `ko` 로케일이 적용됩니다.

#### 에러 처리

스크립트 실행 중 문제가 발생하면, 다음과 같은 에러 메시지가 출력됩니다:

```
⚠️ Error executing script: <에러 메시지>
```
