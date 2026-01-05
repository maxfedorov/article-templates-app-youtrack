import React, {memo, useCallback, useEffect, useState, useMemo} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
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
import lockIcon from '@jetbrains/icons/lock';
import historyIcon from '@jetbrains/icons/history';
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
    const project = selectedProjects[template.id];
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
  }, [selectedProjects, selectedParents]);

  const {loadData} = manager;
  useEffect(() => {
    loadData(async () => {
      const pData = await api.getProjects();
      setProjects(pData || []);
    });
  }, [loadData]);

  const {templates, deletedTemplates, viewMode, filter, sortKey, sortOrder} = manager;
  const visibleData = useMemo(() => {
    let data = viewMode === 'active' ? templates : deletedTemplates;
    if (filter.trim()) {
      data = data.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));
    }
    if (sortKey === 'name') {
      data = [...data].sort((a, b) => {
        const valA = a.name.toLowerCase();
        const valB = b.name.toLowerCase();
        if (valA < valB) {
          return sortOrder ? -1 : 1;
        }
        if (valA > valB) {
          return sortOrder ? 1 : -1;
        }
        return 0;
      });
    }
    return data;
  }, [templates, deletedTemplates, viewMode, filter, sortKey, sortOrder]);

  const {setSelection} = manager;
  useEffect(() => {
    setSelection(new Selection({data: visibleData}));
  }, [visibleData, setSelection]);

  const projectOptions: SelectedItem[] = useMemo(() => projects.map(p => ({
    key: p.id, label: p.name, shortName: p.shortName
  })), [projects]);

  const columns = manager.viewMode === 'active' ? [
    {
      id: 'name', title: 'Name', sortable: true,
      getValue: (t: Template) => (
        <div>
          <Text>{t.name}</Text>
          {t.isPrivate && (
            <Icon 
              glyph={lockIcon} 
              title="Private" 
              style={{paddingLeft: 'var(--ring-unit)', color: 'var(--ring-secondary-color)'}}
            />
          )}
        </div>
      )
    },
    {
      id: 'project', title: 'Project',
      getValue: (t: Template) => (
        <Select<SelectedItem>
          type={SelectType.INLINE} 
          data={projectOptions}
          selected={selectedProjects[t.id] || null}
          onSelect={item => onProjectSelect(t.id, item)}
          filter 
          clear
        />
      )
    },
    {
      id: 'parent', title: 'Parent Article',
      getValue: (t: Template) => {
        const project = selectedProjects[t.id];
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
          />
        );
      }
    },
    {
      id: 'create', width: '40px',
      getValue: (t: Template) => (
        <Button 
          icon={fileCreateIcon} 
          onClick={() => onCreateArticle(t)}
          title={!selectedProjects[t.id] ? "Please select a project first" : "Create Article"}
        />
      )
    },
    {
      id: 'edit', width: '40px',
      getValue: (t: Template) => (
        <Button 
          icon={pencilIcon} 
          onClick={() => manager.setEditingTemplate(t)} 
          title="Edit Template"
        />
      )
    },
    {
      id: 'delete', width: '40px',
      getValue: (t: Template) => (
        <Button 
          danger 
          icon={trashIcon} 
          onClick={() => manager.onDelete(t.id)} 
          title="Delete Template"
        />
      )
    }
  ] : [
    {
      id: 'name', title: 'Name', sortable: true,
      getValue: (t: Template) => (
        <div>
          <Text>{t.name}</Text>
          {t.isPrivate && (
            <Icon 
              glyph={lockIcon} 
              title="Private" 
              style={{paddingLeft: 'var(--ring-unit)', color: 'var(--ring-secondary-color)'}}
            />
          )}
        </div>
      )
    },
    {
      id: 'restore', width: '40px',
      getValue: (t: Template) => (
        <Button 
          icon={historyIcon} 
          onClick={() => manager.onRestore(t.id)} 
          title="Restore Template"
        />
      )
    },
    {
      id: 'permanent-delete', width: '40px',
      getValue: (t: Template) => (
        <Button 
          danger 
          icon={trashIcon} 
          onClick={() => manager.onPermanentDelete(t.id)} 
          title="Permanently Delete"
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
      />
    );
  }

  return (
    <div className="widget">
      <TemplateToolbar
        viewMode={manager.viewMode} 
        onAdd={() => manager.setEditingTemplate({isPrivate: true})}
        onImport={manager.onImport} 
        onShowDeleted={() => manager.setViewMode('deleted')}
        onBackToList={() => manager.setViewMode('active')}
        onBulkDelete={manager.onBulkDelete} 
        onBulkRestore={manager.onBulkRestore}
        selectedCount={manager.selection.getSelected().size}
        purgeIntervalDays={manager.settings?.purgeIntervalDays}
        filter={manager.filter} 
        onFilterChange={manager.setFilter}
      />
      <Table
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
