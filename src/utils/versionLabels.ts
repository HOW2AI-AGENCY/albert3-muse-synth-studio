/**
 * Унифицированная система меток для версий треков
 * Phase 1.1 - Единообразие меток
 */

export interface VersionLabelOptions {
  versionNumber?: number;
  isMaster?: boolean;
  short?: boolean;
}

/**
 * Получить полную метку версии
 * @example getVersionLabel({ versionNumber: 1 }) => "V1"
 * @example getVersionLabel({ versionNumber: 2 }) => "V2"
 */
export const getVersionLabel = (options: VersionLabelOptions): string => {
  const { versionNumber = 1 } = options;
  
  // ✅ НОВАЯ ЛОГИКА: Только "V{number}"
  return `V${versionNumber}`;
};

/**
 * Получить короткую метку версии (для UI с ограниченным пространством)
 * @example getVersionShortLabel({ versionNumber: 1 }) => "V1"
 * @example getVersionShortLabel({ versionNumber: 2 }) => "V2"
 */
export const getVersionShortLabel = (options: VersionLabelOptions): string => {
  const { versionNumber = 1 } = options;
  return `V${versionNumber}`;
};

/**
 * Получить описание версии для tooltip/aria-label
 */
export const getVersionDescription = (options: VersionLabelOptions): string => {
  const { versionNumber = 1, isMaster = false } = options;
  
  if (isMaster) {
    return `V${versionNumber} (мастер-версия)`;
  }
  
  return `V${versionNumber}`;
};
