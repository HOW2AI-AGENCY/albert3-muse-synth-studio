import { SunoGenerationParams } from "../types/generation.ts";

/**
 * Определяет общий контракт для всех AI-провайдеров генерации музыки.
 * Это позволяет системе работать с различными сервисами (Suno, Replicate) через единый интерфейс.
 */
export interface IGenerationProvider {
  /**
   * Запускает процесс генерации музыки.
   * @param params Параметры для генерации, специфичные для провайдера.
   * @returns Результат операции, обычно включающий идентификатор задачи.
   */
  generate(params: SunoGenerationParams): Promise<any>;

  /**
   * (Опционально) Получает статус задачи генерации.
   * @param taskId Идентификатор задачи.
   * @returns Статус и текущие результаты задачи.
   */
  getStatus?(taskId: string): Promise<any>;
}
