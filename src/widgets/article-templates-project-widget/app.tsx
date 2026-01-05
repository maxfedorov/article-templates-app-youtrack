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
import API, {Template, YTArticle} from '../../api';
import {TemplateEditor} from '../../components/TemplateEditor';
import {TemplateToolbar} from '../../components/TemplateToolbar';
import {useTemplateManager} from '../../hooks/useTemplateManager';

interface SelectedItem {
  key: string;
  label: string;
}

const host = await YTApp.register();
const api = new API(host);

const AppComponent: React.FC = () => {
  const manager = useTemplateManager(host, api);
  const [articles, setArticles] = useState<YTArticle[]>([]);
  const [selectedParents, setSelectedParents] = useState<Record<string, SelectedItem | null>>({});

  const {loadData} = manager;
  useEffect(() => {
    loadData(async () => {
      const entity = YTApp.entity as {shortName?: string, id?: string};
      const projectKey = entity?.shortName || entity?.id;
      if (projectKey) {
        const aData = await api.getArticles(projectKey);
        setArticles(aData || []);
      }
    });
  }, [loadData]);

  const onCreateArticle = useCallback(async (template: Template) => {
    try {
      const result = await api.createDraftInProject(
        template.summary, 
        template.content, 
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
  }, [selectedParents]);

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

  const options: SelectedItem[] = useMemo(() => articles.map(a => ({
    key: a.idReadable, label: a.summary
  })), [articles]);

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
      id: 'parent', title: 'Parent Article',
      getValue: (t: Template) => (
        <Select<SelectedItem>
          className="tableSelect" 
          type={SelectType.INLINE} 
          data={options}
          selected={selectedParents[t.id] || null}
          onSelect={item => setSelectedParents(prev => ({...prev, [t.id]: item}))}
          filter 
          clear 
          disableScrollToActive 
          preventListOverscroll
        />
      )
    },
    {
      id: 'create', width: '40px',
      getValue: (t: Template) => (
        <Button icon={fileCreateIcon} onClick={() => onCreateArticle(t)} title="Create Article"/>
      )
    },
    {
      id: 'edit', width: '40px',
      getValue: (t: Template) => (
        <Button icon={pencilIcon} onClick={() => manager.setEditingTemplate(t)} title="Edit Template"/>
      )
    },
    {
      id: 'delete', width: '40px',
      getValue: (t: Template) => (
        <Button danger icon={trashIcon} onClick={() => manager.onDelete(t.id)} title="Delete Template"/>
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
        <Button icon={historyIcon} onClick={() => manager.onRestore(t.id)} title="Restore Template"/>
      )
    },
    {
      id: 'permanent-delete', width: '40px',
      getValue: (t: Template) => (
        <Button danger icon={trashIcon} onClick={() => manager.onPermanentDelete(t.id)} title="Permanently Delete"/>
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
            <Text>{manager.viewMode === 'active' ? 'No templates found.' : 'No deleted templates found.'}</Text>
          </div>
        )}
      />
    </div>
  );
};

export const App = memo(AppComponent);
