import {
  useQuery,
  type QueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseFunctionError } from "@/services/api/errors";
import { logger } from "@/utils/logger";
import type {
  StyleRecommendationRequest,
  StyleRecommendationResponse,
  StyleRecommendationResult,
} from "@/types/styles";

const SERVICE_CONTEXT = "StyleRecommendationsService";
const SUGGEST_STYLES_FUNCTION = "suggest-styles" as const;
const STYLE_RECOMMENDATIONS_QUERY_KEY = ["ai", "style-recommendations"] as const;

const sanitiseRequestPayload = (
  payload: StyleRecommendationRequest,
): StyleRecommendationRequest => {
  const sanitise = (value?: string) => value?.trim() || undefined;
  const sanitisedTags = payload.currentTags
    ?.map(tag => tag.trim())
    .filter((tag): tag is string => Boolean(tag));

  return {
    mood: sanitise(payload.mood),
    genre: sanitise(payload.genre),
    context: sanitise(payload.context),
    currentTags: sanitisedTags && sanitisedTags.length > 0 ? sanitisedTags : undefined,
  };
};

const hasRequestPayload = (payload: StyleRecommendationRequest): boolean => {
  return Boolean(
    (payload.mood && payload.mood.trim().length > 0) ||
      (payload.genre && payload.genre.trim().length > 0) ||
      (payload.context && payload.context.trim().length > 0) ||
      (payload.currentTags && payload.currentTags.length > 0),
  );
};

const createTagsKey = (tags?: string[]) =>
  tags && tags.length > 0 ? [...tags].sort().join("|") : null;

const createStyleRecommendationsQueryKey = (
  payload: StyleRecommendationRequest,
) => [
  ...STYLE_RECOMMENDATIONS_QUERY_KEY,
  payload.mood ?? null,
  payload.genre ?? null,
  payload.context ?? null,
  createTagsKey(payload.currentTags),
] as const;

export type StyleRecommendationsQueryKey = ReturnType<
  typeof createStyleRecommendationsQueryKey
>;

export const fetchStyleRecommendations = async (
  payload: StyleRecommendationRequest,
): Promise<StyleRecommendationResult> => {
  const sanitisedPayload = sanitiseRequestPayload(payload);
  const context = `${SERVICE_CONTEXT}.fetch`;

  try {
    const { data, error } = await supabase.functions.invoke<StyleRecommendationResponse>(
      SUGGEST_STYLES_FUNCTION,
      {
        body: sanitisedPayload,
      },
    );

    if (error) {
      return handleSupabaseFunctionError(
        error,
        "Не удалось получить рекомендации по стилям",
        context,
        { payload: sanitisedPayload },
      );
    }

    if (!data?.suggestions) {
      logger.warn("Сервис suggest-styles вернул пустой ответ", context, {
        payload: sanitisedPayload,
      });
      throw new Error("Сервис рекомендаций вернул пустой ответ");
    }

    logger.debug("Получены рекомендации по стилям", context, {
      tags: data.suggestions.tags,
      instruments: data.suggestions.instruments,
    });

    return data.suggestions;
  } catch (error) {
    const handledError = error instanceof Error ? error : new Error(String(error));

    logger.error(
      "Ошибка при получении рекомендаций по стилям",
      handledError,
      context,
      { payload: sanitiseRequestPayload(payload) },
    );

    throw handledError;
  }
};

export const useStyleRecommendations = (
  payload: StyleRecommendationRequest,
  options: UseQueryOptions<StyleRecommendationResult, Error> = {},
): UseQueryResult<StyleRecommendationResult, Error> => {
  const sanitisedPayload = sanitiseRequestPayload(payload);
  const enabled = hasRequestPayload(sanitisedPayload);

  return useQuery({
    queryKey: createStyleRecommendationsQueryKey(sanitisedPayload),
    queryFn: () => fetchStyleRecommendations(sanitisedPayload),
    enabled: options.enabled ?? enabled,
    staleTime: options.staleTime ?? 1000 * 60 * 5,
    gcTime: options.gcTime ?? 1000 * 60 * 30,
    ...options,
  });
};

export const prefetchStyleRecommendations = async (
  queryClient: QueryClient,
  payload: StyleRecommendationRequest,
) => {
  const sanitisedPayload = sanitiseRequestPayload(payload);

  if (!hasRequestPayload(sanitisedPayload)) {
    return;
  }

  await queryClient.prefetchQuery({
    queryKey: createStyleRecommendationsQueryKey(sanitisedPayload),
    queryFn: () => fetchStyleRecommendations(sanitisedPayload),
    staleTime: 1000 * 60 * 5,
  });
};
