import * as entities from '@jetbrains/youtrack-scripting-api/entities';
import {PREDEFINED_TEMPLATES} from './predefined-templates';
import {Context, Template, YTProject, YTArticle, YTUser, TemplateAuthor} from './types-backend';

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
      initialImportDone: this.ctx.globalStorage.extensionProperties.initialImportDone === 'true',
      favorites: this.favorites,
      showFavoritesOnly: this.showFavoritesOnly,
      authorFilter: this.authorFilter,
      projectFilter: this.projectFilter
    };
  }

  get favorites(): string[] {
    const favs = this.ctx.currentUser.extensionProperties.favorites;
    try {
      return favs ? JSON.parse(favs) : [];
    } catch {
      return [];
    }
  }

  set favorites(ids: string[]) {
    this.ctx.currentUser.extensionProperties.favorites = JSON.stringify(ids);
  }

  get showFavoritesOnly(): boolean {
    return this.ctx.currentUser.extensionProperties.showFavoritesOnly === 'true';
  }

  set showFavoritesOnly(val: boolean) {
    this.ctx.currentUser.extensionProperties.showFavoritesOnly = val ? 'true' : 'false';
  }

  get authorFilter(): string[] {
    const val = this.ctx.currentUser.extensionProperties.authorFilter;
    try {
      return val ? JSON.parse(val) : [];
    } catch {
      return val ? [val] : [];
    }
  }

  set authorFilter(val: string[]) {
    this.ctx.currentUser.extensionProperties.authorFilter = JSON.stringify(val);
  }

  get projectFilter(): string[] {
    const val = this.ctx.currentUser.extensionProperties.projectFilter;
    try {
      return val ? JSON.parse(val) : [];
    } catch {
      return val ? [val] : [];
    }
  }

  set projectFilter(val: string[]) {
    this.ctx.currentUser.extensionProperties.projectFilter = JSON.stringify(val);
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

function getAuthor(user: YTUser): TemplateAuthor {
  const u = (user || {}) as YTUser;
  return {
    id: u.ringId || u.id || '',
    login: u.login || '',
    fullName: u.fullName || '',
    email: u.email || ''
  };
}

function canEditTemplate(template: Template, currentUser: YTUser): boolean {
  if (!template.lockedForOthers) {
    return true;
  }
  const authorId = template.author?.id;
  const currentUserId = currentUser.ringId;
  if (authorId && authorId === currentUserId) {
    return true;
  }
  try {
    return currentUser.hasPermission('ADMIN_UPDATE_APP');
  } catch {
    return false;
  }
}

function checkProjectPermission(ctx: Context, projectId: string | undefined): boolean {
  if (!projectId) {
    return true;
  }
  const project = ytEntities.Project.findByKey(projectId);
  if (!project) {
    return false;
  }
  return ctx.currentUser.hasPermission('CREATE_ARTICLE', project);
}

function processTemplateForResponse(template: Template, currentUser: YTUser): Template | null {
  const result = {...template} as Template & {projectName?: string, canEdit?: boolean};
  
  // Clear any potentially stored computed fields to ensure they are re-computed and not leaked
  delete result.projectName;
  delete result.canEdit;

  if (template.projectId) {
    const project = ytEntities.Project.findByKey(template.projectId);
    if (project) {
      result.projectName = project.name;
      result.projectId = project.shortName;
    }
  }
  
  result.canEdit = canEditTemplate(template, currentUser);
  
  return result;
}

const getTId = (t: Template) => t.id || generateId();
const getTCreatedAt = (t: Template, b: Template) => b.createdAt || t.createdAt || Date.now();
const getTUsageCount = (t: Template, b: Template) => b.usageCount ?? t.usageCount ?? 0;
const getTAuthor = (b: Template, u: YTUser, isNew: boolean) => isNew ? getAuthor(u) : b.author;

function prepareTemplate(template: Template, old: Template | null | undefined, currentUser: YTUser) {
  const isNew = !old;
  const base = (old || {}) as Template;
  // Explicitly pick only the fields we want to store to avoid saving computed fields like projectName or canEdit
  return {
    id: getTId(template),
    name: template.name,
    summary: template.summary,
    content: template.content,
    createdAt: getTCreatedAt(template, base),
    usageCount: getTUsageCount(template, base),
    isPrivate: template.isPrivate,
    author: getTAuthor(base, currentUser, isNew),
    lockedForOthers: template.lockedForOthers,
    projectId: template.projectId
  };
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

        if (!ctx.currentUser.hasPermission('CREATE_ARTICLE', project)) {
          ctx.response.code = 403;
          ctx.response.json({error: 'You do not have permission to create articles in project: ' + projectKey});
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
        const projectsParam = ctx.request.getParameter('projects');
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

        const res = Array.from(all.values())
          .filter(t => {
            if (!checkProjectPermission(ctx, t.projectId)) {
              return false;
            }
            if (projectsParam === 'all') {
              return true;
            }
            if (!t.projectId) {
              return true;
            }
            const allowed = projectsParam ? projectsParam.split(',') : [];
            return allowed.includes(t.projectId);
          })
          .map(t => processTemplateForResponse(t, ctx.currentUser))
          .filter(t => t !== null);

        ctx.response.json(res);
      }
    },
    {
      method: 'GET',
      path: 'deleted-templates',
      handle: (ctx: Context) => {
        const projectsParam = ctx.request.getParameter('projects');
        const {deletedShared, deletedPrivate} = getAndPurgeTemplates(ctx, false);
        const res = [
          ...deletedShared.map(t => ({...t, isPrivate: false})),
          ...deletedPrivate.map(t => ({...t, isPrivate: true}))
        ]
          .filter(t => {
            if (!checkProjectPermission(ctx, t.projectId)) {
              return false;
            }
            if (projectsParam === 'all') {
              return true;
            }
            if (!t.projectId) {
              return true;
            }
            const allowed = projectsParam ? projectsParam.split(',') : [];
            return allowed.includes(t.projectId);
          })
          .map(t => processTemplateForResponse(t, ctx.currentUser))
          .filter(t => t !== null);
          
        ctx.response.json(res);
      }
    },
    {
      method: 'POST',
      path: 'templates',
      // eslint-disable-next-line complexity
      handle: (ctx: Context) => {
        const store = new TemplateStore(ctx);
        const {shared, private: priv} = getAndPurgeTemplates(ctx, true);
        const reqJson = ctx.request.json<Template>();
        const old = reqJson.id ? getOldTemplate(reqJson.id, shared, priv) : null;

        if (old && old.projectId && !checkProjectPermission(ctx, old.projectId)) {
          ctx.response.code = 403;
          ctx.response.json({error: 'You do not have permission to access the project of this template'});
          return;
        }

        if (reqJson.projectId && !checkProjectPermission(ctx, reqJson.projectId)) {
          ctx.response.code = 403;
          ctx.response.json({error: 'You do not have permission to use the selected project'});
          return;
        }

        if (old && !canEditTemplate(old, ctx.currentUser)) {
          ctx.response.code = 403;
          ctx.response.json({error: 'You do not have permission to edit this template'});
          return;
        }

        const template = prepareTemplate(reqJson, old, ctx.currentUser);

        if (!old) {
          const favs = store.favorites;
          if (!favs.includes(template.id)) {
            store.favorites = [...favs, template.id];
          }
        }

        const filterFn = (list: Template[]) => list.filter(t => t.id !== template.id);
        const updatedShared = filterFn(shared);
        const updatedPrivate = filterFn(priv);

        if (template.isPrivate) {
          updatedPrivate.push(template);
        } else {
          updatedShared.push(template);
        }

        store.save({shared: updatedShared, private: updatedPrivate});
        
        const responseTemplate = processTemplateForResponse(template, ctx.currentUser);
        ctx.response.json(responseTemplate || template);
      }
    },
    {
      method: 'DELETE',
      path: 'templates',
      // eslint-disable-next-line complexity
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

        if (template.projectId && !checkProjectPermission(ctx, template.projectId)) {
          ctx.response.code = 403;
          ctx.response.json({error: 'You do not have permission to access the project of this template'});
          return;
        }

        if (!canEditTemplate(template, ctx.currentUser)) {
          ctx.response.code = 403;
          ctx.response.json({error: 'You do not have permission to delete this template'});
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

        const toDelShared = shared.filter(t => idsSet.has(t.id) && checkProjectPermission(ctx, t.projectId) && canEditTemplate(t, ctx.currentUser));
        const toDelPriv = priv.filter(t => idsSet.has(t.id) && checkProjectPermission(ctx, t.projectId) && canEditTemplate(t, ctx.currentUser));
        const deletedIds = new Set([...toDelShared, ...toDelPriv].map(t => t.id));
        const toDelPre = PREDEFINED_TEMPLATES.filter(t => idsSet.has(t.id) && !deletedIds.has(t.id) && checkProjectPermission(ctx, t.projectId) && canEditTemplate(t, ctx.currentUser));

        if (!toDelShared.length && !toDelPriv.length && !toDelPre.length) {
          ctx.response.code = 403;
          ctx.response.json({error: 'No templates found or you do not have permission to delete them'});
          return;
        }

        const actuallyDeletedIds = new Set([
          ...toDelShared.map(t => t.id),
          ...toDelPriv.map(t => t.id)
        ]);

        store.save({
          shared: shared.filter(t => !actuallyDeletedIds.has(t.id)),
          private: priv.filter(t => !actuallyDeletedIds.has(t.id)),
          deletedShared: [...deletedShared, ...[...toDelShared, ...toDelPre].map(t => ({...t, deletedAt: now, isPrivate: false}))],
          deletedPrivate: [...deletedPrivate, ...toDelPriv.map(t => ({...t, deletedAt: now, isPrivate: true}))]
        });
        
        ctx.response.json({success: true, count: toDelShared.length + toDelPriv.length + toDelPre.length});
      }
    },
    {
      method: 'POST',
      path: 'restore-template',
      // eslint-disable-next-line complexity
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

        if (template.projectId && !checkProjectPermission(ctx, template.projectId)) {
          ctx.response.code = 403;
          ctx.response.json({error: 'You do not have permission to access the project of this template'});
          return;
        }

        if (!canEditTemplate(template, ctx.currentUser)) {
          ctx.response.code = 403;
          ctx.response.json({error: 'You do not have permission to restore this template'});
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

        ctx.response.json(processTemplateForResponse(restored, ctx.currentUser) || restored);
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

        const toResShared = deletedShared.filter(t => idsSet.has(t.id) && checkProjectPermission(ctx, t.projectId) && canEditTemplate(t, ctx.currentUser));
        const toResPriv = deletedPrivate.filter(t => idsSet.has(t.id) && checkProjectPermission(ctx, t.projectId) && canEditTemplate(t, ctx.currentUser));

        if (!toResShared.length && !toResPriv.length) {
          ctx.response.code = 403;
          ctx.response.json({error: 'No templates found in trash or you do not have permission to restore them'});
          return;
        }

        const actuallyRestoredIds = new Set([
          ...toResShared.map(t => t.id),
          ...toResPriv.map(t => t.id)
        ]);

        const clean = (list: Template[]) => list.map(t => {
          const r = {...t};
          delete r.deletedAt;
          return r;
        });

        store.save({
          shared: [...shared, ...clean(toResShared)],
          private: [...priv, ...clean(toResPriv)],
          deletedShared: deletedShared.filter(t => !actuallyRestoredIds.has(t.id)),
          deletedPrivate: deletedPrivate.filter(t => !actuallyRestoredIds.has(t.id))
        });

        ctx.response.json({success: true, count: toResShared.length + toResPriv.length});
      }
    },
    {
      method: 'DELETE',
      path: 'permanent-template',
      // eslint-disable-next-line complexity
      handle: (ctx: Context) => {
        const id = ctx.request.getParameter('id');
        if (!id) {
          ctx.response.code = 400;
          ctx.response.json({error: 'ID is required'});
          return;
        }

        const store = new TemplateStore(ctx);
        const {deletedShared, deletedPrivate} = getAndPurgeTemplates(ctx, true);
        const template = deletedShared.find(t => t.id === id) || deletedPrivate.find(t => t.id === id);

        if (!template) {
          ctx.response.code = 404;
          ctx.response.json({error: 'Template not found'});
          return;
        }

        if (template.projectId && !checkProjectPermission(ctx, template.projectId)) {
          ctx.response.code = 403;
          ctx.response.json({error: 'You do not have permission to access the project of this template'});
          return;
        }

        if (!canEditTemplate(template, ctx.currentUser)) {
          ctx.response.code = 403;
          ctx.response.json({error: 'You do not have permission to permanently delete this template'});
          return;
        }

        const favs = store.favorites;
        if (favs.includes(id)) {
          store.favorites = favs.filter(f => f !== id);
        }

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
      path: 'user-preferences',
      handle: (ctx: Context) => {
        const store = new TemplateStore(ctx);
        ctx.response.json({
          favorites: store.favorites,
          showFavoritesOnly: store.showFavoritesOnly,
          authorFilter: store.authorFilter,
          projectFilter: store.projectFilter
        });
      }
    },
    {
      method: 'POST',
      path: 'author-filter',
      handle: (ctx: Context) => {
        const {authorIds} = ctx.request.json<{authorIds: string[]}>();
        const store = new TemplateStore(ctx);
        store.authorFilter = authorIds || [];
        ctx.response.json({authorFilter: store.authorFilter});
      }
    },
    {
      method: 'POST',
      path: 'project-filter',
      handle: (ctx: Context) => {
        const {projectIds} = ctx.request.json<{projectIds: string[]}>();
        const store = new TemplateStore(ctx);
        store.projectFilter = projectIds || [];
        ctx.response.json({projectFilter: store.projectFilter});
      }
    },
    {
      method: 'POST',
      path: 'toggle-favorite',
      handle: (ctx: Context) => {
        const id = ctx.request.getParameter('id');
        if (!id) {
          ctx.response.code = 400;
          return;
        }
        const store = new TemplateStore(ctx);
        const favs = store.favorites;
        if (favs.includes(id)) {
          store.favorites = favs.filter(f => f !== id);
        } else {
          store.favorites = [...favs, id];
        }
        ctx.response.json({favorites: store.favorites});
      }
    },
    {
      method: 'POST',
      path: 'toggle-show-favorites',
      handle: (ctx: Context) => {
        const store = new TemplateStore(ctx);
        store.showFavoritesOnly = !store.showFavoritesOnly;
        ctx.response.json({showFavoritesOnly: store.showFavoritesOnly});
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
