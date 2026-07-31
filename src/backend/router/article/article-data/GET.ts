import {readArticleData} from '../../../utils/article';

/**
 * @zod-to-schema
 */
export type ArticleArticleDataGETRes = {
  summary?: string;
  content?: string;
  projectId?: string;
  url?: string;
  error?: string;
};

/** Reads the article (or draft) the widget was opened from. */
function handle(ctx: CtxGet<ArticleArticleDataGETRes, never, "article">): void {
  const result = readArticleData(ctx);
  ctx.response.code = result.code;
  ctx.response.json(result.body);
}

export default handle;

export type Handle = typeof handle;
