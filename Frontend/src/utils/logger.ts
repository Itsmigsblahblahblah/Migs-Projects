/**
 * Logger Utility
 * Prevents console logs from appearing in production for security
 * Only allows logs in development environment
 */

const isDevelopment = import.meta.env.DEV;

// Create a no-op logger for production
const noop = () => {};

export const logger = {
  log: isDevelopment ? console.log.bind(console) : noop,
  warn: isDevelopment ? console.warn.bind(console) : noop,
  error: isDevelopment ? console.error.bind(console) : console.error.bind(console), // Always log errors
  info: isDevelopment ? console.info.bind(console) : noop,
  debug: isDevelopment ? console.debug.bind(console) : noop,
};

// Export individual methods for convenience
export const { log, warn, error, info, debug } = logger;
