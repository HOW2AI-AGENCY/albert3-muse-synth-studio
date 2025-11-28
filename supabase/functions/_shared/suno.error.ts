export class SunoApiError extends Error {
  constructor(
    message: string,
    readonly details: {
      endpoint: string;
      status?: number;
      body?: string;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "SunoApiError";
  }
}
