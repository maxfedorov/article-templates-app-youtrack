import {readUserPreferences} from '../../../utils/templates';

/**
 * @zod-to-schema
 */
export type GlobalUserPreferencesGETRes = {
  favorites: string[];
  showFavoritesOnly: boolean;
  authorFilter: string[];
  projectFilter: string[];
};

/** Reads the caller's favourites and list filters. */
function handle(ctx: CtxGet<GlobalUserPreferencesGETRes, never, "global">): void {
  ctx.response.json(readUserPreferences(ctx));
}

export default handle;

export type Handle = typeof handle;
