/**
 * Column sets of the template table.
 *
 * Ring UI ignores a `width` on a column definition -- the table is laid out by
 * `.templateTable {table-layout: fixed}` in `app.css` -- so the widths live in the stylesheet.
 */

import React from 'react';
import type {ListDataItem} from '@jetbrains/ring-ui-built/components/list/list';
import type {Column} from '@jetbrains/ring-ui-built/components/table/header-cell';
import copyIcon from '@jetbrains/icons/copy';
import eyeIcon from '@jetbrains/icons/eye';
import historyIcon from '@jetbrains/icons/history';
import pencilIcon from '@jetbrains/icons/pencil';
import trashIcon from '@jetbrains/icons/trash';
import type {Template} from '@/common/types';
import type {ViewMode} from '../shared/useTemplateManager';
import {
  ActionsCell, AuthorCell, CreateCell, DeletedProjectCell, FavoriteCell, NameCell, ParentCell, ProjectCell
} from './cells';
import type {ColumnsContext} from './cells';

export type {ColumnsContext, ProjectItem} from './cells';

/** Destructive entries are marked by the `removeOption` class -- Ring UI list items have no danger flag. */
function activeActions(ctx: ColumnsContext, template: Template): ListDataItem[] {
  const items: ListDataItem[] = [
    {label: 'Clone', glyph: copyIcon, onClick: () => ctx.onClone(template)},
    {
      label: template.canEdit ? 'Edit' : 'View',
      glyph: template.canEdit ? pencilIcon : eyeIcon,
      onClick: () => ctx.onEdit(template)
    }
  ];
  if (template.canEdit) {
    items.push({
      label: 'Delete', glyph: trashIcon, className: 'removeOption',
      onClick: () => ctx.onDelete(template.id)
    });
  }
  return items;
}

function deletedActions(ctx: ColumnsContext, template: Template): ListDataItem[] {
  return [
    {label: 'Restore', glyph: historyIcon, onClick: () => ctx.onRestore(template.id)},
    {
      label: 'Delete Forever', glyph: trashIcon, className: 'removeOption',
      onClick: () => ctx.onPermanentDelete(template.id)
    }
  ];
}

/** The favourite, name and author columns are identical in both view modes. */
function commonColumns(ctx: ColumnsContext, interactive: boolean): Column<Template>[] {
  return [
    {
      id: 'favorite',
      getValue: (t: Template) => (
        <FavoriteCell
          isFavorite={ctx.favorites.includes(t.id)}
          onToggle={interactive ? () => ctx.onToggleFavorite(t.id) : undefined}
        />
      )
    },
    {id: 'name', title: 'Name', sortable: true, getValue: (t: Template) => <NameCell template={t}/>},
    {id: 'author', title: 'Author', sortable: true, getValue: (t: Template) => <AuthorCell template={t}/>}
  ];
}

function activeColumns(ctx: ColumnsContext): Column<Template>[] {
  return [
    ...commonColumns(ctx, true),
    {id: 'project', title: 'Project', getValue: (t: Template) => <ProjectCell ctx={ctx} template={t}/>},
    {id: 'parent', title: 'Parent Article', getValue: (t: Template) => <ParentCell ctx={ctx} template={t}/>},
    {id: 'create', getValue: (t: Template) => <CreateCell ctx={ctx} template={t}/>},
    {id: 'actions', getValue: (t: Template) => <ActionsCell data={activeActions(ctx, t)}/>}
  ];
}

function deletedColumns(ctx: ColumnsContext): Column<Template>[] {
  return [
    ...commonColumns(ctx, false),
    {id: 'project', title: 'Project', getValue: (t: Template) => <DeletedProjectCell ctx={ctx} template={t}/>},
    {id: 'actions', getValue: (t: Template) => <ActionsCell data={deletedActions(ctx, t)}/>}
  ];
}

export const buildColumns = (ctx: ColumnsContext, viewMode: ViewMode): Column<Template>[] =>
  (viewMode === 'active' ? activeColumns(ctx) : deletedColumns(ctx));
