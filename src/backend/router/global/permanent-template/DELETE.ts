import {permanentDeleteTemplate} from '../../../utils/templates';

/**
 * @zod-to-schema
 */
export type GlobalPermanentTemplateDELETEReq = {
  id?: string;
};

/**
 * @zod-to-schema
 */
export type GlobalPermanentTemplateDELETERes = {
  success?: boolean;
  error?: string;
};

/** Removes a template from the trash for good. */
function handle(ctx: CtxDelete<GlobalPermanentTemplateDELETERes, GlobalPermanentTemplateDELETEReq, "global">): void {
  const result = permanentDeleteTemplate(ctx, ctx.request.getParameter('id'));
  ctx.response.code = result.code;
  ctx.response.json(result.body);
}

export default handle;

export type Handle = typeof handle;
