import React, {memo} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import ButtonSet from '@jetbrains/ring-ui-built/components/button-set/button-set';
import Select from '@jetbrains/ring-ui-built/components/select/select';
import Text from '@jetbrains/ring-ui-built/components/text/text';
import {Size} from '@jetbrains/ring-ui-built/components/input/input';

export interface TemplateOption {
  key: string;
  label: string;
  glyph?: string;
  className?: string;
}

interface ApplyTemplateFormProps {
  options: TemplateOption[];
  selected: TemplateOption | null;
  /** `true` when the widget is opened on an already published article instead of a draft. */
  published: boolean;
  /** `true` when the current draft already has a summary or content. */
  notEmpty: boolean;
  applying: boolean;
  onSelect: (option: TemplateOption | null) => void;
  onApply: () => void;
  onCancel: () => void;
}

const PUBLISHED_WARNING = 'This article is published: the template replaces its summary and content and is saved ' +
  'immediately. Discard your unpublished changes to avoid drafts conflicts.';

const DRAFT_WARNING = 'This draft is not empty. Applying the template replaces its summary and content.';

/** The warning is shown upfront, before the template is applied -- there is no second confirmation step. */
const Notice: React.FunctionComponent<{published: boolean, notEmpty: boolean}> = ({published, notEmpty}) => {
  if (published) {
    return <Text info>{PUBLISHED_WARNING}</Text>;
  }
  if (notEmpty) {
    return <Text info>{DRAFT_WARNING}</Text>;
  }
  return null;
};

const ApplyTemplateFormComponent: React.FunctionComponent<ApplyTemplateFormProps> = ({
  options, selected, published, notEmpty, applying, onSelect, onApply, onCancel
}) => (
  <div className="widget">
    <div className="field">
      <div className="label">{'Select Template'}</div>
      <Select<TemplateOption>
        data={options}
        selected={selected}
        onSelect={onSelect}
        filter
        label="Select template"
        maxHeight={200}
        size={Size.FULL}
      />
    </div>

    <Notice published={published} notEmpty={notEmpty}/>

    <ButtonSet>
      <Button
        primary
        onClick={onApply}
        disabled={!selected || applying}
        loader={applying}
      >
        {'Apply Template'}
      </Button>
      <Button onClick={onCancel}>
        {'Cancel'}
      </Button>
    </ButtonSet>
  </div>
);

export const ApplyTemplateForm = memo(ApplyTemplateFormComponent);
