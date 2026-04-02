/**
 * Logs de erro estruturados para observabilidade no Connect (consola; prontos para futuro envio a um backend).
 */

export type ConnectObservabilityFeature =
  | 'upload'
  | 'call'
  | 'poll'
  | 'presence'
  | 'messages';

export function serializeConnectError(error: unknown): Record<string, unknown> {
  if (error && typeof error === 'object') {
    const o = error as Record<string, unknown>;
    if (typeof o.message === 'string' && 'code' in o) {
      return {
        type: 'SupabaseError',
        message: o.message,
        code: o.code,
        details: o.details,
        hint: o.hint,
      };
    }
  }
  if (error instanceof Error) {
    return {
      type: 'Error',
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { type: 'unknown', value: String(error) };
}

export function logConnectError(
  feature: ConnectObservabilityFeature,
  message: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const payload: Record<string, unknown> = {
    scope: 'Connect',
    feature,
    message,
    error: serializeConnectError(error),
    ts: new Date().toISOString(),
  };
  if (context && Object.keys(context).length > 0) {
    payload.context = context;
  }
  console.error(`[Connect:${feature}]`, payload);
}
