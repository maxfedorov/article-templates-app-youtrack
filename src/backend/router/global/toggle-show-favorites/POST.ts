import {toggleShowFavorites} from '../../../utils/templates';

/** The endpoint takes no payload: it flips the stored flag. */
export type GlobalToggleShowFavoritesPOSTReq = Record<string, never>;

/**
 * @zod-to-schema
 */
export type GlobalToggleShowFavoritesPOSTRes = {
  showFavoritesOnly: boolean;
};

/** Switches the template list between "all templates" and "favourites only". */
function handle(
  ctx: CtxPost<GlobalToggleShowFavoritesPOSTReq, GlobalToggleShowFavoritesPOSTRes, never, "global">
): void {
  ctx.response.json({showFavoritesOnly: toggleShowFavorites(ctx)});
}

export default handle;

export type Handle = typeof handle;
