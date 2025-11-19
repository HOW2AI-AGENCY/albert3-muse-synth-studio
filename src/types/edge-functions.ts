export interface EdgeFunctionResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    errorCode?: string;
    result?: T;
}
