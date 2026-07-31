/**
 * Toolbar above the template table.
 *
 * The active list and the trash share the search field and both filters, but nothing else: the
 * trash cannot be added to, imported into or deleted from in bulk, so each mode gets its own row.
 */

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
import type {ViewMode} from './useTemplateManager';

/** Only used until the app settings arrive, so the tooltip never shows an empty interval. */
const DEFAULT_PURGE_DAYS = 7;
const SELECT_MAX_HEIGHT = 400;

export interface FilterOption {
  key: string;
  label: string;
}

interface TemplateToolbarProps {
  viewMode: ViewMode;
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
  authors: FilterOption[];
  authorFilter: string[];
  onAuthorFilterChange: (authorIds: string[]) => void;
  projects: FilterOption[];
  projectFilter: string[];
  onProjectFilterChange: (projectIds: string[]) => void;
}

/** Ring UI adds a `separator` entry to the list of a multiple Select, hence the loose item type. */
interface SelectItem {
  key: string;
  label?: string;
  separator?: boolean;
}

const ROW_STYLE = {display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', paddingRight: '16px'};
const GROUP_STYLE = {display: 'flex', alignItems: 'center', gap: '8px'};
const RIGHT_GROUP_STYLE = {marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center'};
const HELP_ICON_STYLE = {color: 'var(--ring-secondary-color)', cursor: 'help'};

const RESET_TAGS = {reset: {separator: false, label: 'Reset filter'}};

const FilterInput: React.FC<{filter: string, onFilterChange: (value: string) => void}> = ({
  filter, onFilterChange
}) => (
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

const MultiFilter: React.FC<{
  options: FilterOption[],
  selectedKeys: string[],
  onChange: (keys: string[]) => void,
  label: string,
  multipleLabel: string
}> = ({options, selectedKeys, onChange, label, multipleLabel}) => (
  <Select<SelectItem>
    className="authorSelect"
    data={options}
    selected={options.filter(option => selectedKeys.includes(option.key))}
    onChange={(items: SelectItem[]) => onChange(items.map(item => item.key))}
    filter
    multiple={{label: multipleLabel}}
    label={label}
    type={SelectType.INLINE}
    clear
    maxHeight={SELECT_MAX_HEIGHT}
    tags={RESET_TAGS}
  />
);

const Filters: React.FC<TemplateToolbarProps> = ({
  authors, authorFilter, onAuthorFilterChange, projects, projectFilter, onProjectFilterChange
}) => (
  <div style={GROUP_STYLE}>
    <MultiFilter
      options={authors}
      selectedKeys={authorFilter}
      onChange={onAuthorFilterChange}
      label="Author"
      multipleLabel="Authors"
    />
    <MultiFilter
      options={projects}
      selectedKeys={projectFilter}
      onChange={onProjectFilterChange}
      label="Project"
      multipleLabel="Projects"
    />
  </div>
);

const ActiveToolbar: React.FC<TemplateToolbarProps> = props => {
  const {
    onAdd, onImport, onShowDeleted, onBulkDelete, selectedCount,
    filter, onFilterChange, showFavoritesOnly, onToggleShowFavorites
  } = props;

  return (
    <div style={ROW_STYLE}>
      <Button
        icon={showFavoritesOnly ? starFilledBigIcon : starEmptyBigIcon}
        onClick={onToggleShowFavorites}
        title={showFavoritesOnly ? 'Show all templates' : 'Show favorites only'}
        className={showFavoritesOnly ? 'favorite-active' : 'favorite-inactive'}
      />
      <FilterInput filter={filter} onFilterChange={onFilterChange}/>
      <Filters {...props}/>

      <div style={RIGHT_GROUP_STYLE}>
        <Button icon={importIcon} onClick={onImport} title="Import default templates"/>
        <Button icon={trashBigIcon} onClick={onShowDeleted} title="Show deleted templates"/>
        {selectedCount > 0 && <Button danger onClick={onBulkDelete}>{'Delete selected'}</Button>}
        <Button primary onClick={onAdd}>{'Add Template'}</Button>
      </div>
    </div>
  );
};

const DeletedToolbar: React.FC<TemplateToolbarProps> = props => {
  const {onBackToList, onBulkRestore, selectedCount, purgeIntervalDays, filter, onFilterChange} = props;
  const purgeHint = `Deleted templates are automatically purged ` +
    `${purgeIntervalDays || DEFAULT_PURGE_DAYS} days after deletion.`;

  return (
    <div style={ROW_STYLE}>
      <Button icon={backIcon} onClick={onBackToList}>{'Back'}</Button>
      <Tooltip title={purgeHint}>
        <Icon glyph={helpIcon} style={HELP_ICON_STYLE}/>
      </Tooltip>
      <FilterInput filter={filter} onFilterChange={onFilterChange}/>
      <Filters {...props}/>
      <div style={RIGHT_GROUP_STYLE}>
        {selectedCount > 0 && <Button primary onClick={onBulkRestore}>{'Restore selected'}</Button>}
      </div>
    </div>
  );
};

export const TemplateToolbar: React.FC<TemplateToolbarProps> = props => (
  props.viewMode === 'active' ? <ActiveToolbar {...props}/> : <DeletedToolbar {...props}/>
);
