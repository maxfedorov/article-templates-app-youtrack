/**
 * Dashboard widget: the place where templates are managed and articles are created from them.
 *
 * The widget has three screens -- the active list, the trash and the template form -- and swaps
 * between them instead of stacking dialogs, because a dashboard widget has no room for both.
 */

import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import LoaderInline from '@jetbrains/ring-ui-built/components/loader-inline/loader-inline';
import Selection from '@jetbrains/ring-ui-built/components/table/selection';
import Table from '@jetbrains/ring-ui-built/components/table/table';
import Text from '@jetbrains/ring-ui-built/components/text/text';
import type {AlertType} from '@jetbrains/ring-ui-built/components/alert/alert';
import type {Template, YTArticle} from '@/common/types';
import {createTemplatesApi} from '../shared/api';
import {TemplateEditor} from '../shared/TemplateEditor';
import {TemplateToolbar} from '../shared/TemplateToolbar';
import type {FilterOption} from '../shared/TemplateToolbar';
import {useTemplateManager} from '../shared/useTemplateManager';
import {buildColumns} from './columns';
import type {ProjectItem} from './columns';

const host = await YTApp.register();
const api = createTemplatesApi(host);

const EMPTY_STYLE = {padding: '16px', textAlign: 'center' as const};

/** Templates are sorted by name or by author login; the other columns are not sortable. */
const getSortValue = (template: Template, sortKey: string): string =>
  (sortKey === 'name' ? template.name : template.author?.login || 'n/a').toLowerCase();

const sortTemplates = (data: Template[], sortKey: string | undefined, sortOrder: boolean): Template[] => {
  if (!sortKey) {
    return data;
  }
  return [...data].sort((a, b) => {
    const first = getSortValue(a, sortKey);
    const second = getSortValue(b, sortKey);
    if (first === second) {
      return 0;
    }
    const diff = first < second ? -1 : 1;
    return sortOrder ? diff : -diff;
  });
};

/** Authors offered by the filter; templates saved before the author was recorded land under `n/a`. */
function collectAuthors(templates: Template[]): FilterOption[] {
  const byId = new Map<string, string>();
  let hasNoAuthor = false;

  templates.forEach(template => {
    const authorId = template.author?.id || template.author?.login;
    if (authorId && template.author?.login) {
      byId.set(authorId, template.author.login);
    } else {
      hasNoAuthor = true;
    }
  });

  const options = Array.from(byId.entries()).map(([key, label]) => ({key, label}));
  if (hasNoAuthor) {
    options.push({key: 'no-author', label: 'n/a'});
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

/** Only the projects actually used by a template are offered, plus "All projects" for unbound ones. */
function collectProjects(templates: Template[]): FilterOption[] {
  const byId = new Map<string, string>();
  templates.forEach(template => {
    if (template.projectId && template.projectName) {
      byId.set(template.projectId, template.projectName);
    } else {
      byId.set('all', 'All projects');
    }
  });
  return Array.from(byId.entries())
    .map(([key, label]) => ({key, label}))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function matchesAuthor(template: Template, authorFilter: string[]): boolean {
  const authorId = template.author?.id || template.author?.login;
  return authorId ? authorFilter.includes(authorId) : authorFilter.includes('no-author');
}

const AppComponent: React.FunctionComponent = () => {
  const manager = useTemplateManager(host, api);
  const [selectedProjects, setSelectedProjects] = useState<Record<string, ProjectItem | null>>({});
  const [selectedParents, setSelectedParents] = useState<Record<string, ProjectItem | null>>({});
  const [articlesByProject, setArticlesByProject] = useState<Record<string, YTArticle[]>>({});

  const {
    templates, deletedTemplates, viewMode, filter, sortKey, sortOrder, favorites, showFavoritesOnly,
    authorFilter, projectFilter, projects, onSetAuthorFilter, onSetProjectFilter, setSelection, loadData
  } = manager;

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** The article list of a project is fetched once and kept for as long as the widget stays open. */
  const onLoadArticles = useCallback(async (projectKey: string) => {
    if (articlesByProject[projectKey]) {
      return;
    }
    try {
      const articles = await api.getArticles(projectKey);
      setArticlesByProject(prev => ({...prev, [projectKey]: articles}));
    } catch (e) {
      console.error(`Failed to load articles for project ${projectKey}`, e);
    }
  }, [articlesByProject]);

  const onProjectSelect = useCallback((templateId: string, project: ProjectItem | null) => {
    setSelectedProjects(prev => ({...prev, [templateId]: project}));
    setSelectedParents(prev => ({...prev, [templateId]: null}));
  }, []);

  const onParentSelect = useCallback((templateId: string, parent: ProjectItem | null) => {
    setSelectedParents(prev => ({...prev, [templateId]: parent}));
  }, []);

  const onCreateArticle = useCallback(async (template: Template) => {
    const project = template.projectId
      ? projects.find(p => p.shortName === template.projectId || p.id === template.projectId)
      : selectedProjects[template.id];

    if (!project?.shortName) {
      host.alert('Please select a project first', 'error' as AlertType.ERROR);
      return;
    }
    try {
      const result = await api.createDraft(
        template.summary,
        template.content,
        project.shortName,
        selectedParents[template.id]?.key,
        template.id
      );
      if (result.url) {
        window.open(result.url, '_blank');
      }
    } catch (e) {
      console.error('Failed to create article', e);
    }
  }, [projects, selectedProjects, selectedParents]);

  const authors = useMemo(() => collectAuthors(templates), [templates]);
  const filterProjects = useMemo(() => collectProjects(templates), [templates]);
  const projectOptions: ProjectItem[] = useMemo(
    () => projects.map(p => ({key: p.shortName || p.id, label: p.name, shortName: p.shortName})),
    [projects]
  );

  const visibleData = useMemo(() => {
    let data = viewMode === 'active' ? templates : deletedTemplates;
    if (viewMode === 'active' && showFavoritesOnly) {
      data = data.filter(t => favorites.includes(t.id));
    }
    if (authorFilter.length > 0) {
      data = data.filter(t => matchesAuthor(t, authorFilter));
    }
    if (projectFilter.length > 0) {
      data = data.filter(t => projectFilter.includes(t.projectId || 'all'));
    }
    if (filter.trim()) {
      data = data.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));
    }
    return sortTemplates(data, sortKey, sortOrder);
  }, [templates, deletedTemplates, viewMode, filter, sortKey, sortOrder, favorites, showFavoritesOnly,
    authorFilter, projectFilter]);

  useEffect(() => {
    setSelection(new Selection({data: visibleData}));
  }, [visibleData, setSelection]);

  // A filter that hides every row is a dead end -- usually the filtered author or project is simply
  // gone -- so it is dropped as soon as it leaves the user with an empty table.
  useEffect(() => {
    const baseData = viewMode === 'active' ? templates : deletedTemplates;
    if (visibleData.length > 0 || filter.trim() || baseData.length === 0) {
      return;
    }
    if (authorFilter.length > 0) {
      onSetAuthorFilter([]);
    }
    if (projectFilter.length > 0) {
      onSetProjectFilter([]);
    }
  }, [visibleData.length, filter, authorFilter, projectFilter, templates, deletedTemplates, viewMode,
    onSetAuthorFilter, onSetProjectFilter]);

  const {onToggleFavorite, onClone, setEditingTemplate, onDelete, onRestore, onPermanentDelete} = manager;
  const columns = useMemo(() => buildColumns({
    favorites, projects, projectOptions, selectedProjects, selectedParents, articlesByProject,
    onToggleFavorite, onProjectSelect, onParentSelect, onLoadArticles, onCreateArticle,
    onClone, onEdit: setEditingTemplate, onDelete, onRestore, onPermanentDelete
  }, viewMode), [
    favorites, projects, projectOptions, selectedProjects, selectedParents, articlesByProject,
    onToggleFavorite, onProjectSelect, onParentSelect, onLoadArticles, onCreateArticle,
    onClone, setEditingTemplate, onDelete, onRestore, onPermanentDelete, viewMode
  ]);

  if (manager.loading) {
    return <LoaderInline/>;
  }

  if (manager.editingTemplate) {
    return (
      <TemplateEditor
        template={manager.editingTemplate}
        onSave={manager.onSave}
        onCancel={() => setEditingTemplate(null)}
        onChange={setEditingTemplate}
        onDelete={onDelete}
        projects={projects}
        isReadOnly={manager.editingTemplate.id ? !manager.editingTemplate.canEdit : false}
      />
    );
  }

  return (
    <div className="widget">
      <TemplateToolbar
        viewMode={viewMode}
        onAdd={() => setEditingTemplate({isPrivate: true})}
        onImport={manager.onImport}
        onShowDeleted={() => manager.setViewMode('deleted')}
        onBackToList={() => manager.setViewMode('active')}
        onBulkDelete={manager.onBulkDelete}
        onBulkRestore={manager.onBulkRestore}
        selectedCount={manager.selection.getSelected().size}
        purgeIntervalDays={manager.settings?.purgeIntervalDays}
        filter={filter}
        onFilterChange={manager.setFilter}
        showFavoritesOnly={showFavoritesOnly}
        onToggleShowFavorites={manager.onToggleShowFavorites}
        authors={authors}
        authorFilter={authorFilter}
        onAuthorFilterChange={onSetAuthorFilter}
        projects={filterProjects}
        projectFilter={projectFilter}
        onProjectFilterChange={onSetProjectFilter}
      />
      <Table
        className="templateTable"
        data={visibleData}
        columns={columns}
        selection={manager.selection}
        onSelect={setSelection}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={manager.onSort}
        getItemKey={item => item.id}
        renderEmpty={() => (
          <div style={EMPTY_STYLE}>
            <Text>{viewMode === 'active' ? 'No templates found.' : 'No deleted templates found.'}</Text>
          </div>
        )}
      />
    </div>
  );
};

export const App = memo(AppComponent);
