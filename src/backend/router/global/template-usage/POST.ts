import {trackTemplateUsage} from '../../../utils/templates';

/**
 * @zod-to-schema
 */
export type GlobalTemplateUsagePOSTReq = {
  id: string;
};

/**
 * @zod-to-schema
 */
export type GlobalTemplateUsagePOSTRes = {
  success?: boolean;
  error?: string;
};

/** Counts one more use of a template. */
function handle(ctx: CtxPost<GlobalTemplateUsagePOSTReq, GlobalTemplateUsagePOSTRes, never, "global">): void {
  const result = trackTemplateUsage(ctx, ctx.request.json().id);
  ctx.response.code = result.code;
  ctx.response.json(result.body);
}

export default handle;

export type Handle = typeof handle;
