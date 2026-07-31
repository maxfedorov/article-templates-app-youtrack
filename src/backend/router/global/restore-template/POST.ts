import {Template} from '@/common/types';
import {restoreTemplate} from '../../../utils/templates';

/**
 * @zod-to-schema
 */
export type GlobalRestoreTemplatePOSTReq = {
  id: string;
};

/**
 * @zod-to-schema
 */
export type GlobalRestoreTemplatePOSTRes = {
  template?: Template;
  error?: string;
};

/** Moves a template back out of the trash. */
function handle(ctx: CtxPost<GlobalRestoreTemplatePOSTReq, GlobalRestoreTemplatePOSTRes, never, "global">): void {
  const result = restoreTemplate(ctx, ctx.request.json().id);
  ctx.response.code = result.code;
  ctx.response.json(result.body);
}

export default handle;

export type Handle = typeof handle;
