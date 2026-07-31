/**
 * Uniform result shape for backend operations.
 *
 * Handlers can only report an error by setting `ctx.response.code` before sending the body, so
 * every operation returns both at once and the route file just copies them over.
 */

const OK = 200;

/** HTTP status code plus the body to send with it. */
export interface OpResult<T> {
  code: number;
  body: T;
}

/** Every response type carries an optional `error`, since `ctx.response.json` is typed. */
export interface WithError {
  error?: string;
}

export const ok = <T>(body: T): OpResult<T> => ({code: OK, body});

export const fail = <T extends WithError>(code: number, error: string): OpResult<T> => ({
  code,
  body: {error} as T
});
