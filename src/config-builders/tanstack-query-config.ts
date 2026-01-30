import { compact, pascalCase } from 'es-toolkit';
import { produce } from 'immer';
import type { RouteConfig } from '@/types/route-config';
import type { ParsedRoute } from '@/types/swagger-typescript-api';
import { buildKeyConstantsName } from '@/utils/tanstack-query-utils';
import { pipe } from '../utils/fp';

export type TanstackQueryConfig = {
  query: {
    queryKeyArgs: string;
    /** queryKey 함수 시그니처 (선택 params 포함, 예: 'params?: GetChatsQueryParams') */
    queryKeySignatures: string;
    queryKeyConstanstName: string;
    /** rootKey 정적 배열 (예: ['chats', 'getChats']) */
    queryKeyRootKey: string;
    /** queryKey 함수 본문에서 rootKey 뒤에 붙일 변수 부분 (예: '...(params ? [params] : [])' 또는 'chatId') */
    queryKeyVariablePartsExpression: string;
    queryKeyConstanstFunction: string;
    queryHookName: string;
    suspenseQueryHookName: string;
    extraOptionContent: string;
  };
  mutation: {
    mutationKeyConstanstName: string;
    mutationKeyConstanstContent: string;
    mutationHookName: string;
  };
};

export function generateTanstackQueryConfig(route: ParsedRoute, routeConfig: RouteConfig) {
  const configMutators = withRouteConfig(route, routeConfig);
  const pascalCaseRouteName = pascalCase(route.routeName.usage);

  // x- 프로퍼티에서 staleTime과 gcTime 추출
  const rawRoute = route.raw as Record<string, unknown>;
  const xStaleTime = rawRoute['x-staleTime'];
  const xGcTime = rawRoute['x-gcTime'];

  /**
   * 시간 단위를 파싱하여 JS 표현식과 주석을 반환
   * @example
   * parseTimeValue('5m') => { expression: '5 * 60 * 1000', comment: '5분' }
   * parseTimeValue('1h30m') => { expression: '1 * 60 * 60 * 1000 + 30 * 60 * 1000', comment: '1시간 30분' }
   * parseTimeValue('Infinity') => { expression: 'Number.POSITIVE_INFINITY', comment: undefined }
   * parseTimeValue('static') => { expression: "'static'", comment: undefined }
   */
  const parseTimeValue = (
    value: unknown,
  ): { expression: string | number; comment?: string } | undefined => {
    // 숫자는 그대로 반환
    if (typeof value === 'number') {
      return { expression: value };
    }

    if (typeof value !== 'string') {
      return undefined;
    }

    // Infinity는 특별 처리 (대소문자 구분 없음)
    if (value.toLowerCase() === 'infinity') {
      return { expression: 'Number.POSITIVE_INFINITY' };
    }

    // static은 특별 처리 (staleTime 전용)
    if (value === 'static') {
      return { expression: "'static'" };
    }

    // 시간 단위 파싱: '5h', '30m', '45s', '1h30m', '1h30m45s' 등
    const regex = /(\d+)(h|m|s)/g;
    const matches = [...value.matchAll(regex)];

    if (matches.length === 0) {
      return undefined;
    }

    const multipliers = {
      h: { ms: 60 * 60 * 1000, label: '시간' },
      m: { ms: 60 * 1000, label: '분' },
      s: { ms: 1000, label: '초' },
    };

    // 표현식 생성
    const expressions = matches.map(([, num, unit]) => {
      if (unit === 'h') return `${num} * 60 * 60 * 1000`;
      if (unit === 'm') return `${num} * 60 * 1000`;
      return `${num} * 1000`;
    });

    // 주석 생성
    const commentParts = matches.map(([, num, unit]) => {
      const { label } = multipliers[unit as 'h' | 'm' | 's'];
      return `${num}${label}`;
    });

    return {
      expression: expressions.join(' + '),
      comment: commentParts.join(' '),
    };
  };

  // staleTime과 gcTime 파싱 및 추가
  const parsedStaleTime = parseTimeValue(xStaleTime);
  const parsedGcTime = parseTimeValue(xGcTime);

  const requiredSigs = routeConfig.request.parameters.signatures.required.join(', ');
  const hasOptionalParams = Boolean(route.request.query) && !routeConfig.request.parameters.arguments.required.includes('params');
  const hasOptionalPayload = Boolean(route.request.payload) && !routeConfig.request.parameters.arguments.required.includes('payload');
  let queryKeySignatures = hasOptionalParams
    ? (requiredSigs ? `${requiredSigs}, params?: ${routeConfig.request.query.dtoName ?? 'unknown'}` : `params?: ${routeConfig.request.query.dtoName ?? 'unknown'}`)
    : requiredSigs;
  if (hasOptionalPayload) {
    const payloadType = routeConfig.request.payload.dtoName ?? 'unknown';
    queryKeySignatures = queryKeySignatures ? `${queryKeySignatures}, payload?: ${payloadType}` : `payload?: ${payloadType}`;
  }

  const queryOptions: TanstackQueryConfig['query'] = {
    queryKeyArgs: routeConfig.request.parameters.arguments.required.join(', '),
    queryKeySignatures,
    queryKeyConstanstName: buildKeyConstantsName(route.request) ?? '',
    queryKeyRootKey: '',
    queryKeyVariablePartsExpression: '',
    queryKeyConstanstFunction: '',
    queryHookName: `use${pascalCaseRouteName}Query`,
    suspenseQueryHookName: `use${pascalCaseRouteName}SuspenseQuery`,
    extraOptionContent: compact([
      parsedStaleTime?.expression ? `staleTime: ${parsedStaleTime?.expression} ${parsedStaleTime?.comment ? `, // ${parsedStaleTime?.comment}` : ''}` : '',
      parsedGcTime?.expression ? `gcTime: ${parsedGcTime?.expression} ${parsedGcTime?.comment ? `, // ${parsedGcTime?.comment}` : ''}` : '',
    ]).join(',\n') + '\n',
  };


  const initialTanstackQueryConfig: TanstackQueryConfig = {
    query: queryOptions,
    mutation: {
      mutationKeyConstanstName: buildKeyConstantsName(route.request) ?? '',
      mutationKeyConstanstContent: '',
      mutationHookName: `use${pascalCaseRouteName}Mutation`,
    },
  };

  return pipe(
    configMutators.setQueryKeyConstantsFunction,
    configMutators.setMutationKeyConstantsContent,
  )(initialTanstackQueryConfig);
}

function withRouteConfig(route: ParsedRoute, routeConfig: RouteConfig) {
  return {
    setQueryKeyConstantsFunction: (config: TanstackQueryConfig) => {
      const {
        request: { path, method, query, payload },
      } = route;

      if (!path || !method) {
        return config;
      }

      const pathSegments = path
        .split('/')
        .filter((segment) => segment && segment !== 'api');
      const firstSegment = pathSegments[0];
      const firstSegmentLiteral =
        firstSegment !== undefined && !firstSegment.match(/\$\{/)
          ? `'${firstSegment}'`
          : `'${route.raw.moduleName}'`;
      const queryFnNameLiteral = `'${routeConfig.request.functionName}'`;
      const rootKey = `[${firstSegmentLiteral}, ${queryFnNameLiteral}]`;

      // undefined인 요소는 key에 포함하지 않음 (TanStack Query는 key 길이 비교를 먼저 하므로)
      const required = routeConfig.request.parameters.arguments.required;
      const hasOptionalParams = Boolean(query) && !required.includes('params');
      const hasOptionalPayload = Boolean(payload) && !required.includes('payload');
      const variableParts = required
        .map((arg) => {
          if (arg === 'params') return '...(params ? [params] : [])';
          if (arg === 'payload') return '...(payload ? [payload] : [])';
          return `...(${arg} != null ? [${arg}] : [])`;
        })
        .join(', ');
      let variablePartsExpression = hasOptionalParams
        ? (variableParts ? `${variableParts}, ...(params ? [params] : [])` : '...(params ? [params] : [])')
        : variableParts;
      if (hasOptionalPayload) {
        variablePartsExpression = variablePartsExpression
          ? `${variablePartsExpression}, ...(payload ? [payload] : [])`
          : '...(payload ? [payload] : [])';
      }

      return produce(config, (draft) => {
        draft.query.queryKeyRootKey = rootKey;
        draft.query.queryKeyVariablePartsExpression = variablePartsExpression;
        draft.query.queryKeyConstanstFunction = ''; // 템플릿에서 rootKey/queryKey 구조로 생성
      });
    },
    setMutationKeyConstantsContent: (config: TanstackQueryConfig) => {
      const buildMutationKeyConstanstContent = ({ request: { path = '' } }: ParsedRoute) => {
        return `[${compact(path.split('/'))
          .map((segment) => `'${segment.replace(/[${}]/g, '')}'`)
          .join(', ')}]`;
      };

      return produce(config, (draft) => {
        draft.mutation.mutationKeyConstanstContent = buildMutationKeyConstanstContent(route);
      });
    },
  };
}
