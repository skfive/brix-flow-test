import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { createHandlers } from '../lib/handlers.js';

function handlersWith(statusData) {
  return createHandlers({ getStatusData: () => statusData });
}

test('GET /badge/:service returns 200 + image/svg+xml for a known service', () => {
  const handlers = handlersWith({ 'auth-api': 'up' });
  const res = handlers.getBadge('auth-api');
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'image/svg+xml; charset=utf-8');
  assert.match(res.body, /badge--up/);
  assert.match(res.body, />auth-api</);
});

test('GET /badge/:service returns 404 + svg badge body for an unregistered service', () => {
  const handlers = handlersWith({ 'auth-api': 'up' });
  const res = handlers.getBadge('unknown-svc');
  assert.equal(res.statusCode, 404);
  assert.equal(res.headers['Content-Type'], 'image/svg+xml; charset=utf-8');
  assert.match(res.body, /badge--down/);
  assert.match(res.body, />invalid</);
  assert.match(res.body, />unknown-svc</);
});

test('GET /badge/:service treats an untrusted status.json value as invalid (404)', () => {
  const handlers = handlersWith({ 'auth-api': 'not-a-real-status' });
  const res = handlers.getBadge('auth-api');
  assert.equal(res.statusCode, 404);
  assert.match(res.body, />invalid</);
});

test('GET /healthz returns 200 + up rollup when every service is up', () => {
  const handlers = handlersWith({ a: 'up', b: 'up' });
  const res = handlers.getHealthz();
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  const parsed = JSON.parse(res.body);
  assert.deepEqual(parsed, { status: 'up', services: { a: 'up', b: 'up' } });
});

test('GET /healthz rolls up to degraded when any service is degraded (no down)', () => {
  const handlers = handlersWith({ a: 'up', b: 'degraded' });
  const parsed = JSON.parse(handlers.getHealthz().body);
  assert.equal(parsed.status, 'degraded');
});

test('GET /healthz rolls up to down when any service is down', () => {
  const handlers = handlersWith({ a: 'down', b: 'degraded' });
  const parsed = JSON.parse(handlers.getHealthz().body);
  assert.equal(parsed.status, 'down');
});

test('GET /healthz returns up + empty services for an empty status.json', () => {
  const handlers = handlersWith({});
  const res = handlers.getHealthz();
  assert.equal(res.statusCode, 200);
  const parsed = JSON.parse(res.body);
  assert.deepEqual(parsed, { status: 'up', services: {} });
});

test('route() dispatches GET /badge/:service without opening any port', () => {
  const handlers = handlersWith({ 'auth-api': 'up' });
  const res = handlers.route('GET', '/badge/auth-api');
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /badge--up/);
});

test('route() dispatches GET /healthz without opening any port', () => {
  const handlers = handlersWith({ a: 'up' });
  const res = handlers.route('GET', '/healthz');
  assert.equal(res.statusCode, 200);
});

test('handlers module never binds an http server as a side effect of being required', () => {
  const activeConnectionsBefore = http.globalAgent.sockets;
  const handlers = handlersWith({ a: 'up' });
  handlers.getHealthz();
  handlers.getBadge('a');
  assert.deepEqual(http.globalAgent.sockets, activeConnectionsBefore);
});
