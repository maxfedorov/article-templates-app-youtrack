# Article Templates App for YouTrack

Efficiently manage and use article templates in your Knowledge Base. This app helps teams maintain consistency in documentation by providing a structured way to create articles from pre-defined or custom templates.

Built on the **Enhanced DX** app template: TypeScript, React 18, Ring UI 7, file-based backend routing and a
generated, type-safe API client.

## Features

- **Dashboard Management**: A central hub to view, create, and manage all your article templates.
- **Quick Apply**: Apply templates directly to article drafts using the "Apply article template" widget in the article options menu.
- **Create from Existing Articles**: Easily save any article as a template via the article's options menu.
- **Predefined Templates**: Comes with templates out of the box.
- **Quick Create**: Create new article drafts from templates with a single click.
- **Project & Parent Selection**: Choose the target project and parent article directly when creating a draft.
- **Private & Shared Templates**: Keep your own personal templates or share them with your team.
- **Trash Bin**: Deleted templates are kept in a trash bin for a configurable period before being permanently purged.
- **Native Look & Feel**: Built with JetBrains Ring UI for a seamless integration with the YouTrack interface.

## Widgets

| Widget                  | Extension point             | Shown when                            |
|-------------------------|-----------------------------|---------------------------------------|
| Article templates       | `DASHBOARD_WIDGET`          | always, once added to a dashboard     |
| Create article template | `ARTICLE_OPTIONS_MENU_ITEM` | `!entity.draft && !entity.isEditing`  |
| Apply article template  | `ARTICLE_OPTIONS_MENU_ITEM` | `entity.draft \|\| entity.isEditing`  |

## Project Structure

```text
src/
├── api/                     # Generated on every backend build -- do not edit
├── common/types.ts          # Template and YouTrack entity types shared by both sides
├── backend/
│   ├── router/global/       # 17 global endpoints  -> dist/global.js
│   ├── router/article/      #  2 article endpoints -> dist/article.js
│   └── utils/               # All backend logic    -> dist/backend-utils.js
├── widgets/
│   ├── shared/              # TemplatesApi facade, useTemplateManager, shared components
│   ├── article-templates-dashboard-widget/
│   ├── create-template-article-widget/
│   └── apply-template-article-widget/
├── entity-extensions.json   # Storage properties on AppGlobalStorage and User
└── settings.json            # purgeIntervalDays
```

Route files keep only their `handle` body after the build, so all reusable logic lives in
`src/backend/utils/*`.

## Development

Create a `.env` file in the app directory:

```text
YOUTRACK_HOST=https://your-youtrack.example.com
YOUTRACK_TOKEN=perm-your-permanent-token
```

Get a token in YouTrack: Profile → Account Security → New token.

```bash
npm run watch          # rebuild and auto-upload on every change (recommended)
npm run dev            # watch + Vite HMR on :9000 (fastest for frontend work)
npm run build          # clean → backend → lint → frontend → validate
npm run build:backend  # regenerate src/api types (required before the frontend build)
npm run update         # build + upload using .env
npm run lint           # ESLint, zero warnings allowed
```

Scaffolding — always use the generator instead of creating files by hand:

```bash
npm run g -- widget --key my-widget --extension-point DASHBOARD_WIDGET
npm run g -- handler global/my-endpoint --method POST
npm run g -- property User.myFlag
npm run g -- settings add --name myOption --type integer --scope global
```

Run `npm run build:backend` after any of those so the generated API client picks up the change.

## Settings

| Setting               | Scope  | Default | Description                                                         |
|-----------------------|--------|---------|---------------------------------------------------------------------|
| Purge interval (days) | global | 7       | How long deleted templates stay in the trash before they are purged |

## Installation

### Manually

1. `npm install`
2. `npm run build`
3. Archive "dist" folder into a single ZIP file
4. Go to `/admin/apps` and import app from ZIP archive
5. Select desired projects on projects tab in the app sidebar

### With CLI

1. `npm install`
2. `npm run build && npm run upload -- --host %YOUTRACK_URL% --token %PERMANENT_USER_TOKEN%`
3. Select desired projects on the apps page
