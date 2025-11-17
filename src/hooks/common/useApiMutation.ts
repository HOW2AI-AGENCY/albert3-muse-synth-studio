import { useMutation, type UseMutationResult, type UseMutationOptions } from '@tanstack/react-query';

/**
 * Обертка над useMutation от TanStack для стандартизации API мутаций в приложении.
 *
 * @param mutationFn Асинхронная функция, выполняющая мутацию.
 * @param options Дополнительные опции для useMutation.
 *
 * @returns Стандартный результат useMutation с унифицированной обработкой ошибок.
 */
export const useApiMutation = <TData = unknown, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>,
): UseMutationResult<TData, TError, TVariables> => {
  return useMutation<TData, TError, TVariables>({
    mutationFn,
    ...options,
  });
};
