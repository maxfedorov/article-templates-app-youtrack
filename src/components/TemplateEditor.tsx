import React from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import ButtonSet from '@jetbrains/ring-ui-built/components/button-set/button-set';
import Input, {Size} from '@jetbrains/ring-ui-built/components/input/input';
import Toggle from '@jetbrains/ring-ui-built/components/toggle/toggle';
import {Template} from '../api';

interface TemplateEditorProps {
  template: Partial<Template>;
  onSave: () => void;
  onCancel: () => void;
  onChange: (template: Partial<Template>) => void;
  onDelete: (id: string) => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({template, onSave, onCancel, onChange, onDelete}) => (
  <div className="widget">
    <div>
      <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
        <Input
          label="Template Name"
          value={template.name || ''}
          onChange={e => onChange({...template, name: e.target.value})}
          size={Size.FULL}
        />
        <Input
          label="Article Summary"
          value={template.summary || ''}
          onChange={e => onChange({...template, summary: e.target.value})}
          size={Size.FULL}
        />
        <Input
          label="Article Content"
          multiline
          value={template.content || ''}
          onChange={e => onChange({...template, content: e.target.value})}
          size={Size.FULL}
          className="contentTextarea"
        />
        <Toggle
          checked={template.isPrivate || false}
          onChange={e => onChange({...template, isPrivate: e.target.checked})}
        >
          {'Private Template'}
        </Toggle>
        <ButtonSet>
          <Button primary onClick={onSave} disabled={!template.name}>{'Save'}</Button>
          <Button onClick={onCancel}>{'Cancel'}</Button>
          {template.id && (
            <Button danger onClick={() => onDelete(template.id!)}>{'Delete'}</Button>
          )}
        </ButtonSet>
      </div>
    </div>
  </div>
);
