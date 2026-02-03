import React from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Input, {Size} from '@jetbrains/ring-ui-built/components/input/input';
import Select, {Type as SelectType} from '@jetbrains/ring-ui-built/components/select/select';
import Icon from '@jetbrains/ring-ui-built/components/icon/icon';
import Tooltip from '@jetbrains/ring-ui-built/components/tooltip/tooltip';
import trashBigIcon from '@jetbrains/icons/trash-20px';
import backIcon from '@jetbrains/icons/arrow-left';
import importIcon from '@jetbrains/icons/import-20px';
import helpIcon from '@jetbrains/icons/help';
import searchIcon from '@jetbrains/icons/search';
import starEmptyBigIcon from '@jetbrains/icons/star-empty-20px';
import starFilledBigIcon from '@jetbrains/icons/star-filled-20px';

interface TemplateToolbarProps {
  viewMode: 'active' | 'deleted';
  onAdd: () => void;
  onImport: () => void;
  onShowDeleted: () => void;
  onBackToList: () => void;
  onBulkDelete: () => void;
  onBulkRestore: () => void;
  selectedCount: number;
  purgeIntervalDays?: number;
  filter: string;
  onFilterChange: (value: string) => void;
  showFavoritesOnly?: boolean;
  onToggleShowFavorites?: () => void;
  authors: {key: string, label: string}[];
  authorFilter: string[];
  onAuthorFilterChange: (authorIds: string[]) => void;
  projects: {key: string, label: string}[];
  projectFilter: string[];
  onProjectFilterChange: (projectIds: string[]) => void;
}

const DEFAULT_PURGE_DAYS = 7;

interface AuthorItem {
  key: string;
  label?: string;
  separator?: boolean;
}

const FilterInput: React.FC<{filter: string, onFilterChange: (v: string) => void}> = ({filter, onFilterChange}) => (
  <Input
    className="searchInput"
    icon={searchIcon}
    placeholder="Search templates"
    value={filter}
    onChange={e => onFilterChange(e.target.value)}
    onClear={() => onFilterChange('')}
    size={Size.M}
  />
);

const AuthorFilter: React.FC<{
  authors: {key: string, label: string}[],
  authorFilter: string[],
  onAuthorFilterChange: (ids: string[]) => void
}> = ({authors, authorFilter, onAuthorFilterChange}) => (
  <Select<AuthorItem>
    className="authorSelect"
    data={authors}
    selected={authors.filter(a => authorFilter.includes(a.key))}
    onChange={(items: AuthorItem[]) => {
      onAuthorFilterChange(items.map((it: AuthorItem) => it.key as string));
    }}
    filter
    multiple={{label: 'Authors'}}
    label="Author"
    type={SelectType.INLINE}
    clear
    maxHeight={400}
    tags={{
      reset: {
        separator: false,
        label: "Reset filter"
      },
    }}
  />
);

const ProjectFilter: React.FC<{
  projects: {key: string, label: string}[],
  projectFilter: string[],
  onProjectFilterChange: (ids: string[]) => void
}> = ({projects, projectFilter, onProjectFilterChange}) => (
  <Select<AuthorItem>
    className="authorSelect"
    data={projects}
    selected={projects.filter(p => projectFilter.includes(p.key))}
    onChange={(items: AuthorItem[]) => {
      onProjectFilterChange(items.map((it: AuthorItem) => it.key as string));
    }}
    filter
    multiple={{label: 'Projects'}}
    label="Project"
    type={SelectType.INLINE}
    clear
    maxHeight={400}
    tags={{
      reset: {
        separator: false,
        label: "Reset filter"
      },
    }}
  />
);

const ActiveToolbar: React.FC<TemplateToolbarProps> = ({
  onAdd, onImport, onShowDeleted, onBulkDelete, selectedCount,
  filter, onFilterChange, showFavoritesOnly, onToggleShowFavorites, 
  authors, authorFilter, onAuthorFilterChange,
  projects, projectFilter, onProjectFilterChange
}) => (
  <div style={{display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', paddingRight: '16px'}}>
    <Button
      icon={showFavoritesOnly ? starFilledBigIcon : starEmptyBigIcon}
      onClick={onToggleShowFavorites}
      title={showFavoritesOnly ? "Show all templates" : "Show favorites only"}
      className={showFavoritesOnly ? 'favorite-active' : 'favorite-inactive'}
    />
    <FilterInput filter={filter} onFilterChange={onFilterChange}/>
    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
      <AuthorFilter 
        authors={authors} 
        authorFilter={authorFilter} 
        onAuthorFilterChange={onAuthorFilterChange} 
      />
      <ProjectFilter
        projects={projects}
        projectFilter={projectFilter}
        onProjectFilterChange={onProjectFilterChange}
      />
    </div>

    <div style={{marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center'}}>
      <Button
        icon={importIcon} 
        onClick={onImport}
        title="Import default templates"
      />
      <Button 
        icon={trashBigIcon}
        onClick={onShowDeleted}
        title="Show deleted templates"
      />
      {selectedCount > 0 && (
        <Button danger onClick={onBulkDelete}>{'Delete selected'}</Button>
      )}
      <Button primary onClick={onAdd}>{'Add Template'}</Button>
    </div>
  </div>
);

const DeletedToolbar: React.FC<TemplateToolbarProps> = ({
  onBackToList, onBulkRestore, selectedCount, purgeIntervalDays,
  filter, onFilterChange, authors, authorFilter, onAuthorFilterChange,
  projects, projectFilter, onProjectFilterChange
}) => (
  <div style={{display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', paddingRight: '16px'}}>
    <Button icon={backIcon} onClick={onBackToList}>{'Back'}</Button>
    <Tooltip title={`Deleted templates are automatically purged ${purgeIntervalDays || DEFAULT_PURGE_DAYS} days after deletion.`}>
      <Icon
        glyph={helpIcon}
        style={{color: 'var(--ring-secondary-color)', cursor: 'help'}}
      />
    </Tooltip>
    <FilterInput filter={filter} onFilterChange={onFilterChange}/>
    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
      <AuthorFilter 
        authors={authors} 
        authorFilter={authorFilter} 
        onAuthorFilterChange={onAuthorFilterChange} 
      />
      <ProjectFilter
        projects={projects}
        projectFilter={projectFilter}
        onProjectFilterChange={onProjectFilterChange}
      />
    </div>
    <div style={{marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center'}}>
      {selectedCount > 0 && (
        <Button primary onClick={onBulkRestore}>{'Restore selected'}</Button>
      )}
    </div>
  </div>
);

export const TemplateToolbar: React.FC<TemplateToolbarProps> = (props) => {
  if (props.viewMode === 'active') {
    return <ActiveToolbar {...props}/>;
  }
  return <DeletedToolbar {...props}/>;
};
