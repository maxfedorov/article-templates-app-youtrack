import * as entities from '@jetbrains/youtrack-scripting-api/entities';
import {PREDEFINED_TEMPLATES} from './predefined-templates';
import {Context, Template, YTProject, YTArticle, YTUser} from './types-backend';

const DEFAULT_PURGE_DAYS = 7;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const SECONDS_IN_MINUTE = 60;
const MS_IN_SECOND = 1000;
const MS_PER_DAY = HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MS_IN_SECOND;

interface YTEntities {
  Project: {
    findByKey: (key: string) => YTProject | null;
  };
  Article: {
    createDraft: (project: YTProject, user: YTUser) => YTArticle;
    findById: (id: string) => YTArticle | null;
  };
}

const ytEntities = entities as unknown as YTEntities;

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
      private: this.parse(this.ctx.currentUser.extensionProperties.templates),
      deletedShared: this.parse(this.ctx.globalStorage.extensionProperties.deletedTemplates),
      deletedPrivate: this.parse(this.ctx.currentUser.extensionProperties.deletedTemplates),
      initialImportDone: this.ctx.globalStorage.extensionProperties.initialImportDone === 'true'
    };
  }

  save(data: { shared?: Template[], private?: Template[], deletedShared?: Template[], deletedPrivate?: Template[], initialImportDone?: boolean }) {
    const {globalStorage, currentUser} = this.ctx;
    if (data.shared !== undefined) {
      globalStorage.extensionProperties.templates = JSON.stringify(data.shared);
    }
    if (data.private !== undefined) {
      currentUser.extensionProperties.templates = JSON.stringify(data.private);
    }
    if (data.deletedShared !== undefined) {
      globalStorage.extensionProperties.deletedTemplates = JSON.stringify(data.deletedShared);
    }
    if (data.deletedPrivate !== undefined) {
      currentUser.extensionProperties.deletedTemplates = JSON.stringify(data.deletedPrivate);
    }
    if (data.initialImportDone !== undefined) {
      globalStorage.extensionProperties.initialImportDone = data.initialImportDone ? 'true' : 'false';
    }
  }
}

function getAndPurgeTemplates(ctx: Context, shouldSave: boolean) {
  const store = new TemplateStore(ctx);
  const data = store.data;
  const intervalMs = (ctx.settings?.purgeIntervalDays ?? DEFAULT_PURGE_DAYS) * MS_PER_DAY;
  const now = Date.now();

  const purge = (list: Template[]) => list.filter(t => t.deletedAt && (now - t.deletedAt < intervalMs));
  
  const purgedShared = purge(data.deletedShared);
  const purgedPrivate = purge(data.deletedPrivate);

  let finalShared = data.shared;
  let finalImportDone = data.initialImportDone;

  if (shouldSave) {
    if (!finalImportDone) {
      const existingIds = new Set(data.shared.map(t => t.id));
      finalShared = [...data.shared, ...PREDEFINED_TEMPLATES.filter(t => !existingIds.has(t.id))];
      finalImportDone = true;
      store.save({
        shared: finalShared,
        deletedShared: purgedShared,
        deletedPrivate: purgedPrivate,
        initialImportDone: true
      });
    } else if (purgedShared.length !== data.deletedShared.length || purgedPrivate.length !== data.deletedPrivate.length) {
      store.save({deletedShared: purgedShared, deletedPrivate: purgedPrivate});
    }
  }

  return {
    ...data,
    shared: finalShared,
    deletedShared: purgedShared,
    deletedPrivate: purgedPrivate,
    initialImportDone: finalImportDone
  };
}

const RADIX_36 = 36;
const SUBSTR_START = 2;
const SUBSTR_END = 9;
const generateId = () => Date.now().toString() + Math.random().toString(RADIX_36).substring(SUBSTR_START, SUBSTR_END);

function getOldTemplate(id: string, shared: Template[], priv: Template[]) {
  return shared.find(t => t.id === id) || priv.find(t => t.id === id);
}

function prepareTemplate(template: Template, shared: Template[], priv: Template[]) {
  const result = {...template};
  if (!result.id) {
    result.id = generateId();
    result.createdAt = Date.now();
    result.usageCount = 0;
    return result;
  }
  
  const old = getOldTemplate(result.id, shared, priv);
  if (old) {
    result.createdAt = result.createdAt ?? old.createdAt;
    result.usageCount = result.usageCount ?? old.usageCount;
  }
  
  result.createdAt = result.createdAt ?? Date.now();
  result.usageCount = result.usageCount ?? 0;
  
  return result;
}

interface CreateDraftRequest {
  summary: string;
  content: string;
  projectKey: string;
  parentArticleId?: string;
  templateId?: string;
}

interface BulkRequest {
  ids: string[];
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

export const httpHandler = {
  endpoints: [
    {
      method: 'POST',
      path: 'create-draft',
      handle: (ctx: Context) => {
        getAndPurgeTemplates(ctx, true);
        const {summary, content, projectKey, parentArticleId, templateId} = ctx.request.json<CreateDraftRequest>();

        const project = ytEntities.Project.findByKey(projectKey);

        if (!project) {
          ctx.response.code = 404;
          ctx.response.json({error: 'Project not found: ' + projectKey});
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
          url: draft.url,
          parent: draft.parentArticle
        });
      }
    },
    {
      method: 'GET',
      path: 'templates',
      handle: (ctx: Context) => {
        const data = getAndPurgeTemplates(ctx, false);
        const deletedIds = new Set([...data.deletedShared, ...data.deletedPrivate].map(t => t.id));
        const all = new Map<string, Template>();

        if (!data.initialImportDone) {
          PREDEFINED_TEMPLATES.forEach(t => {
            if (!deletedIds.has(t.id)) {
              all.set(t.id, {...t, isPrivate: false});
            }
          });
        }

        data.shared.forEach(t => {
          if (!deletedIds.has(t.id)) {
            all.set(t.id, {...t, isPrivate: false});
          }
        });

        data.private.forEach(t => {
          if (!deletedIds.has(t.id)) {
            all.set(t.id, {...t, isPrivate: true});
          }
        });

        ctx.response.json(Array.from(all.values()));
      }
    },
    {
      method: 'GET',
      path: 'deleted-templates',
      handle: (ctx: Context) => {
        const {deletedShared, deletedPrivate} = getAndPurgeTemplates(ctx, false);
        const res = [
          ...deletedShared.map(t => ({...t, isPrivate: false})),
          ...deletedPrivate.map(t => ({...t, isPrivate: true}))
        ];
        ctx.response.json(res);
      }
    },
    {
      method: 'POST',
      path: 'templates',
      handle: (ctx: Context) => {
        const store = new TemplateStore(ctx);
        const {shared, private: priv} = getAndPurgeTemplates(ctx, true);
        const template = prepareTemplate(ctx.request.json<Template>(), shared, priv);
        
        const filterFn = (list: Template[]) => list.filter(t => t.id !== template.id);
        const updatedShared = filterFn(shared);
        const updatedPrivate = filterFn(priv);

        if (template.isPrivate) {
          updatedPrivate.push(template);
        } else {
          updatedShared.push(template);
        }

        store.save({shared: updatedShared, private: updatedPrivate});
        ctx.response.json(template);
      }
    },
    {
      method: 'DELETE',
      path: 'templates',
      handle: (ctx: Context) => {
        const id = ctx.request.getParameter('id');
        if (!id) {
          ctx.response.code = 400;
          ctx.response.json({error: 'ID is required'});
          return;
        }

        const store = new TemplateStore(ctx);
        const {shared, private: priv, deletedShared, deletedPrivate} = getAndPurgeTemplates(ctx, true);
        const template = shared.find(t => t.id === id) || priv.find(t => t.id === id) || PREDEFINED_TEMPLATES.find(t => t.id === id);

        if (!template) {
          ctx.response.code = 404;
          ctx.response.json({error: 'Template not found'});
          return;
        }

        const deletedItem = {...template, deletedAt: Date.now()};
        store.save({
          shared: shared.filter(t => t.id !== id),
          private: priv.filter(t => t.id !== id),
          deletedShared: template.isPrivate ? deletedShared : [...deletedShared, deletedItem],
          deletedPrivate: template.isPrivate ? [...deletedPrivate, deletedItem] : deletedPrivate
        });
        
        ctx.response.json({success: true});
      }
    },
    {
      method: 'POST',
      path: 'bulk-delete-templates',
      handle: (ctx: Context) => {
        const {ids} = ctx.request.json<BulkRequest>();
        if (!ids?.length) {
          ctx.response.code = 400;
          ctx.response.json({error: 'IDs array is required'});
          return;
        }

        const store = new TemplateStore(ctx);
        const {shared, private: priv, deletedShared, deletedPrivate} = getAndPurgeTemplates(ctx, true);
        const idsSet = new Set(ids);
        const now = Date.now();

        const toDelShared = shared.filter(t => idsSet.has(t.id));
        const toDelPriv = priv.filter(t => idsSet.has(t.id));
        const deletedIds = new Set([...toDelShared, ...toDelPriv].map(t => t.id));
        const toDelPre = PREDEFINED_TEMPLATES.filter(t => idsSet.has(t.id) && !deletedIds.has(t.id));

        if (!toDelShared.length && !toDelPriv.length && !toDelPre.length) {
          ctx.response.code = 404;
          ctx.response.json({error: 'No templates found'});
          return;
        }

        store.save({
          shared: shared.filter(t => !idsSet.has(t.id)),
          private: priv.filter(t => !idsSet.has(t.id)),
          deletedShared: [...deletedShared, ...[...toDelShared, ...toDelPre].map(t => ({...t, deletedAt: now, isPrivate: false}))],
          deletedPrivate: [...deletedPrivate, ...toDelPriv.map(t => ({...t, deletedAt: now, isPrivate: true}))]
        });
        
        ctx.response.json({success: true, count: toDelShared.length + toDelPriv.length + toDelPre.length});
      }
    },
    {
      method: 'POST',
      path: 'restore-template',
      handle: (ctx: Context) => {
        const id = ctx.request.getParameter('id');
        const store = new TemplateStore(ctx);
        const {shared, private: priv, deletedShared, deletedPrivate} = getAndPurgeTemplates(ctx, true);
        const template = deletedShared.find(t => t.id === id) || deletedPrivate.find(t => t.id === id);

        if (!template) {
          ctx.response.code = 404;
          ctx.response.json({error: 'Template not found in trash'});
          return;
        }

        const restored = {...template};
        delete restored.deletedAt;

        store.save({
          shared: template.isPrivate ? shared : [...shared, restored],
          private: template.isPrivate ? [...priv, restored] : priv,
          deletedShared: deletedShared.filter(t => t.id !== id),
          deletedPrivate: deletedPrivate.filter(t => t.id !== id)
        });

        ctx.response.json(restored);
      }
    },
    {
      method: 'POST',
      path: 'bulk-restore-templates',
      handle: (ctx: Context) => {
        const {ids} = ctx.request.json<BulkRequest>();
        if (!ids?.length) {
          ctx.response.code = 400;
          ctx.response.json({error: 'IDs array is required'});
          return;
        }

        const store = new TemplateStore(ctx);
        const {shared, private: priv, deletedShared, deletedPrivate} = getAndPurgeTemplates(ctx, true);
        const idsSet = new Set(ids);

        const toResShared = deletedShared.filter(t => idsSet.has(t.id));
        const toResPriv = deletedPrivate.filter(t => idsSet.has(t.id));

        if (!toResShared.length && !toResPriv.length) {
          ctx.response.code = 404;
          ctx.response.json({error: 'No templates found in trash'});
          return;
        }

        const clean = (list: Template[]) => list.map(t => {
          const r = {...t};
          delete r.deletedAt;
          return r;
        });

        store.save({
          shared: [...shared, ...clean(toResShared)],
          private: [...priv, ...clean(toResPriv)],
          deletedShared: deletedShared.filter(t => !idsSet.has(t.id)),
          deletedPrivate: deletedPrivate.filter(t => !idsSet.has(t.id))
        });

        ctx.response.json({success: true, count: toResShared.length + toResPriv.length});
      }
    },
    {
      method: 'DELETE',
      path: 'permanent-template',
      handle: (ctx: Context) => {
        const id = ctx.request.getParameter('id');
        const store = new TemplateStore(ctx);
        const {deletedShared, deletedPrivate} = getAndPurgeTemplates(ctx, true);

        store.save({
          deletedShared: deletedShared.filter(t => t.id !== id),
          deletedPrivate: deletedPrivate.filter(t => t.id !== id)
        });

        ctx.response.json({success: true});
      }
    },
    {
      method: 'POST',
      path: 'import-predefined-templates',
      handle: (ctx: Context) => {
        const store = new TemplateStore(ctx);
        const {shared} = getAndPurgeTemplates(ctx, true);
        const existing = new Set(shared.map(t => t.name.toLowerCase()));
        
        const toAdd = PREDEFINED_TEMPLATES.filter(t => !existing.has(t.name.toLowerCase())).map(t => ({
          ...t, id: generateId(), isPrivate: false, createdAt: Date.now()
        }));

        if (toAdd.length) {
          store.save({shared: [...shared, ...toAdd], initialImportDone: true});
        }

        ctx.response.json({success: true, importedCount: toAdd.length});
      }
    },
    {
      method: 'GET',
      path: 'settings',
      handle: (ctx: Context) => {
        ctx.response.json(ctx.settings || {purgeIntervalDays: DEFAULT_PURGE_DAYS});
      }
    }
  ]
};
