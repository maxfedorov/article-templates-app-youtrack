import {readSettings} from '../../../utils/templates';

/**
 * @zod-to-schema
 */
export type GlobalSettingsGETRes = {
  /** How long a trashed template is kept before it is purged. */
  purgeIntervalDays: number;
};

/** Reads the app settings the widgets need. */
function handle(ctx: CtxGet<GlobalSettingsGETRes, never, "global">): void {
  ctx.response.json(readSettings(ctx));
}

export default handle;

export type Handle = typeof handle;
