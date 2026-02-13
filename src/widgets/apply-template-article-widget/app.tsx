import React, {memo, useCallback, useEffect, useState, useMemo} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import ButtonSet from '@jetbrains/ring-ui-built/components/button-set/button-set';
import Select from '@jetbrains/ring-ui-built/components/select/select';
import {Size} from '@jetbrains/ring-ui-built/components/input/input';
import LoaderInline from '@jetbrains/ring-ui-built/components/loader-inline/loader-inline';
import API, {Template, YTProject, YTArticle} from '../../api';
import type {AlertType} from '@jetbrains/ring-ui-built/components/alert/alert';
import starIcon from '@jetbrains/icons/star-empty';
import starFilledIcon from '@jetbrains/icons/star-filled';

import './app.css';

interface SelectedItem {
  key: string;
  label: string;
  shortName?: string;
  glyph?: string;
  className?: string;
}

const host = await YTApp.register();
const api = new API(host);

const AppComponent: React.FunctionComponent = () => {
  const [projects, setProjects] = useState<YTProject[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<SelectedItem | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedItem | null>(null);
  const [selectedParent, setSelectedParent] = useState<SelectedItem | null>(null);
  const [articlesByProject, setArticlesByProject] = useState<Record<string, YTArticle[]>>({});
  
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [projectsData, templatesData, prefs] = await Promise.all([
          api.getProjects(),
          api.getTemplates(),
          api.getUserPreferences()
        ]);
        setProjects(projectsData || []);
        setTemplates(templatesData || []);
        setFavorites(prefs?.favorites || []);
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

  const onProjectSelect = useCallback((project: SelectedItem | null) => {
    setSelectedProject(project);
    setSelectedTemplate(null);
    setSelectedParent(null);
  }, []);

  // eslint-disable-next-line complexity
  const onApply = useCallback(async () => {
    if (!selectedProject || !selectedTemplate) {
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate.key);
    if (!template) {
      return;
    }

    setApplying(true);
    try {
      const result = await api.createDraft(
        template.summary,
        template.content,
        selectedProject.shortName || selectedProject.key,
        selectedParent?.key,
        template.id
      );
      if (result.url) {
        window.open(result.url, '_blank');
        host.closeWidget();
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to create article', e);
      host.alert('Failed to apply template', 'error' as AlertType.ERROR);
    } finally {
      setApplying(false);
    }
  }, [selectedProject, selectedTemplate, selectedParent, templates]);

  const projectOptions: SelectedItem[] = useMemo(() => projects.map(p => ({
    key: p.shortName || p.id, label: p.name, shortName: p.shortName
  })), [projects]);

  const filteredTemplates = useMemo(() => {
    if (!selectedProject) {
      return [];
    }
    const projectKey = selectedProject.shortName || selectedProject.key;
    const filtered = templates.filter(t => !t.projectId || t.projectId === projectKey);
    
    return [...filtered].sort((a, b) => {
      const isFavA = favorites.includes(a.id);
      const isFavB = favorites.includes(b.id);
      if (isFavA !== isFavB) {
        return isFavA ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [templates, selectedProject, favorites]);

  const templateOptions: SelectedItem[] = useMemo(() => filteredTemplates.map(t => ({
    key: t.id,
    label: t.name,
    glyph: favorites.includes(t.id) ? starFilledIcon : starIcon,
    className: favorites.includes(t.id) ? 'favorite-active' : 'favorite-inactive'
  })), [filteredTemplates, favorites]);

  const parentOptions: SelectedItem[] = useMemo(() => {
    const articles = selectedProject?.shortName ? (articlesByProject[selectedProject.shortName] || []) : [];
    return articles.map(a => ({
      key: a.idReadable, label: a.summary
    }));
  }, [selectedProject, articlesByProject]);

  if (loading) {
    return <LoaderInline/>;
  }

  return (
    <div className="widget">
      <div className="field">
        <div className="label">{'Select Project'}</div>
        <Select<SelectedItem>
          data={projectOptions}
          selected={selectedProject}
          onSelect={onProjectSelect}
          filter
          label="Select project"
          maxHeight={400}
          size={Size.FULL}
        />
      </div>

      <div className="field">
        <div className="label">{'Select Parent Article (optional)'}</div>
        <Select<SelectedItem>
          data={parentOptions}
          selected={selectedParent}
          onSelect={setSelectedParent}
          onOpen={() => selectedProject?.shortName && loadArticles(selectedProject.shortName)}
          filter
          clear
          disabled={!selectedProject}
          loading={!!(selectedProject && selectedProject.shortName && !articlesByProject[selectedProject.shortName])}
          label="Select parent article"
          maxHeight={400}
          size={Size.FULL}
        />
      </div>

      <div className="field">
        <div className="label">{'Select Template'}</div>
        <Select<SelectedItem>
          data={templateOptions}
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
          filter
          disabled={!selectedProject}
          label={selectedProject ? "Select template" : "Select project first"}
          maxHeight={400}
          size={Size.FULL}
        />
      </div>

      <ButtonSet>
        <Button 
          primary 
          onClick={onApply} 
          disabled={!selectedProject || !selectedTemplate || applying}
          loader={applying}
        >
          {'Apply Template'}
        </Button>
        <Button onClick={() => host.closeWidget()}>
          {'Cancel'}
        </Button>
      </ButtonSet>
    </div>
  );
};

export const App = memo(AppComponent);
