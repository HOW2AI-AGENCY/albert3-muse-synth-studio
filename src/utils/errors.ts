// Общие утилиты обработки ошибок сети и отмененных запросов
// Позволяет единообразно подавлять ложные критические ошибки при навигации/HMR

export function isNetworkAbortError(error: unknown): boolean {
  const msg = typeof error === 'string' ? error : (error as any)?.message || (error as any)?.toString?.() || '';
  const name = (error as any)?.name || '';
  const code = (error as any)?.code || '';

  const m = String(msg).toLowerCase();
  const n = String(name).toLowerCase();
  const c = String(code).toLowerCase();

  // Распространенные сигнатуры для отмененных/сетевых ошибок в браузере и Supabase
  return (
    n === 'aborterror' ||
    m.includes('aborterror') ||
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('net::err_aborted') ||
    c === 'err_aborted' ||
    (typeof (error as any)?.status === 'number' && (error as any)?.status === 0)
  );
}

export function isTransientNetworkError(error: unknown): boolean {
  if (isNetworkAbortError(error)) return true;

  const msg = typeof error === 'string' ? error : (error as any)?.message || '';
  const m = String(msg).toLowerCase();

  // Временные сетевые сбои, которые не должны считаться критическими
  return (
    m.includes('timeout') ||
    m.includes('temporarily unavailable') ||
    m.includes('rate limit') ||
    m.includes('too many requests') ||
    m.includes('503') ||
    m.includes('502')
  );
}