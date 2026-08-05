import {setProjectFilter} from '../../../utils/templates';

/**
 * The selected projects are passed as `projectIds` (plural): a payload with a top-level
 * `projectId` makes the generated API client re-route the call through the project scope.
 *
 * @zod-to-schema
 */
export type GlobalProjectFilterPOSTReq = {
  projectIds: string[];
};

/**
 * @zod-to-schema
 */
export type GlobalProjectFilterPOSTRes = {
  projectFilter: string[];
};

/** Stores the projects the caller filters the template list by. */
function handle(ctx: CtxPost<GlobalProjectFilterPOSTReq, GlobalProjectFilterPOSTRes, never, "global">): void {
  ctx.response.json({projectFilter: setProjectFilter(ctx, ctx.request.json().projectIds)});
}

export default handle;

export type Handle = typeof handle;
