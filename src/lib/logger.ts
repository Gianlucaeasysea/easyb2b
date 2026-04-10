type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

function log(level: LogLevel, context: string, message: string, data?: unknown): void {
  if (!isDev && level !== 'error') return;

  const prefix = `[${context}]`;
  const timestamp = new Date().toISOString();

  switch (level) {
    case 'debug':
      console.debug(`${timestamp} DEBUG ${prefix}`, message, data ?? '');
      break;
    case 'info':
      console.info(`${timestamp} INFO ${prefix}`, message, data ?? '');
      break;
    case 'warn':
      console.warn(`${timestamp} WARN ${prefix}`, message, data ?? '');
      break;
    case 'error':
      if (isDev) {
        console.error(`${timestamp} ERROR ${prefix}`, message, data ?? '');
      } else {
        console.error(`${prefix} An error occurred. Check server logs.`);
      }
      break;
  }
}

export const logger = {
  debug: (context: string, message: string, data?: unknown) => log('debug', context, message, data),
  info: (context: string, message: string, data?: unknown) => log('info', context, message, data),
  warn: (context: string, message: string, data?: unknown) => log('warn', context, message, data),
  error: (context: string, message: string, data?: unknown) => log('error', context, message, data),
};
