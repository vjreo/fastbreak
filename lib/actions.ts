/**
 * Action result helpers for Server Actions.
 * Used for consistent toast feedback from form submissions.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export function createSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function createError(message: string): ActionResult<never> {
  return { success: false, error: message };
}
