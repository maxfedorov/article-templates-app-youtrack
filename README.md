# Article Templates App for YouTrack

Efficiently manage and use article templates in your Knowledge Base. This app helps teams maintain consistency in documentation by providing a structured way to create articles from pre-defined or custom templates.

## Features

- **Dashboard Management**: A central hub to view, create, and manage all your article templates.
- **Project Settings Integration**: Manage templates and create articles directly from the Project Settings page.
- **Create from Existing Articles**: Easily save any article as a template via the article's options menu.
- **Predefined Templates**: Comes with templates out of the box.
- **Quick Create**: Create new article drafts from templates with a single click.
- **Project & Parent Selection**: Choose the target project and parent article directly when creating a draft.
- **Private & Shared Templates**: Keep your own personal templates or share them with your team.
- **Trash Bin**: Deleted templates are kept in a trash bin for a configurable period before being permanently purged.
- **Native Look & Feel**: Built with JetBrains Ring UI for a seamless integration with the YouTrack interface.

### Installation

#### Manually

1. `npm install`
2. `npm run build`
3. Archive "dist" folder into a single ZIP file
4. Go to `/admin/apps` and import app from ZIP archive
5. Select desired projects on projects tab in the app sidebar

#### With CLI

1. `npm install`
2. `npm run build && npm run upload -- --host %YOUTRACK_URL% --token %PERMANENT_USER_TOKEN%`
3. Select desired projects on the apps page