/**
 * State and operations behind the dashboard widget.
 *
 * Every mutation updates the local lists optimistically instead of reloading everything: the
 * template list is small, and a full reload would reset the table selection and the sort order.
 */

import {useCallback, useState} from 'react';
import Selection from '@jetbrains/ring-ui-built/components/table/selection';
import type {AlertType} from '@jetbrains/ring-ui-built/components/alert/alert';
import type {Template, YTProject} from '@/common/types';
import type {AppSettings, TemplatesApi} from './api';
import type {HostAPI} from '../../../@types/globals';

export type ViewMode = 'active' | 'deleted';

export const useTemplateManager = (host: HostAPI, api: TemplatesApi) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [deletedTemplates, setDeletedTemplates] = useState<Template[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('active');
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
  const [projects, setProjects] = useState<YTProject[]>([]);

  const onSort = useCallback((params: {column: {id: string}, order: boolean}) => {
    setSortKey(params.column.id);
    setSortOrder(params.order);
  }, []);

  /** Everything the dashboard needs is fetched in one go, so the widget renders in a single pass. */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [active, deleted, appSettings, preferences, projectList] = await Promise.all([
        api.getTemplates(), api.getDeletedTemplates(), api.getSettings(),
        api.getUserPreferences(), api.getProjects()
      ]);
      setTemplates(Array.isArray(active) ? active : []);
      setDeletedTemplates(Array.isArray(deleted) ? deleted : []);
      setSettings(appSettings);
      setFavorites(preferences.favorites ?? []);
      setShowFavoritesOnly(Boolean(preferences.showFavoritesOnly));
      setAuthorFilter(preferences.authorFilter ?? []);
      setProjectFilter(preferences.projectFilter ?? []);
      setProjects(projectList);
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const onToggleFavorite = useCallback(async (id: string) => {
    try {
      setFavorites(await api.toggleFavorite(id));
    } catch (e) {
      console.error('Failed to toggle favorite', e);
    }
  }, [api]);

  const onToggleShowFavorites = useCallback(async () => {
    try {
      setShowFavoritesOnly(await api.toggleShowFavorites());
    } catch (e) {
      console.error('Failed to toggle show favorites', e);
    }
  }, [api]);

  // The filters are applied at once and persisted in the background: they are a display preference,
  // so a failed write must not roll the table back under the user.
  const onSetAuthorFilter = useCallback(async (authorIds: string[]) => {
    setAuthorFilter(authorIds);
    try {
      await api.setAuthorFilter(authorIds);
    } catch (e) {
      console.error('Failed to set author filter', e);
    }
  }, [api]);

  const onSetProjectFilter = useCallback(async (projectIds: string[]) => {
    setProjectFilter(projectIds);
    try {
      await api.setProjectFilter(projectIds);
    } catch (e) {
      console.error('Failed to set project filter', e);
    }
  }, [api]);

  /** A clone starts out private and locked, so it never overwrites what the original author shared. */
  const onClone = useCallback(async (template: Template) => {
    try {
      const saved = await api.saveTemplate({
        name: `${template.name} Clone`,
        summary: template.summary,
        content: template.content,
        isPrivate: true,
        lockedForOthers: true
      });
      setTemplates(prev => [...prev, saved]);
      setFavorites(prev => [...prev, saved.id]);
      host.alert('Template cloned', 'success' as AlertType.SUCCESS);
    } catch (e) {
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
      const saved = await api.saveTemplate(editingTemplate);

      setTemplates(prev => (isNew
        ? [...prev, saved]
        : prev.map(t => (t.id === saved.id ? saved : t))
      ));
      if (isNew) {
        setFavorites(prev => [...prev, saved.id]);
      }

      setEditingTemplate(null);
      host.alert('Template saved', 'success' as AlertType.SUCCESS);
    } catch (e) {
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
      console.error('Failed to permanently delete template', e);
    }
  }, [api, host]);

  /** Bulk actions silently skip the rows the user may not touch and report how many were skipped. */
  const onBulkDelete = useCallback(async () => {
    const allSelected = Array.from(selection.getSelected());
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

      const skipped = allSelected.length - deletable.length;
      host.alert(skipped > 0
        ? `${deletable.length} templates moved to trash, ${skipped} skipped (no permission)`
        : `${deletable.length} templates moved to trash`, 'success' as AlertType.SUCCESS);
    } catch (e) {
      console.error('Failed to delete templates', e);
    }
  }, [api, selection, host]);

  const onBulkRestore = useCallback(async () => {
    const allSelected = Array.from(selection.getSelected());
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
        const restored = {...t};
        delete restored.deletedAt;
        return restored;
      })]);
      setDeletedTemplates(prev => prev.filter(t => !restorableIds.includes(t.id)));

      const skipped = allSelected.length - restorable.length;
      host.alert(skipped > 0
        ? `${restorable.length} templates restored, ${skipped} skipped (no permission)`
        : `${restorable.length} templates restored`, 'success' as AlertType.SUCCESS);
    } catch (e) {
      console.error('Failed to restore templates', e);
    }
  }, [api, selection, host]);

  const onImport = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.importPredefinedTemplates();
      if (result.importedCount > 0) {
        setTemplates(await api.getTemplates());
        host.alert(`${result.importedCount} templates imported`, 'success' as AlertType.SUCCESS);
      } else {
        host.alert('All predefined templates are already present', 'message' as AlertType.MESSAGE);
      }
    } catch (e) {
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
