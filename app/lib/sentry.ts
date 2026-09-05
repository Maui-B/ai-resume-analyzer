import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://examplePublicKey@o123456.ingest.sentry.io/123456',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

export default Sentry;