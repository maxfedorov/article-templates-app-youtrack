import {importPredefinedTemplates} from '../../../utils/templates';

/** The endpoint takes no payload: it always imports every predefined template that is missing. */
export type GlobalImportPredefinedTemplatesPOSTReq = Record<string, never>;

/**
 * @zod-to-schema
 */
export type GlobalImportPredefinedTemplatesPOSTRes = {
  success: boolean;
  importedCount: number;
};

/** Copies the built-in templates into shared storage, skipping names that are already taken. */
function handle(
  ctx: CtxPost<GlobalImportPredefinedTemplatesPOSTReq, GlobalImportPredefinedTemplatesPOSTRes, never, "global">
): void {
  ctx.response.json(importPredefinedTemplates(ctx));
}

export default handle;

export type Handle = typeof handle;
