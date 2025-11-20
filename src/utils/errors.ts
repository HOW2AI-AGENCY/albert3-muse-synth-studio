// Общие утилиты обработки ошибок сети и отмененных запросов
// Позволяет единообразно подавлять ложные критические ошибки при навигации/HMR

interface ErrorWithMessage {
  message?: string;
  name?: string;
  code?: string;
  status?: number;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('message' in error || 'name' in error || 'code' in error || 'status' in error)
  );
}

export function isNetworkAbortError(error: unknown): boolean {
  if (isErrorWithMessage(error)) {
    const msg = String(error.message || '').toLowerCase();
    const name = String(error.name || '').toLowerCase();
    const code = String(error.code || '').toLowerCase();

    return (
      name === 'aborterror' ||
      msg.includes('aborterror') ||
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('net::err_aborted') ||
      code === 'err_aborted' ||
      (typeof error.status === 'number' && error.status === 0)
    );
  }

  const msg = typeof error === 'string' ? error.toLowerCase() : '';
  return msg.includes('aborterror');
}

export function isTransientNetworkError(error: unknown): boolean {
  if (isNetworkAbortError(error)) return true;

  if (isErrorWithMessage(error)) {
    const msg = String(error.message || '').toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('temporarily unavailable') ||
      msg.includes('rate limit') ||
      msg.includes('too many requests') ||
      msg.includes('503') ||
      msg.includes('502')
    );
  }
  
  const msg = typeof error === 'string' ? error.toLowerCase() : '';
  return (
    msg.includes('timeout') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('503') ||
    msg.includes('502')
  );
}