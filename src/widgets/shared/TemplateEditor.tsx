/**
 * The template form of the dashboard widget.
 *
 * The same form is used for reading: a template locked by its author renders every control
 * disabled and offers "Close" instead of "Cancel".
 */

import React from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import ButtonSet from '@jetbrains/ring-ui-built/components/button-set/button-set';
import Input, {Size} from '@jetbrains/ring-ui-built/components/input/input';
import Toggle from '@jetbrains/ring-ui-built/components/toggle/toggle';
import Select from '@jetbrains/ring-ui-built/components/select/select';
import type {Template, YTProject} from '@/common/types';

const SELECT_MAX_HEIGHT = 400;

interface TemplateEditorProps {
  template: Partial<Template>;
  onSave: () => void;
  onCancel: () => void;
  onChange: (template: Partial<Template>) => void;
  onDelete: (id: string) => void;
  projects?: YTProject[];
  isReadOnly?: boolean;
}

const LABEL_STYLE = {fontSize: '12px', color: 'var(--ring-secondary-color)', marginBottom: '4px'};
const FORM_STYLE = {display: 'flex', flexDirection: 'column' as const, gap: '16px'};

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template, onSave, onCancel, onChange, onDelete, projects, isReadOnly
}) => {
  // A template without a project is offered to every project the user can create articles in.
  const projectOptions = [
    {label: 'All projects', key: 'all'},
    ...(projects || []).map(p => ({label: p.name, key: p.shortName || p.id}))
  ];
  const selectedProject = projectOptions.find(p => p.key === (template.projectId || 'all')) || projectOptions[0];

  return (
    <div className="widget">
      <div style={FORM_STYLE}>
        <Input
          label="Template Name"
          value={template.name || ''}
          onChange={e => onChange({...template, name: e.target.value})}
          size={Size.FULL}
          disabled={isReadOnly}
        />
        <Input
          label="Article Summary"
          value={template.summary || ''}
          onChange={e => onChange({...template, summary: e.target.value})}
          size={Size.FULL}
          disabled={isReadOnly}
        />
        <Input
          label="Article Content"
          multiline
          value={template.content || ''}
          onChange={e => onChange({...template, content: e.target.value})}
          size={Size.FULL}
          className="contentTextarea"
          disabled={isReadOnly}
        />

        <div>
          <div style={LABEL_STYLE}>{'Project'}</div>
          <Select
            data={projectOptions}
            selected={selectedProject}
            onSelect={item => item && onChange({...template, projectId: item.key === 'all' ? undefined : item.key})}
            size={Size.FULL}
            disabled={isReadOnly}
            filter
            maxHeight={SELECT_MAX_HEIGHT}
          />
        </div>

        <Toggle
          checked={template.isPrivate || false}
          onChange={e => onChange({...template, isPrivate: e.target.checked})}
          disabled={isReadOnly}
        >
          {'Private template'}
        </Toggle>

        <Toggle
          checked={template.lockedForOthers || false}
          onChange={e => onChange({...template, lockedForOthers: e.target.checked})}
          disabled={isReadOnly}
        >
          {template.lockedForOthers ? 'Only author and admins can edit' : 'Anyone can edit'}
        </Toggle>

        <ButtonSet>
          {!isReadOnly && <Button primary onClick={onSave} disabled={!template.name}>{'Save'}</Button>}
          <Button onClick={onCancel}>{isReadOnly ? 'Close' : 'Cancel'}</Button>
          {template.id && !isReadOnly && (
            <Button danger onClick={() => onDelete(template.id as string)}>{'Delete'}</Button>
          )}
        </ButtonSet>
      </div>
    </div>
  );
};
