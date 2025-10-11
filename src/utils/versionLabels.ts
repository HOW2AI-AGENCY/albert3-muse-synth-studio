/**
 * Унифицированная система меток для версий треков
 * Phase 1.1 - Единообразие меток
 */

export interface VersionLabelOptions {
  versionNumber?: number;
  isOriginal?: boolean;
  isMaster?: boolean;
  short?: boolean;
}

/**
 * Получить полную метку версии
 * @example getVersionLabel({ versionNumber: 0, isOriginal: true }) => "Оригинал"
 * @example getVersionLabel({ versionNumber: 1, isMaster: true }) => "⭐ Вариант 1"
 * @example getVersionLabel({ versionNumber: 2 }) => "Вариант 2"
 */
export const getVersionLabel = (options: VersionLabelOptions): string => {
  const { versionNumber = 0, isOriginal = false, isMaster = false } = options;
  
  // Оригинальная версия (versionNumber === 0 или явный флаг)
  if (isOriginal || versionNumber === 0) {
    return isMaster ? "⭐ Оригинал" : "Оригинал";
  }
  
  // Версии > 0
  const prefix = isMaster ? "⭐ " : "";
  return `${prefix}Вариант ${versionNumber}`;
};

/**
 * Получить короткую метку версии (для UI с ограниченным пространством)
 * @example getVersionShortLabel({ versionNumber: 0, isOriginal: true }) => "Ориг"
 * @example getVersionShortLabel({ versionNumber: 1, isMaster: true }) => "⭐V1"
 * @example getVersionShortLabel({ versionNumber: 2 }) => "V2"
 */
export const getVersionShortLabel = (options: VersionLabelOptions): string => {
  const { versionNumber = 0, isOriginal = false, isMaster = false } = options;
  
  // Оригинальная версия
  if (isOriginal || versionNumber === 0) {
    return isMaster ? "⭐Ориг" : "Ориг";
  }
  
  // Версии > 0
  const prefix = isMaster ? "⭐" : "";
  return `${prefix}V${versionNumber}`;
};

/**
 * Получить описание версии для tooltip/aria-label
 */
export const getVersionDescription = (options: VersionLabelOptions): string => {
  const baseLabel = getVersionLabel(options);
  
  if (options.isMaster) {
    return `${baseLabel} (активная мастер-версия)`;
  }
  
  return baseLabel;
};

/**
 * Проверить, является ли версия оригинальной
 */
export const isOriginalVersion = (versionNumber?: number, isOriginal?: boolean): boolean => {
  return isOriginal === true || versionNumber === 0;
};
