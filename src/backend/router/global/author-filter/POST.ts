import {setAuthorFilter} from '../../../utils/templates';

/**
 * @zod-to-schema
 */
export type GlobalAuthorFilterPOSTReq = {
  authorIds: string[];
};

/**
 * @zod-to-schema
 */
export type GlobalAuthorFilterPOSTRes = {
  authorFilter: string[];
};

/** Stores the authors the caller filters the template list by. */
function handle(ctx: CtxPost<GlobalAuthorFilterPOSTReq, GlobalAuthorFilterPOSTRes, never, "global">): void {
  ctx.response.json({authorFilter: setAuthorFilter(ctx, ctx.request.json().authorIds)});
}

export default handle;

export type Handle = typeof handle;
