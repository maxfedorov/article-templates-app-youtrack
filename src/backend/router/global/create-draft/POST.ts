import {createDraftFromTemplate} from '../../../utils/templates';

/**
 * The project is passed as `projectKey`, not `projectId`: a payload with a top-level `projectId`
 * makes the generated API client re-route the call through the project scope.
 *
 * @zod-to-schema
 */
export type GlobalCreateDraftPOSTReq = {
  summary?: string;
  content?: string;
  projectKey: string;
  parentArticleId?: string;
  /** Usage of this template is counted when the draft is created. */
  templateId?: string;
};

/**
 * @zod-to-schema
 */
export type GlobalCreateDraftPOSTRes = {
  id?: string;
  url?: string;
  error?: string;
};

/** Creates an article draft pre-filled from a template. */
function handle(ctx: CtxPost<GlobalCreateDraftPOSTReq, GlobalCreateDraftPOSTRes, never, "global">): void {
  const result = createDraftFromTemplate(ctx, ctx.request.json());
  ctx.response.code = result.code;
  ctx.response.json(result.body);
}

export default handle;

export type Handle = typeof handle;
