import {Template} from '@/common/types';
import {listTemplates} from '../../../utils/templates';

/**
 * @zod-to-schema
 */
export type GlobalTemplatesGETReq = {
  /** Projects the caller can create articles in: `all`, or a comma-separated list of short names. */
  projects?: string;
};

/**
 * @zod-to-schema
 */
export type GlobalTemplatesGETRes = {
  templates: Template[];
};

/** Lists the active templates visible to the caller. */
function handle(ctx: CtxGet<GlobalTemplatesGETRes, GlobalTemplatesGETReq, "global">): void {
  ctx.response.json({templates: listTemplates(ctx, ctx.request.getParameter('projects'))});
}

export default handle;

export type Handle = typeof handle;
