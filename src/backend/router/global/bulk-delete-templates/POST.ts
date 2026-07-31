import {bulkDeleteTemplates} from '../../../utils/templates';

/**
 * @zod-to-schema
 */
export type GlobalBulkDeleteTemplatesPOSTReq = {
  ids: string[];
};

/**
 * @zod-to-schema
 */
export type GlobalBulkDeleteTemplatesPOSTRes = {
  success?: boolean;
  /** How many templates were actually trashed -- the rest were skipped for lack of permission. */
  count?: number;
  error?: string;
};

/** Moves every template the caller may delete to the trash in a single request. */
function handle(ctx: CtxPost<GlobalBulkDeleteTemplatesPOSTReq, GlobalBulkDeleteTemplatesPOSTRes, never, "global">): void {
  const result = bulkDeleteTemplates(ctx, ctx.request.json().ids);
  ctx.response.code = result.code;
  ctx.response.json(result.body);
}

export default handle;

export type Handle = typeof handle;
