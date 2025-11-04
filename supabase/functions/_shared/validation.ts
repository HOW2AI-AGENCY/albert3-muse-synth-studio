/**
 * Модуль валидации входных данных для Edge Functions
 * Обеспечивает безопасность и целостность данных
 */

export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationException extends Error {
  public errors: ValidationError[];
  
  constructor(errors: ValidationError[]) {
    super('Validation failed');
    this.errors = errors;
    this.name = 'ValidationException';
  }
}

/**
 * Строгая сигнатура функции-валидатора
 * Принимает значение и имя поля, возвращает ошибку или null
 */
export type ValidatorFn = (value: unknown, fieldName: string) => ValidationError | null;

/**
 * Базовые валидаторы
 */
export const validators = {
  required: (value: unknown, fieldName: string): ValidationError | null => {
    if (value === undefined || value === null || value === '') {
      return { field: fieldName, message: `${fieldName} обязательно для заполнения` };
    }
    return null;
  },

  string: (value: unknown, fieldName: string): ValidationError | null => {
    if (typeof value !== 'string') {
      return { field: fieldName, message: `${fieldName} должно быть строкой` };
    }
    return null;
  },

  minLength: (minLen: number) => (value: string, fieldName: string): ValidationError | null => {
    if (value.length < minLen) {
      return { field: fieldName, message: `${fieldName} должно содержать минимум ${minLen} символов` };
    }
    return null;
  },

  maxLength: (maxLen: number) => (value: string, fieldName: string): ValidationError | null => {
    if (value.length > maxLen) {
      return { field: fieldName, message: `${fieldName} не должно превышать ${maxLen} символов` };
    }
    return null;
  },

  boolean: (value: unknown, fieldName: string): ValidationError | null => {
    if (typeof value !== 'boolean') {
      return { field: fieldName, message: `${fieldName} должно быть булевым значением` };
    }
    return null;
  },

  array: (value: unknown, fieldName: string): ValidationError | null => {
    if (!Array.isArray(value)) {
      return { field: fieldName, message: `${fieldName} должно быть массивом` };
    }
    return null;
  },

  object: (value: unknown, fieldName: string): ValidationError | null => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { field: fieldName, message: `${fieldName} должно быть объектом` };
    }
    return null;
  },

  uuid: (value: string, fieldName: string): ValidationError | null => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return { field: fieldName, message: `${fieldName} должно быть валидным UUID` };
    }
    return null;
  },

  sanitizeString: (value: string): string => {
    // Удаляем потенциально опасные символы
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  },

  sanitizeHtml: (value: string): string => {
    // Базовая санитизация HTML
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
};

/**
 * Схемы валидации для различных API
 */
export const validationSchemas = {
  generateMusic: {
    trackId: [validators.required, validators.string, validators.uuid],
    prompt: [validators.required, validators.string, validators.minLength(10), validators.maxLength(2000)]
  },

  generateLyrics: {
    prompt: [validators.required, validators.string, validators.minLength(10), validators.maxLength(2000)],
    trackId: [validators.string, validators.uuid],
    metadata: [validators.object]
  },

  syncLyricsJob: {
    jobId: [validators.required, validators.string, validators.uuid],
    forceRefresh: [validators.boolean]
  },

  separateStems: {
    trackId: [validators.required, validators.string, validators.uuid],
    versionId: [validators.string, validators.uuid],
    separationMode: [validators.required, validators.string, validators.minLength(3), validators.maxLength(50)]
  },

  syncStemJob: {
    trackId: [validators.required, validators.string, validators.uuid],
    versionId: [validators.string, validators.uuid],
    taskId: [validators.string, validators.minLength(8), validators.maxLength(128)],
    separationMode: [validators.string, validators.minLength(3), validators.maxLength(50)],
    forceRefresh: [validators.boolean]
  },

  analyzeReferenceAudio: {
    audioUrl: [validators.required, validators.string, validators.minLength(10), validators.maxLength(2000)],
    trackId: [validators.string, validators.uuid]
  }
};

/**
 * Validates data according to schema - only validates fields present in data
 */
export type ValidationSchema = Record<string, ValidatorFn[]>;

export const validateData = (data: Record<string, unknown>, schema: ValidationSchema): void => {
  const errors: ValidationError[] = [];

  for (const [fieldName, validatorFunctions] of Object.entries(schema)) {
    const value = data[fieldName];
    
    // Skip validation if field is not present (unless it's required)
    if (value === undefined) {
      const hasRequired = validatorFunctions.some(fn => fn === validators.required);
      if (!hasRequired) continue;
    }

    for (const validatorFn of validatorFunctions) {
      const error = validatorFn(value, fieldName);
      if (error) {
        errors.push(error);
        break;
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationException(errors);
  }
};

/**
 * Санитизирует входные данные
 */
export const sanitizeInput = (data: any): any => {
  if (typeof data === 'string') {
    return validators.sanitizeString(data);
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return data;
};

/**
 * Middleware для валидации запросов
 */
export const validateRequest = async (
  req: Request,
  schema: ValidationSchema
): Promise<Record<string, unknown>> => {
  try {
    const rawData = await req.json();
    const sanitizedData = sanitizeInput(rawData) as Record<string, unknown>;
    validateData(sanitizedData, schema);
    return sanitizedData;
  } catch (error) {
    if (error instanceof ValidationException) {
      throw error;
    }
    throw new ValidationException([
      { field: 'request', message: 'Неверный формат JSON данных' }
    ]);
  }
};