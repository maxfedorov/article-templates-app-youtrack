import React, {memo, useCallback, useEffect, useState, useMemo} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import DropdownMenu from '@jetbrains/ring-ui-built/components/dropdown-menu/dropdown-menu';
import type {ListDataItem} from '@jetbrains/ring-ui-built/components/list/list';
import Text from '@jetbrains/ring-ui-built/components/text/text';
import LoaderInline from '@jetbrains/ring-ui-built/components/loader-inline/loader-inline';
import Table from '@jetbrains/ring-ui-built/components/table/table';
import Selection from '@jetbrains/ring-ui-built/components/table/selection';
import Select from '@jetbrains/ring-ui-built/components/select/select';
import {Type as SelectType} from '@jetbrains/ring-ui-built/components/select/select';
import Icon from '@jetbrains/ring-ui-built/components/icon/icon';
import fileCreateIcon from '@jetbrains/icons/file-create';
import trashIcon from '@jetbrains/icons/trash';
import pencilIcon from '@jetbrains/icons/pencil';
import eyeIcon from '@jetbrains/icons/eye';
import copyIcon from '@jetbrains/icons/copy';
import lockIcon from '@jetbrains/icons/lock';
import Tooltip from '@jetbrains/ring-ui-built/components/tooltip/tooltip';
import historyIcon from '@jetbrains/icons/history';
import moreOptionsIcon from '@jetbrains/icons/more-options';
import starIcon from '@jetbrains/icons/star-empty';
import starFilledIcon from '@jetbrains/icons/star-filled';
import API, {Template, YTProject, YTArticle} from '../../api';
import type {AlertType} from '@jetbrains/ring-ui-built/components/alert/alert';
import {TemplateEditor} from '../../components/TemplateEditor';
import {TemplateToolbar} from '../../components/TemplateToolbar';
import {useTemplateManager} from '../../hooks/useTemplateManager';

interface SelectedItem {
  key: string;
  label: string;
  shortName?: string;
}

const host = await YTApp.register();
const api = new API(host);

const getVal = (t: Template, key: string) => {
  if (key === 'name') {
    return t.name.toLowerCase();
  }
  return (t.author?.login || 'n/a').toLowerCase();
};

const sortTemplates = (data: Template[], sortKey: string | undefined, sortOrder: boolean) => {
  if (!sortKey) {
    return data;
  }
  return [...data].sort((a, b) => {
    const vA = getVal(a, sortKey);
    const vB = getVal(b, sortKey);
    if (vA === vB) {
      return 0;
    }
    const diff = vA < vB ? -1 : 1;
    return sortOrder ? diff : -diff;
  });
};

const AppComponent: React.FC = () => {
  const manager = useTemplateManager(host, api);
  const [projects, setProjects] = useState<YTProject[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Record<string, SelectedItem | null>>({});
  const [articlesByProject, setArticlesByProject] = useState<Record<string, YTArticle[]>>({});
  const [selectedParents, setSelectedParents] = useState<Record<string, SelectedItem | null>>({});

  const loadArticles = useCallback(async (projectKey: string) => {
    if (articlesByProject[projectKey]) {
      return;
    }
    try {
      const articles = await api.getArticles(projectKey);
      setArticlesByProject(prev => ({...prev, [projectKey]: articles}));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load articles for project ' + projectKey, e);
    }
  }, [articlesByProject]);

  const onProjectSelect = useCallback((templateId: string, project: SelectedItem | null) => {
    setSelectedProjects(prev => ({...prev, [templateId]: project}));
    setSelectedParents(prev => ({...prev, [templateId]: null}));
    if (project?.shortName) {
      loadArticles(project.shortName);
    }
  }, [loadArticles]);

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
      // eslint-disable-next-line no-console
      console.error('Failed to create article', e);
    }
  }, [selectedProjects, selectedParents, projects]);

  const {
    templates, deletedTemplates, viewMode, filter, sortKey, sortOrder, favorites, showFavoritesOnly, 
    authorFilter, projectFilter, onSetAuthorFilter, onSetProjectFilter, setSelection
  } = manager;

  useEffect(() => {
    templates.forEach(t => {
      if (t.projectId && !selectedProjects[t.id]) {
        const p = projects.find(prj => prj.shortName === t.projectId || prj.id === t.projectId);
        if (p) {
          onProjectSelect(t.id, {key: p.shortName || p.id, label: p.name, shortName: p.shortName});
        }
      }
    });
  }, [templates, projects, onProjectSelect, selectedProjects]);

  const {loadData} = manager;
  useEffect(() => {
    loadData(async () => {
      const pData = await api.getProjects();
      setProjects(pData || []);
    });
  }, [loadData]);

  const authors = useMemo(() => {
    const map = new Map<string, string>();
    let hasNoAuthor = false;
    
    templates.forEach(t => {
      const authorId = t.author?.id || t.author?.login;
      if (authorId && t.author?.login) {
        map.set(authorId, t.author.login);
      } else {
        hasNoAuthor = true;
      }
    });

    const result = Array.from(map.entries()).map(([key, label]) => ({key, label}));
    if (hasNoAuthor) {
      result.push({key: 'no-author', label: 'n/a'});
    }
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [templates]);

  const filterProjects = useMemo(() => {
    const pSet = new Map<string, string>();
    templates.forEach(t => {
      if (t.projectId && t.projectName) {
        pSet.set(t.projectId, t.projectName);
      } else {
        pSet.set('all', 'All projects');
      }
    });
    const result = Array.from(pSet.entries()).map(([key, label]) => ({key, label}));
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [templates]);

  const visibleData = useMemo(() => {
    let data = (viewMode === 'active' ? templates : deletedTemplates) as Template[];
    if (viewMode === 'active' && showFavoritesOnly) {
      data = data.filter(t => favorites.includes(t.id));
    }
    if (authorFilter.length > 0) {
      data = data.filter(t => {
        const authorId = t.author?.id || t.author?.login;
        if (!authorId) {
          return authorFilter.includes('no-author');
        }
        return authorFilter.includes(authorId);
      });
    }
    if (projectFilter.length > 0) {
      data = data.filter(t => {
        if (!t.projectId) {
          return projectFilter.includes('all');
        }
        return projectFilter.includes(t.projectId);
      });
    }
    if (filter.trim()) {
      data = data.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));
    }
    return sortTemplates(data, sortKey, sortOrder);
  }, [templates, deletedTemplates, viewMode, filter, sortKey, sortOrder, favorites, showFavoritesOnly, authorFilter, projectFilter]);

  useEffect(() => {
    setSelection(new Selection({data: visibleData}));
  }, [visibleData, setSelection]);

  useEffect(() => {
    if (visibleData.length === 0 && !filter.trim()) {
      const baseData = viewMode === 'active' ? templates : deletedTemplates;
      if (baseData.length > 0) {
        if (authorFilter.length > 0) {
          onSetAuthorFilter([]);
        }
        if (projectFilter.length > 0) {
          onSetProjectFilter([]);
        }
      }
    }
  }, [visibleData.length, filter, authorFilter, projectFilter, templates, deletedTemplates, viewMode, onSetAuthorFilter, onSetProjectFilter]);

  const projectOptions: SelectedItem[] = useMemo(() => projects.map(p => ({
    key: p.shortName || p.id, label: p.name, shortName: p.shortName
  })), [projects]);

  const columns = manager.viewMode === 'active' ? [
    {
      id: 'favorite', width: '32px',
      getValue: (t: Template) => {
        const isFav = favorites.includes(t.id);
        return (
          <Button 
            icon={isFav ? starFilledIcon : starIcon}
            onClick={() => manager.onToggleFavorite(t.id)}
            title={isFav ? "Remove from favorites" : "Add to favorites"}
            className={isFav ? 'favorite-active' : 'favorite-inactive'}
          />
        );
      }
    },
    {
      id: 'name', title: 'Name', sortable: true, width: '300px',
      getValue: (t: Template) => (
        <div className="nameWrapper" style={{maxWidth: '300px', overflow: 'hidden'}}>
          <Text className="nameText" title={t.name}>{t.name}</Text>
          {t.isPrivate && (
            <Icon 
              glyph={lockIcon} 
              title="Private" 
              className="nameIcon"
              style={{color: 'var(--ring-secondary-color)'}}
            />
          )}
        </div>
      )
    },
    {
      id: 'author', title: 'Author', sortable: true, width: '150px',
      getValue: (t: Template) => (
        <Text style={{color: 'var(--ring-secondary-color)'}}>{t.author?.login || 'n/a'}</Text>
      )
    },
    {
      id: 'project', title: 'Project', width: '200px',
      getValue: (t: Template) => {
        const isLocked = !!t.projectId;
        const project = isLocked 
          ? {key: t.projectId!, label: t.projectName || t.projectId!}
          : (selectedProjects[t.id] || null);

        const content = (
          <Select<SelectedItem>
            type={SelectType.INLINE} 
            data={projectOptions}
            selected={project as SelectedItem}
            onSelect={item => onProjectSelect(t.id, item)}
            filter 
            clear
            disabled={isLocked}
            maxHeight={400}
          />
        );

        if (isLocked) {
          return (
            <Tooltip title="This template is tied to a specific project and cannot be used in others">
              {content}
            </Tooltip>
          );
        }
        return content;
      }
    },
    {
      id: 'parent', title: 'Parent Article', width: '200px',
      getValue: (t: Template) => {
        const project = t.projectId 
          ? projects.find(p => p.shortName === t.projectId || p.id === t.projectId)
          : selectedProjects[t.id];
        const articles = project?.shortName ? (articlesByProject[project.shortName] || []) : [];
        const options: SelectedItem[] = articles.map(a => ({key: a.idReadable, label: a.summary}));

        return (
          <Select<SelectedItem>
            className="tableSelect" 
            type={SelectType.INLINE} 
            data={options}
            selected={selectedParents[t.id] || null}
            onSelect={item => setSelectedParents(prev => ({...prev, [t.id]: item}))}
            filter 
            clear 
            disabled={!project}
            loading={!!(project && !articlesByProject[project.shortName!])}
            disableScrollToActive 
            preventListOverscroll
            maxHeight={400}
          />
        );
      }
    },
    {
      id: 'create', width: '40px',
      getValue: (t: Template) => {
        const project = t.projectId 
          ? projects.find(p => p.shortName === t.projectId || p.id === t.projectId)
          : selectedProjects[t.id];
        return (
          <Button 
            icon={fileCreateIcon} 
            onClick={() => onCreateArticle(t)}
            title={!project ? "Please select a project first" : "Create Article"}
          />
        );
      }
    },
    {
      id: 'actions', width: '40px',
      getValue: (t: Template) => (
        <DropdownMenu
          anchor={<Button icon={moreOptionsIcon}/>}
          data={[
            {
              label: 'Clone',
              glyph: copyIcon,
              onClick: () => manager.onClone(t)
            },
            {
              label: t.canEdit ? 'Edit' : 'View',
              glyph: t.canEdit ? pencilIcon : eyeIcon,
              onClick: () => manager.setEditingTemplate(t)
            },
            t.canEdit ? {
              label: 'Delete',
              glyph: trashIcon,
              danger: true,
              className: 'removeOption',
              onClick: () => manager.onDelete(t.id)
            } : null
          ].filter(item => !!item) as readonly ListDataItem[]}
        />
      )
    }
  ] : [
    {
      id: 'favorite', width: '32px',
      getValue: (t: Template) => {
        const isFav = favorites.includes(t.id);
        return (
          <Button 
            icon={isFav ? starFilledIcon : starIcon}
            className={isFav ? 'favorite-active' : 'favorite-inactive'}
            style={{cursor: 'default', pointerEvents: 'none'}}
          />
        );
      }
    },
    {
      id: 'name', title: 'Name', sortable: true, width: '300px',
      getValue: (t: Template) => (
        <div className="nameWrapper" style={{maxWidth: '300px', overflow: 'hidden'}}>
          <Text className="nameText" title={t.name}>{t.name}</Text>
          {t.isPrivate && (
            <Icon 
              glyph={lockIcon} 
              title="Private" 
              className="nameIcon"
              style={{color: 'var(--ring-secondary-color)'}}
            />
          )}
        </div>
      )
    },
    {
      id: 'author', title: 'Author', sortable: true, width: '150px',
      getValue: (t: Template) => (
        <Text style={{color: 'var(--ring-secondary-color)'}}>{t.author?.login || 'n/a'}</Text>
      )
    },
    {
      id: 'project', title: 'Project', width: '200px',
      getValue: (t: Template) => (
        <Select<SelectedItem>
          type={SelectType.INLINE} 
          data={projectOptions}
          selected={t.projectId ? {key: t.projectId, label: t.projectName || t.projectId} as SelectedItem : {key: 'all', label: 'All projects'} as SelectedItem}
          disabled
          maxHeight={400}
        />
      )
    },
    {
      id: 'actions', width: '40px',
      getValue: (t: Template) => (
        <DropdownMenu
          anchor={<Button icon={moreOptionsIcon}/>}
          data={[
            {
              label: 'Restore',
              glyph: historyIcon,
              onClick: () => manager.onRestore(t.id)
            },
            {
              label: 'Delete Forever',
              glyph: trashIcon,
              danger: true,
              className: 'removeOption',
              onClick: () => manager.onPermanentDelete(t.id)
            }
          ]}
        />
      )
    }
  ];

  if (manager.loading) {
    return <LoaderInline/>;
  }
  if (manager.editingTemplate) {
    return (
      <TemplateEditor 
        template={manager.editingTemplate} 
        onSave={manager.onSave}
        onCancel={() => manager.setEditingTemplate(null)}
        onChange={manager.setEditingTemplate} 
        onDelete={manager.onDelete}
        projects={projects}
        isReadOnly={manager.editingTemplate.id ? !manager.editingTemplate.canEdit : false}
      />
    );
  }

  return (
    <div className="widget">
      <TemplateToolbar
        viewMode={viewMode} 
        onAdd={() => manager.setEditingTemplate({isPrivate: true})}
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
        onSelect={manager.setSelection} 
        sortKey={manager.sortKey}
        sortOrder={manager.sortOrder}
        onSort={manager.onSort}
        getItemKey={item => item.id}
        renderEmpty={() => (
          <div style={{padding: '16px', textAlign: 'center'}}>
            <Text>
              {manager.viewMode === 'active' ? 'No templates found.' : 'No deleted templates found.'}
            </Text>
          </div>
        )}
      />
    </div>
  );
};

export const App = memo(AppComponent);
