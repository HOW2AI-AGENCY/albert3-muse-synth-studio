/**
 * Утилиты для форматирования данных
 */

/**
 * Форматирует длительность в секундах в формат MM:SS
 * @param seconds - Длительность в секундах
 * @returns Отформатированная строка в формате MM:SS или "—" если значение не задано
 */
export const formatDuration = (seconds?: number): string => {
  if (!seconds || isNaN(seconds)) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Форматирует время в секундах в формат MM:SS для аудиоплеера
 * @param seconds - Время в секундах
 * @returns Отформатированная строка в формате MM:SS или "0:00" если значение не задано
 */
export const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Форматирует дату в локальном формате
 * @param date - Дата в виде строки или объекта Date
 * @returns Отформатированная дата
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) {
    return "";
  }
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    return "";
  }
  return dateObj.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * Форматирует размер файла в человекочитаемый формат
 * @param bytes - Размер в байтах
 * @returns Отформатированная строка с единицами измерения
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Б";
  
  const k = 1024;
  const sizes = ["Б", "КБ", "МБ", "ГБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Форматирует число с разделителями тысяч
 * @param num - Число для форматирования
 * @returns Отформатированная строка с разделителями
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString("ru-RU");
};