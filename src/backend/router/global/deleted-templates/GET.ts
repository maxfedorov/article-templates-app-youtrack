import {Template} from '@/common/types';
import {listDeletedTemplates} from '../../../utils/templates';

/**
 * @zod-to-schema
 */
export type GlobalDeletedTemplatesGETReq = {
  /** Projects the caller can create articles in: `all`, or a comma-separated list of short names. */
  projects?: string;
};

/**
 * @zod-to-schema
 */
export type GlobalDeletedTemplatesGETRes = {
  templates: Template[];
};

/** Lists the trashed templates visible to the caller. */
function handle(ctx: CtxGet<GlobalDeletedTemplatesGETRes, GlobalDeletedTemplatesGETReq, "global">): void {
  ctx.response.json({templates: listDeletedTemplates(ctx, ctx.request.getParameter('projects'))});
}

export default handle;

export type Handle = typeof handle;
