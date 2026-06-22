import { ApplicationInsights } from '@microsoft/applicationinsights-web';

let appInsightsInstance = null;

const getConnectionString = () => {
  return process.env.REACT_APP_APPINSIGHTS_CONNECTION_STRING || '';
};

const getAppVersion = () => {
  return process.env.REACT_APP_APP_VERSION || process.env.REACT_APP_VERSION || 'unknown';
};

const getDeviceType = () => {
  if (typeof window === 'undefined') return 'unknown';

  const ua = window.navigator?.userAgent || '';
  const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (window.innerWidth >= 768 && window.innerWidth <= 1024);
  if (isTablet) return 'tablet';

  const isMobile = /Mobi|Android|iPhone|iPod/i.test(ua) || window.innerWidth <= 767;
  return isMobile ? 'mobile' : 'desktop';
};

const getRoute = () => {
  if (typeof window === 'undefined') return '/';
  const { pathname, search } = window.location;
  return `${pathname || '/'}${search || ''}`;
};

const getCustomDimensions = (properties = {}) => ({
  appVersion: getAppVersion(),
  deviceType: getDeviceType(),
  route: getRoute(),
  ...properties
});

export const initializeAppInsights = () => {
  const connectionString = getConnectionString();
  if (!connectionString || appInsightsInstance) return false;

  appInsightsInstance = new ApplicationInsights({
    config: {
      connectionString,
      enableAutoRouteTracking: true,
      disableFetchTracking: false,
      disableAjaxTracking: false,
      disableExceptionTracking: false,
      enableUnhandledPromiseRejectionTracking: true
    }
  });

  appInsightsInstance.loadAppInsights();

  appInsightsInstance.addTelemetryInitializer((envelope) => {
    const baseData = envelope?.data?.baseData;
    if (!baseData) return;

    const existingProperties = baseData.properties || {};
    baseData.properties = getCustomDimensions(existingProperties);
  });

  appInsightsInstance.trackPageView({
    name: 'app-start',
    properties: getCustomDimensions()
  });
  return true;
};

export const isAppInsightsEnabled = () => !!appInsightsInstance;

export const trackException = (error, properties = {}) => {
  if (!appInsightsInstance) return;
  appInsightsInstance.trackException({
    exception: error instanceof Error ? error : new Error(String(error)),
    properties: getCustomDimensions(properties)
  });
};

export const trackEvent = (name, properties = {}) => {
  if (!appInsightsInstance) return;
  appInsightsInstance.trackEvent({ name }, getCustomDimensions(properties));
};
