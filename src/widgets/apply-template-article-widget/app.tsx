/**
 * The "Apply article template" menu item.
 *
 * Templates bound to another project are hidden, favourites float to the top, and applying one
 * reloads the host page -- the article editor has no way of learning about the backend write.
 */

import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import ButtonSet from '@jetbrains/ring-ui-built/components/button-set/button-set';
import LoaderInline from '@jetbrains/ring-ui-built/components/loader-inline/loader-inline';
import Text from '@jetbrains/ring-ui-built/components/text/text';
import type {AlertType} from '@jetbrains/ring-ui-built/components/alert/alert';
import starIcon from '@jetbrains/icons/star-empty';
import starFilledIcon from '@jetbrains/icons/star-filled';
import type {Template} from '@/common/types';
import {createTemplatesApi} from '../shared/api';
import type {ApplyTemplateResult, ArticleData} from '../shared/api';
import {ApplyTemplateForm} from '../shared/ApplyTemplateForm';
import type {TemplateOption} from '../shared/ApplyTemplateForm';

const host = await YTApp.register();
const api = createTemplatesApi(host);

/**
 * The widget is shown both for drafts (`entity.draft`) and for published articles opened in the
 * content editor (`entity.isEditing`). YouTrack routes the app endpoint to `users/me/articleDrafts/{id}`
 * only for drafts; for a published article the backend always receives the article itself, so the
 * template cannot be written into the editing draft and lands in the published article instead.
 */
const isPublishedArticle = YTApp.entity?.type === 'article' && YTApp.entity?.draft !== true;

/**
 * Reloads the YouTrack page the widget is embedded into, so that the article
 * editor picks up the summary and content written by the backend.
 */
function reloadArticlePage(url: string | undefined): void {
  const referrer = document.referrer;
  const target = referrer.includes('/articles') ? referrer : url;
  if (target) {
    window.parent.location.href = target;
  }
}

function trimmed(value: string | undefined): string {
  return value ? value.trim() : '';
}

function isDraftEmpty(article: ArticleData | null): boolean {
  if (!article) {
    return true;
  }
  return !trimmed(article.summary) && !trimmed(article.content);
}

/** An empty template summary must not wipe the title the user has already typed. */
function resolveSummary(template: Template, article: ArticleData | null): string {
  return template.summary || article?.summary || '';
}

function resolveUrl(result: ApplyTemplateResult, article: ArticleData | null): string | undefined {
  return result?.url || article?.url;
}

function toOption(template: Template, favorite: boolean): TemplateOption {
  return {
    key: template.id,
    label: template.name,
    glyph: favorite ? starFilledIcon : starIcon,
    className: favorite ? 'favorite-active' : 'favorite-inactive'
  };
}

function compareTemplates(a: Template, b: Template, isFavorite: (t: Template) => boolean): number {
  if (isFavorite(a) !== isFavorite(b)) {
    return isFavorite(a) ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
}

function buildOptions(templates: Template[], projectId: string | undefined, favorites: string[]): TemplateOption[] {
  const isFavorite = (t: Template) => favorites.includes(t.id);
  return templates
    .filter(t => !t.projectId || t.projectId === projectId)
    .sort((a, b) => compareTemplates(a, b, isFavorite))
    .map(t => toOption(t, isFavorite(t)));
}

async function trackUsage(templateId: string): Promise<void> {
  try {
    await api.incrementTemplateUsage(templateId);
  } catch (e) {
    console.error('Failed to update template usage counter', e);
  }
}

async function applyToArticle(template: Template, article: ArticleData | null): Promise<void> {
  const result = await api.applyTemplate(resolveSummary(template, article), template.content || '');
  await trackUsage(template.id);
  host.alert('Template applied', 'success' as AlertType.SUCCESS);
  reloadArticlePage(resolveUrl(result, article));
  host.closeWidget();
}

const LoadError: React.FunctionComponent<{onClose: () => void}> = ({onClose}) => (
  <div className="widget">
    <Text>{'Failed to read the current article.'}</Text>
    <Text info>{'Reload the page and try again.'}</Text>
    <ButtonSet>
      <Button onClick={onClose}>{'Close'}</Button>
    </ButtonSet>
  </div>
);

const AppComponent: React.FunctionComponent = () => {
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selected, setSelected] = useState<TemplateOption | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [articleData, templatesData, prefs] = await Promise.all([
          api.getArticleData(),
          api.getTemplates(),
          api.getUserPreferences()
        ]);
        setArticle(articleData);
        setTemplates(templatesData);
        setFavorites(prefs?.favorites || []);
      } catch (e) {
        console.error('Failed to load initial data', e);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // The warning about replaced content is rendered upfront, so a single click applies the template.
  const onApply = useCallback(async () => {
    const template = templates.find(t => t.id === selected?.key);
    if (!template) {
      return;
    }
    setApplying(true);
    try {
      await applyToArticle(template, article);
    } catch (e) {
      console.error('Failed to apply template', e);
      host.alert('Failed to apply template', 'error' as AlertType.ERROR);
    } finally {
      setApplying(false);
    }
  }, [templates, selected, article]);

  const onSelect = useCallback((option: TemplateOption | null) => setSelected(option), []);

  const onCancel = useCallback(() => host.closeWidget(), []);

  const options = useMemo(
    () => buildOptions(templates, article?.projectId, favorites),
    [templates, article, favorites]
  );

  if (loading) {
    return <LoaderInline/>;
  }

  if (loadError) {
    return <LoadError onClose={onCancel}/>;
  }

  return (
    <ApplyTemplateForm
      options={options}
      selected={selected}
      published={isPublishedArticle}
      notEmpty={!isDraftEmpty(article)}
      applying={applying}
      onSelect={onSelect}
      onApply={onApply}
      onCancel={onCancel}
    />
  );
};

export const App = memo(AppComponent);
