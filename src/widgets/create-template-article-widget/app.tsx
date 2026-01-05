import React, {memo, useCallback, useEffect, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import ButtonSet from '@jetbrains/ring-ui-built/components/button-set/button-set';
import Input, {Size} from '@jetbrains/ring-ui-built/components/input/input';
import Toggle from '@jetbrains/ring-ui-built/components/toggle/toggle';
import LoaderInline from '@jetbrains/ring-ui-built/components/loader-inline/loader-inline';
import API, {Template} from '../../api';
import type {AlertType} from "@jetbrains/ring-ui-built/components/alert/alert";

const host = await YTApp.register();
const api = new API(host);

const AppComponent: React.FunctionComponent = () => {
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadArticleData() {
      try {
        const article = await api.getArticleData();
        
        setSummary(article.summary || '');
        setContent(article.content || '');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load article data', e);
        host.alert('Failed to load article data', 'error' as AlertType.ERROR);
      } finally {
        setLoading(false);
      }
    }

    loadArticleData();
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
  }, [name, summary, content, isPrivate]);

  if (loading) {
    return <LoaderInline/>;
  }

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

      <Toggle
        checked={isPrivate}
        onChange={e => setIsPrivate(e.target.checked)}
      >
        {'Private Template'}
      </Toggle>

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
