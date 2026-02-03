import {useState, useCallback} from 'react';
import Selection from '@jetbrains/ring-ui-built/components/table/selection';
import type {AlertType} from '@jetbrains/ring-ui-built/components/alert/alert';
import API, {Template, AppSettings} from '../api';
import {HostAPI} from '../../@types/globals';

export const useTemplateManager = (host: HostAPI, api: API) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [deletedTemplates, setDeletedTemplates] = useState<Template[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'deleted'>('active');
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);
  const [selection, setSelection] = useState<Selection<Template>>(new Selection());
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [authorFilter, setAuthorFilter] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [projects, setProjects] = useState<import('../api').YTProject[]>([]);

  const onSort = useCallback((params: {column: {id: string}, order: boolean}) => {
    setSortKey(params.column.id);
    setSortOrder(params.order);
  }, []);

  // eslint-disable-next-line complexity
  const loadData = useCallback(async (additionalLoader?: () => Promise<void>) => {
    setLoading(true);
    try {
      const [t, d, s, p, prjs] = await Promise.all([
        api.getTemplates(), api.getDeletedTemplates(), api.getSettings(), api.getUserPreferences(), api.getProjects()
      ]);
      setTemplates(Array.isArray(t) ? t : []);
      setDeletedTemplates(Array.isArray(d) ? d : []);
      setSettings(s);
      setFavorites(p.favorites ?? []);
      setShowFavoritesOnly(!!p.showFavoritesOnly);
      setAuthorFilter(p.authorFilter ?? []);
      setProjectFilter(p.projectFilter ?? []);
      setProjects(prjs);
      if (additionalLoader) {
        await additionalLoader();
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const onToggleFavorite = useCallback(async (id: string) => {
    try {
      const newFavs = await api.toggleFavorite(id);
      setFavorites(newFavs);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to toggle favorite', e);
    }
  }, [api]);

  const onToggleShowFavorites = useCallback(async () => {
    try {
      const newVal = await api.toggleShowFavorites();
      setShowFavoritesOnly(newVal);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to toggle show favorites', e);
    }
  }, [api]);

  const onSetAuthorFilter = useCallback(async (authorIds: string[]) => {
    setAuthorFilter(authorIds);
    try {
      await api.setAuthorFilter(authorIds);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to set author filter', e);
    }
  }, [api]);

  const onSetProjectFilter = useCallback(async (projectIds: string[]) => {
    setProjectFilter(projectIds);
    try {
      await api.setProjectFilter(projectIds);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to set project filter', e);
    }
  }, [api]);

  const onClone = useCallback(async (template: Template) => {
    try {
      const clone: Omit<Template, 'id'> = {
        name: `${template.name} Clone`,
        summary: template.summary,
        content: template.content,
        isPrivate: true,
        lockedForOthers: true
      };
      const saved = await api.addTemplate(clone);
      setTemplates(prev => [...prev, saved]);
      setFavorites(prev => [...prev, saved.id]);
      host.alert('Template cloned', 'success' as AlertType.SUCCESS);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to clone template', e);
      host.alert('Failed to clone template', 'error' as AlertType.ERROR);
    }
  }, [api, host]);

  const onSave = useCallback(async () => {
    if (!editingTemplate?.name) {
      return;
    }
    try {
      const isNew = !editingTemplate.id;
      const saved = editingTemplate.id 
        ? await api.updateTemplate(editingTemplate as Template)
        : await api.addTemplate(editingTemplate as Omit<Template, 'id'>);
      
      setTemplates(prev => (editingTemplate.id 
        ? prev.map(t => (t.id === saved.id ? saved : t))
        : [...prev, saved]
      ));
      
      if (isNew) {
        setFavorites(prev => [...prev, saved.id]);
      }

      setEditingTemplate(null);
      host.alert('Template saved', 'success' as AlertType.SUCCESS);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to save template', e);
    }
  }, [api, editingTemplate, host]);

  const onDelete = useCallback(async (id: string) => {
    try {
      await api.deleteTemplate(id);
      const deleted = templates.find(t => t.id === id);
      if (deleted) {
        setDeletedTemplates(prev => [...prev, {...deleted, deletedAt: Date.now()}]);
      }
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (editingTemplate?.id === id) {
        setEditingTemplate(null);
      }
      host.alert('Template moved to trash', 'success' as AlertType.SUCCESS);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete template', e);
    }
  }, [api, templates, editingTemplate, host]);

  const onRestore = useCallback(async (id: string) => {
    try {
      const restored = await api.restoreTemplate(id);
      setTemplates(prev => [...prev, restored]);
      setDeletedTemplates(prev => prev.filter(t => t.id !== id));
      host.alert('Template restored', 'success' as AlertType.SUCCESS);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to restore template', e);
    }
  }, [api, host]);

  const onPermanentDelete = useCallback(async (id: string) => {
    try {
      await api.permanentlyDeleteTemplate(id);
      setDeletedTemplates(prev => prev.filter(t => t.id !== id));
      setFavorites(prev => prev.filter(f => f !== id));
      host.alert('Template permanently deleted', 'success' as AlertType.SUCCESS);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to permanently delete template', e);
    }
  }, [api, host]);

  const onBulkDelete = useCallback(async () => {
    const allSelected = Array.from(selection.getSelected()) as Template[];
    const deletable = allSelected.filter(t => t.canEdit);
    
    if (!deletable.length) {
      if (allSelected.length > 0) {
        host.alert('No templates selected that you have permission to delete', 'error' as AlertType.ERROR);
      }
      return;
    }

    try {
      const deletableIds = deletable.map(t => t.id);
      await api.bulkDeleteTemplates(deletableIds);
      setTemplates(prev => prev.filter(t => !deletableIds.includes(t.id)));
      setDeletedTemplates(prev => [...prev, ...deletable.map(t => ({...t, deletedAt: Date.now()}))]);
      
      if (deletable.length < allSelected.length) {
        host.alert(`${deletable.length} templates moved to trash, ${allSelected.length - deletable.length} skipped (no permission)`, 'success' as AlertType.SUCCESS);
      } else {
        host.alert(`${deletable.length} templates moved to trash`, 'success' as AlertType.SUCCESS);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete templates', e);
    }
  }, [api, selection, host]);

  const onBulkRestore = useCallback(async () => {
    const allSelected = Array.from(selection.getSelected()) as Template[];
    const restorable = allSelected.filter(t => t.canEdit);

    if (!restorable.length) {
      if (allSelected.length > 0) {
        host.alert('No templates selected that you have permission to restore', 'error' as AlertType.ERROR);
      }
      return;
    }

    try {
      const restorableIds = restorable.map(t => t.id);
      await api.bulkRestoreTemplates(restorableIds);
      setTemplates(prev => [...prev, ...restorable.map(t => {
        const r = {...t};
        delete r.deletedAt;
        return r;
      })]);
      setDeletedTemplates(prev => prev.filter(t => !restorableIds.includes(t.id)));
      
      if (restorable.length < allSelected.length) {
        host.alert(`${restorable.length} templates restored, ${allSelected.length - restorable.length} skipped (no permission)`, 'success' as AlertType.SUCCESS);
      } else {
        host.alert(`${restorable.length} templates restored`, 'success' as AlertType.SUCCESS);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to restore templates', e);
    }
  }, [api, selection, host]);

  const onImport = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.importPredefinedTemplates();
      if (result.importedCount > 0) {
        const tData = await api.getTemplates();
        setTemplates(tData);
        host.alert(`${result.importedCount} templates imported`, 'success' as AlertType.SUCCESS);
      } else {
        host.alert('All predefined templates are already present', 'success' as AlertType.MESSAGE);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to import templates', e);
      host.alert('Failed to import templates', 'error' as AlertType.ERROR);
    } finally {
      setLoading(false);
    }
  }, [api, host]);

  return {
    templates, setTemplates,
    deletedTemplates, setDeletedTemplates,
    viewMode, setViewMode,
    loading, setLoading,
    editingTemplate, setEditingTemplate,
    selection, setSelection,
    settings,
    favorites, showFavoritesOnly, authorFilter, projectFilter, projects,
    filter, setFilter,
    sortKey, sortOrder, onSort,
    loadData,
    onSave, onDelete, onRestore, onPermanentDelete, onClone,
    onBulkDelete, onBulkRestore, onImport,
    onToggleFavorite, onToggleShowFavorites, onSetAuthorFilter, onSetProjectFilter
  };
};
