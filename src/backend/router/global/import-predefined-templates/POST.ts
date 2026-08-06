import {importPredefinedTemplates} from '../../../utils/templates';

/** The endpoint takes no payload: it always imports every predefined template that is missing. */
export type GlobalImportPredefinedTemplatesPOSTReq = Record<string, never>;

/**
 * @zod-to-schema
 */
export type GlobalImportPredefinedTemplatesPOSTRes = {
  success?: boolean;
  importedCount?: number;
  error?: string;
};

/**
 * Copies the built-in templates into shared storage, skipping names that are already taken.
 *
 * Authorization lives in the handler (see `canImportPredefined`): the caller must be a project
 * admin (`UPDATE_PROJECT` in any project) or a global app admin. A declarative `withPermissions`
 * gate cannot express this -- on a GLOBAL endpoint YouTrack checks the permission at instance
 * scope, which would demand `UPDATE_PROJECT` everywhere and lock out ordinary project admins.
 */
function handle(
  ctx: CtxPost<GlobalImportPredefinedTemplatesPOSTReq, GlobalImportPredefinedTemplatesPOSTRes, never, "global">
): void {
  const result = importPredefinedTemplates(ctx);
  ctx.response.code = result.code;
  ctx.response.json(result.body);
}

export default handle;

export type Handle = typeof handle;
