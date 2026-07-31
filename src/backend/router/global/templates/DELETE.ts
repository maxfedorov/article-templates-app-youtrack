import {deleteTemplate} from '../../../utils/templates';

/**
 * @zod-to-schema
 */
export type GlobalTemplatesDELETEReq = {
  id?: string;
};

/**
 * @zod-to-schema
 */
export type GlobalTemplatesDELETERes = {
  success?: boolean;
  error?: string;
};

/** Moves a template to the trash. */
function handle(ctx: CtxDelete<GlobalTemplatesDELETERes, GlobalTemplatesDELETEReq, "global">): void {
  const result = deleteTemplate(ctx, ctx.request.getParameter('id'));
  ctx.response.code = result.code;
  ctx.response.json(result.body);
}

export default handle;

export type Handle = typeof handle;
