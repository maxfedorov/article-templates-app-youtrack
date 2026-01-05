import * as entities from '@jetbrains/youtrack-scripting-api/entities';
import {Context, YTProject, YTUser, YTArticle} from './types-backend';

interface CreateDraftRequest {
  summary: string;
  content: string;
  parentArticleId?: string;
  templateId?: string;
}

interface Template {
  id: string;
  usageCount?: number;
}

class TemplateStore {
  constructor(private ctx: Context) {}

  private parse(json: string | undefined): Template[] {
    try {
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  }

  get data() {
    return {
      shared: this.parse(this.ctx.globalStorage.extensionProperties.templates),
      private: this.parse(this.ctx.currentUser.extensionProperties.templates)
    };
  }

  save(data: { shared?: Template[], private?: Template[] }) {
    const {globalStorage, currentUser} = this.ctx;
    if (data.shared !== undefined) {
      globalStorage.extensionProperties.templates = JSON.stringify(data.shared);
    }
    if (data.private !== undefined) {
      currentUser.extensionProperties.templates = JSON.stringify(data.private);
    }
  }
}

function incrementTemplateUsage(ctx: Context, templateId: string | undefined) {
  if (!templateId) {
    return;
  }
  const store = new TemplateStore(ctx);
  const data = store.data;
  
  let changed = false;
  const update = (list: Template[]) => list.map(t => {
    if (t.id === templateId) {
      changed = true;
      return {...t, usageCount: (t.usageCount || 0) + 1};
    }
    return t;
  });

  const updatedShared = update(data.shared);
  const updatedPrivate = update(data.private);

  if (changed) {
    store.save({shared: updatedShared, private: updatedPrivate});
  }
}

interface YTEntities {
  Article: {
    createDraft: (project: YTProject, user: YTUser) => YTArticle;
    findById: (id: string) => YTArticle | null;
  };
}

const ytEntities = entities as unknown as YTEntities;

export const httpHandler = {
  endpoints: [
    {
      scope: 'article',
      method: 'GET',
      path: 'article-data',
      handle: (ctx: Context) => {
        const entity = ctx.article || ctx.articleDraft;
        if (entity) {
          ctx.response.json({
            summary: entity.summary,
            content: entity.content
          });
        } else {
          ctx.response.code = 404;
          ctx.response.json({error: 'Entity not found'});
        }
      }
    },
    {
      scope: 'project',
      method: 'POST',
      path: 'create-draft',
      handle: (ctx: Context) => {
        const {summary, content, parentArticleId, templateId} = ctx.request.json<CreateDraftRequest>();
        const project = ctx.project;

        if (!project) {
          ctx.response.code = 404;
          ctx.response.json({error: 'Project not found in context'});
          return;
        }

        const draft = ytEntities.Article.createDraft(project, ctx.currentUser);
        draft.summary = summary || '';
        draft.content = content || '';

        if (parentArticleId) {
          const parent = ytEntities.Article.findById(parentArticleId);
          if (parent) {
            draft.parentArticle = parent;
          }
        }

        incrementTemplateUsage(ctx, templateId);

        ctx.response.json({
          id: draft.id,
          url: draft.url
        });
      }
    }
  ]
};
