import React from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Input, {Size} from '@jetbrains/ring-ui-built/components/input/input';
import Icon from '@jetbrains/ring-ui-built/components/icon/icon';
import Tooltip from '@jetbrains/ring-ui-built/components/tooltip/tooltip';
import trashBigIcon from '@jetbrains/icons/trash-20px';
import backIcon from '@jetbrains/icons/arrow-left';
import importIcon from '@jetbrains/icons/import-20px';
import helpIcon from '@jetbrains/icons/help';
import searchIcon from '@jetbrains/icons/search';

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
}

const DEFAULT_PURGE_DAYS = 7;

export const TemplateToolbar: React.FC<TemplateToolbarProps> = ({
  viewMode, onAdd, onImport, onShowDeleted, onBackToList, onBulkDelete, onBulkRestore, selectedCount, purgeIntervalDays,
  filter, onFilterChange
}) => {
  const filterInput = (
    <Input
      icon={searchIcon}
      placeholder="Filter by name"
      value={filter}
      onChange={e => onFilterChange(e.target.value)}
      onClear={() => onFilterChange('')}
      size={Size.M}
      style={{marginLeft: 'auto'}}
    />
  );

  if (viewMode === 'active') {
    return (
      <div style={{display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center'}}>
        <Button primary onClick={onAdd}>{'Add Template'}</Button>
        {filterInput}
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
      </div>
    );
  }

  return (
    <div style={{display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center'}}>
      <Button 
        icon={backIcon} 
        onClick={onBackToList}
      >
        {'Back to list'}
      </Button>
      {selectedCount > 0 && (
        <Button primary onClick={onBulkRestore}>{'Restore selected'}</Button>
      )}
      {filterInput}
      <Tooltip title={`Deleted templates are automatically purged ${purgeIntervalDays || DEFAULT_PURGE_DAYS} days after deletion.`}>
        <Icon
          glyph={helpIcon}
          style={{color: 'var(--ring-secondary-color)', cursor: 'help'}}
        />
      </Tooltip>
    </div>
  );
};
