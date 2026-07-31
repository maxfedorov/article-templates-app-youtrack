import type { User } from '@jetbrains/youtrack-workflow-types/workflowTypeScriptStubs';

/**
 * App-specific extension properties for User
 */
export type UserExtensionProperties = {
  templates?: string;
  deletedTemplates?: string;
  favorites?: string;
  showFavoritesOnly?: string;
  authorFilter?: string;
  projectFilter?: string;
};

/**
 * Extended User with app-specific extension properties
 */
export type ExtendedUser = Omit<User, 'extensionProperties'> & {
  extensionProperties: UserExtensionProperties;
};

/**
 * Global storage extension properties for the app
 */
export interface AppGlobalStorageExtensionProperties {
  templates?: string;
  deletedTemplates?: string;
  initialImportDone?: string;
}

declare module '@jetbrains/youtrack-workflow-types/workflowTypeScriptStubs' {
  interface ExtensionPropertiesRegistry {
    User: UserExtensionProperties;
  }
}

/**
 * Map of entity types to their extended versions
 * Extended types have extension properties, others are 'never'
 */
export type ExtendedProperties = {
  Issue: never;
  Project: never;
  Article: never;
  User: ExtendedUser;
  AppGlobalStorage: AppGlobalStorageExtensionProperties;
};