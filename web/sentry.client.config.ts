import * as Sentry from '@sentry/nextjs';
import { BrowserTracing } from '@sentry/tracing';
import { Replay } from '@sentry/replay';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  integrations: [
    new BrowserTracing(),
    new Replay(),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
}); 