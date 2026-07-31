import type { ExtendedAppGlobalStorage, ExtendedUser, AppGlobalStorageExtensionProperties } from './extended-entities.js';

/**
 * User context with extended entity (includes extension properties)
 */
export type ExtendedUserCtx<T extends import('@jetbrains/youtrack-apps-tools/dx').UserCtx> =
  Omit<T, 'user'> & { user: ExtendedUser };

/**
 * Extended global context with app-specific global storage extension properties
 */
export type ExtendedGlobalCtx<T extends import('@jetbrains/youtrack-apps-tools/dx').GlobalCtx> =
  Omit<T, 'globalStorage'> & {
    globalStorage: {
      extensionProperties: AppGlobalStorageExtensionProperties;
    };
  };
