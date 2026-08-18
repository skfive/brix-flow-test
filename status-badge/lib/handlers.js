import { renderBadge } from './renderBadge.js';

const KNOWN_STATUSES = new Set(['up', 'degraded', 'down']);

function rollupStatus(services) {
  const values = Object.values(services);
  if (values.includes('down')) return 'down';
  if (values.includes('degraded')) return 'degraded';
  return 'up';
}

const BADGE_PATH_PATTERN = /^\/badge\/([^/]+)$/;

export function createHandlers({ getStatusData }) {
  function getBadge(service) {
    const statusData = getStatusData();
    const rawStatus = statusData[service];
    const isKnown = KNOWN_STATUSES.has(rawStatus);
    const status = isKnown ? rawStatus : 'invalid';

    return {
      statusCode: isKnown ? 200 : 404,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-cache, max-age=0',
      },
      body: renderBadge({ label: service, status }),
    };
  }

  function getHealthz() {
    const services = getStatusData();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ status: rollupStatus(services), services }),
    };
  }

  function route(method, pathname) {
    if (method !== 'GET') {
      return null;
    }

    if (pathname === '/healthz') {
      return getHealthz();
    }

    const badgeMatch = pathname.match(BADGE_PATH_PATTERN);
    if (badgeMatch) {
      return getBadge(decodeURIComponent(badgeMatch[1]));
    }

    return null;
  }

  return { getBadge, getHealthz, route };
}
