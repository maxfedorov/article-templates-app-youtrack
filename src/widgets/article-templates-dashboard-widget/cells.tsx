/**
 * Cell components of the template table.
 *
 * They live apart from `columns.tsx` so that each file exports one kind of thing -- components
 * here, column definitions there -- which is also what React Fast Refresh expects.
 */

import React from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import DropdownMenu from '@jetbrains/ring-ui-built/components/dropdown-menu/dropdown-menu';
import Icon from '@jetbrains/ring-ui-built/components/icon/icon';
import Select, {Type as SelectType} from '@jetbrains/ring-ui-built/components/select/select';
import Text from '@jetbrains/ring-ui-built/components/text/text';
import Tooltip from '@jetbrains/ring-ui-built/components/tooltip/tooltip';
import type {ListDataItem} from '@jetbrains/ring-ui-built/components/list/list';
import fileCreateIcon from '@jetbrains/icons/file-create';
import lockIcon from '@jetbrains/icons/lock';
import moreOptionsIcon from '@jetbrains/icons/more-options';
import starFilledIcon from '@jetbrains/icons/star-filled';
import starIcon from '@jetbrains/icons/star-empty';
import type {Template, YTArticle, YTProject} from '@/common/types';

const SELECT_MAX_HEIGHT = 400;
const LOCKED_PROJECT_HINT = 'This template is tied to a specific project and cannot be used in others';

const SECONDARY_STYLE = {color: 'var(--ring-secondary-color)'};
const NAME_STYLE = {maxWidth: '300px', overflow: 'hidden'};
const STATIC_STAR_STYLE = {cursor: 'default', pointerEvents: 'none' as const};

/** An entry of the project and parent-article dropdowns. */
export interface ProjectItem {
  key: string;
  label: string;
  shortName?: string;
}

/** Everything the cells need; the widget rebuilds it whenever one of these values changes. */
export interface ColumnsContext {
  favorites: string[];
  projects: YTProject[];
  projectOptions: ProjectItem[];
  selectedProjects: Record<string, ProjectItem | null>;
  selectedParents: Record<string, ProjectItem | null>;
  articlesByProject: Record<string, YTArticle[]>;
  onToggleFavorite: (id: string) => void;
  onProjectSelect: (templateId: string, project: ProjectItem | null) => void;
  onParentSelect: (templateId: string, parent: ProjectItem | null) => void;
  onLoadArticles: (projectKey: string) => void;
  onCreateArticle: (template: Template) => void;
  onClone: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

/** A template bound to a project always uses it; for the others the user picks one per row. */
function resolveProject(ctx: ColumnsContext, template: Template): {shortName?: string} | null | undefined {
  if (!template.projectId) {
    return ctx.selectedProjects[template.id];
  }
  return ctx.projects.find(p => p.shortName === template.projectId || p.id === template.projectId);
}

export const FavoriteCell: React.FC<{isFavorite: boolean, onToggle?: () => void}> = ({isFavorite, onToggle}) => {
  const toggleTitle = isFavorite ? 'Remove from favorites' : 'Add to favorites';
  return (
    <Button
      icon={isFavorite ? starFilledIcon : starIcon}
      onClick={onToggle}
      title={onToggle ? toggleTitle : undefined}
      className={isFavorite ? 'favorite-active' : 'favorite-inactive'}
      style={onToggle ? undefined : STATIC_STAR_STYLE}
    />
  );
};

export const NameCell: React.FC<{template: Template}> = ({template}) => (
  <div className="nameWrapper" style={NAME_STYLE}>
    <Text className="nameText" title={template.name}>{template.name}</Text>
    {template.isPrivate && (
      <Icon glyph={lockIcon} title="Private" className="nameIcon" style={SECONDARY_STYLE}/>
    )}
  </div>
);

export const AuthorCell: React.FC<{template: Template}> = ({template}) => (
  <Text style={SECONDARY_STYLE}>{template.author?.login || 'n/a'}</Text>
);

export const ProjectCell: React.FC<{ctx: ColumnsContext, template: Template}> = ({ctx, template}) => {
  const boundProjectId = template.projectId;
  const select = (
    <Select<ProjectItem>
      type={SelectType.INLINE}
      data={ctx.projectOptions}
      selected={boundProjectId
        ? {key: boundProjectId, label: template.projectName || boundProjectId}
        : ctx.selectedProjects[template.id] || null}
      onSelect={item => ctx.onProjectSelect(template.id, item)}
      filter
      clear
      disabled={Boolean(boundProjectId)}
      maxHeight={SELECT_MAX_HEIGHT}
    />
  );

  if (!boundProjectId) {
    return select;
  }
  return <Tooltip title={LOCKED_PROJECT_HINT}>{select}</Tooltip>;
};

/** The project of a deleted template is shown as a disabled dropdown, for a uniform table layout. */
export const DeletedProjectCell: React.FC<{ctx: ColumnsContext, template: Template}> = ({ctx, template}) => (
  <Select<ProjectItem>
    type={SelectType.INLINE}
    data={ctx.projectOptions}
    selected={template.projectId
      ? {key: template.projectId, label: template.projectName || template.projectId}
      : {key: 'all', label: 'All projects'}}
    disabled
    maxHeight={SELECT_MAX_HEIGHT}
  />
);

/** The article list of a project is fetched the first time its dropdown is opened. */
export const ParentCell: React.FC<{ctx: ColumnsContext, template: Template}> = ({ctx, template}) => {
  const project = resolveProject(ctx, template);
  const projectKey = project?.shortName;
  const articles = projectKey ? ctx.articlesByProject[projectKey] : undefined;
  const options: ProjectItem[] = (articles || []).map(a => ({key: a.idReadable, label: a.summary}));

  return (
    <Select<ProjectItem>
      className="tableSelect"
      type={SelectType.INLINE}
      data={options}
      selected={ctx.selectedParents[template.id] || null}
      onSelect={item => ctx.onParentSelect(template.id, item)}
      onOpen={() => {
        if (projectKey) {
          ctx.onLoadArticles(projectKey);
        }
      }}
      filter
      clear
      disabled={!project}
      loading={Boolean(project && !articles)}
      disableScrollToActive
      preventListOverscroll
      maxHeight={SELECT_MAX_HEIGHT}
    />
  );
};

export const CreateCell: React.FC<{ctx: ColumnsContext, template: Template}> = ({ctx, template}) => (
  <Button
    icon={fileCreateIcon}
    onClick={() => ctx.onCreateArticle(template)}
    title={resolveProject(ctx, template) ? 'Create Article' : 'Please select a project first'}
  />
);

export const ActionsCell: React.FC<{data: readonly ListDataItem[]}> = ({data}) => (
  <DropdownMenu anchor={<Button icon={moreOptionsIcon}/>} data={data}/>
);
