import React, {memo, useCallback, useEffect, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import ButtonSet from '@jetbrains/ring-ui-built/components/button-set/button-set';
import Input, {Size} from '@jetbrains/ring-ui-built/components/input/input';
import Toggle from '@jetbrains/ring-ui-built/components/toggle/toggle';
import Select from '@jetbrains/ring-ui-built/components/select/select';
import LoaderInline from '@jetbrains/ring-ui-built/components/loader-inline/loader-inline';
import Text from '@jetbrains/ring-ui-built/components/text/text';
import API, {Template, YTProject} from '../../api';
import type {AlertType} from "@jetbrains/ring-ui-built/components/alert/alert";

const host = await YTApp.register();
const api = new API(host);

const AppComponent: React.FunctionComponent = () => {
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [lockedForOthers, setLockedForOthers] = useState(false);
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [projects, setProjects] = useState<YTProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [article, projectsData] = await Promise.all([
          api.getArticleData(),
          api.getProjects()
        ]);
        
        setName(article.summary || '');
        setSummary(article.summary || '');
        setContent(article.content || '');
        setProjectId(article.projectId);
        setProjects(projectsData || []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load initial data', e);
        host.alert('Failed to load initial data', 'error' as AlertType.ERROR);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  const onSave = useCallback(async () => {
    if (!name.trim()) {
      return;
    }

    setSaving(true);
    try {
      const newTemplate: Omit<Template, 'id'> = {
        name: name.trim(),
        summary,
        content,
        isPrivate,
        lockedForOthers,
        projectId,
        createdAt: Date.now(),
        usageCount: 0
      };
      
      await api.addTemplate(newTemplate);
      host.alert('Template created', 'success' as AlertType.SUCCESS);
      host.closeWidget();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to create template', e);
      host.alert('Failed to create template', 'error' as AlertType.ERROR);
    } finally {
      setSaving(false);
    }
  }, [name, summary, content, isPrivate, lockedForOthers, projectId]);

  if (loading) {
    return <LoaderInline/>;
  }

  const projectOptions = [
    {label: 'All projects', key: 'all'},
    ...projects.map(p => ({label: p.name, key: p.shortName || p.id}))
  ];
  const selectedProject = projectOptions.find(p => p.key === (projectId || 'all')) || projectOptions[0];

  return (
    <div className="widget" style={{padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
      <Input
        label="Template Name"
        value={name}
        onChange={e => setName(e.target.value)}
        size={Size.FULL}
        autoFocus
      />

      <Input
        label="Article Summary"
        value={summary}
        onChange={e => setSummary(e.target.value)}
        size={Size.FULL}
      />

      <Input
        label="Article Content"
        multiline
        value={content}
        onChange={e => setContent(e.target.value)}
        size={Size.FULL}
        className="contentTextarea"
      />

      <div>
        <div style={{fontSize: '12px', color: 'var(--ring-secondary-color)', marginBottom: '4px'}}>{'Project'}</div>
        <Select
          data={projectOptions}
          selected={selectedProject}
          onSelect={item => item && setProjectId(item.key === 'all' ? undefined : item.key)}
          size={Size.FULL}
          filter
          maxHeight={400}
        />
      </div>

      <Toggle
        checked={isPrivate}
        onChange={e => setIsPrivate(e.target.checked)}
      >
        {'Private template'}
      </Toggle>

      <Toggle
        checked={lockedForOthers}
        onChange={e => setLockedForOthers(e.target.checked)}
      >
        {lockedForOthers 
          ? 'Only author and admins can edit' 
          : 'Anyone can edit'}
      </Toggle>

      <Text info style={{fontSize: '12px', color: 'var(--ring-secondary-color)'}}>
        {'Please note: Article attachments will not be saved in the template.'}
      </Text>

      <ButtonSet>
        <Button 
          primary 
          onClick={onSave} 
          disabled={!name.trim() || saving}
          loader={saving}
        >
          {'Create template'}
        </Button>
        <Button onClick={() => host.closeWidget()}>
          {'Cancel'}
        </Button>
      </ButtonSet>
    </div>
  );
};

export const App = memo(AppComponent);
