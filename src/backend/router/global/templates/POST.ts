import {Template} from '@/common/types';
import {saveTemplate} from '../../../utils/templates';

/**
 * The template is nested on purpose: a payload with a top-level `projectId` makes the generated
 * API client re-route the call through the project scope.
 *
 * @zod-to-schema
 */
export type GlobalTemplatesPOSTReq = {
  template: Template;
};

/**
 * @zod-to-schema
 */
export type GlobalTemplatesPOSTRes = {
  template?: Template;
  error?: string;
};

/** Creates a template, or overwrites the existing one with the same id. */
function handle(ctx: CtxPost<GlobalTemplatesPOSTReq, GlobalTemplatesPOSTRes, never, "global">): void {
  const result = saveTemplate(ctx, ctx.request.json().template);
  ctx.response.code = result.code;
  ctx.response.json(result.body);
}

export default handle;

export type Handle = typeof handle;
