/**
 * Authentication flow logger
 * Helps debug authentication issues with timestamped logs
 */

// Set to true to enable auth logging
const AUTH_LOGGING_ENABLED = true;

// Prefixes for different log types
const LOG_PREFIX = '🔐 Auth';
const ERROR_PREFIX = '❌ Auth Error';
const WARN_PREFIX = '⚠️ Auth Warning';
const INFO_PREFIX = 'ℹ️ Auth Info';

/**
 * Log authentication-related messages
 */
export const logAuth = (message: string, data?: any) => {
  if (!AUTH_LOGGING_ENABLED) return;
  
  const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
  console.log(`${LOG_PREFIX} [${timestamp}] ${message}`);
  
  if (data !== undefined) {
    console.log('  Data:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  }
};

/**
 * Log authentication errors
 */
export const logAuthError = (message: string, error?: any) => {
  if (!AUTH_LOGGING_ENABLED) return;
  
  const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
  console.error(`${ERROR_PREFIX} [${timestamp}] ${message}`);
  
  if (error) {
    if (error instanceof Error) {
      console.error('  Error:', error.message);
      console.error('  Stack:', error.stack);
    } else {
      console.error('  Details:', error);
    }
  }
};

/**
 * Log authentication warnings
 */
export const logAuthWarning = (message: string, data?: any) => {
  if (!AUTH_LOGGING_ENABLED) return;
  
  const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
  console.warn(`${WARN_PREFIX} [${timestamp}] ${message}`);
  
  if (data !== undefined) {
    console.warn('  Data:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  }
};

/**
 * Log router navigation events
 */
export const logNavigation = (route: string, action: string) => {
  if (!AUTH_LOGGING_ENABLED) return;
  
  const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
  console.log(`${INFO_PREFIX} [${timestamp}] Navigation: ${action} to ${route}`);
};

/**
 * Dump auth-related state for debugging
 */
export const dumpAuthState = (state: any) => {
  if (!AUTH_LOGGING_ENABLED) return;
  
  const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
  console.log(`${INFO_PREFIX} [${timestamp}] Auth State Dump:`);
  console.log('  Token exists:', !!state.auth?.token);
  console.log('  User exists:', !!state.auth?.user);
  console.log('  Initialized:', state.auth?.initialized);
  console.log('  Is loading:', state.auth?.isLoading);
  console.log('  Has error:', !!state.auth?.error);
};
