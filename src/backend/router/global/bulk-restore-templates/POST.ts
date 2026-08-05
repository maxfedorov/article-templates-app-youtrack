import {bulkRestoreTemplates} from '../../../utils/templates';

/**
 * @zod-to-schema
 */
export type GlobalBulkRestoreTemplatesPOSTReq = {
  ids: string[];
};

/**
 * @zod-to-schema
 */
export type GlobalBulkRestoreTemplatesPOSTRes = {
  success?: boolean;
  /** How many templates were actually restored -- the rest were skipped for lack of permission. */
  count?: number;
  error?: string;
};

/** Restores every trashed template the caller may restore in a single request. */
function handle(ctx: CtxPost<GlobalBulkRestoreTemplatesPOSTReq, GlobalBulkRestoreTemplatesPOSTRes, never, "global">): void {
  const result = bulkRestoreTemplates(ctx, ctx.request.json().ids);
  ctx.response.code = result.code;
  ctx.response.json(result.body);
}

export default handle;

export type Handle = typeof handle;
