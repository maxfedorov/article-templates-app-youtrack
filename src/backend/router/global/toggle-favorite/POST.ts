import {toggleFavorite} from '../../../utils/templates';

/**
 * @zod-to-schema
 */
export type GlobalToggleFavoritePOSTReq = {
  id: string;
};

/**
 * @zod-to-schema
 */
export type GlobalToggleFavoritePOSTRes = {
  favorites?: string[];
  error?: string;
};

/** Adds a template to the caller's favourites, or removes it if it is already there. */
function handle(ctx: CtxPost<GlobalToggleFavoritePOSTReq, GlobalToggleFavoritePOSTRes, never, "global">): void {
  const result = toggleFavorite(ctx, ctx.request.json().id);
  ctx.response.code = result.code;
  ctx.response.json(result.body);
}

export default handle;

export type Handle = typeof handle;
