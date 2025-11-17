import { useQuery, type UseQueryResult, type UseQueryOptions } from '@tanstack/react-query';

/**
 * Обертка над useQuery от TanStack для стандартизации API запросов в приложении.
 *
 * @param queryKey Ключ запроса для кеширования.
 * @param queryFn Асинхронная функция, выполняющая запрос.
 * @param options Дополнительные опции для useQuery.
 *
 * @returns Стандартный результат useQuery с унифицированной обработкой ошибок.
 */
export const useApiQuery = <TData = unknown, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData>, 'queryKey' | 'queryFn'>,
): UseQueryResult<TData, TError> => {
  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    ...options,
  });
};
