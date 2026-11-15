import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(project, file), 'utf8');
const root = read('app/(public)/page.tsx');
const login = read('components/auth/login-form.tsx');
const sidebar = read('components/shared/sidebar.tsx');

// These are integration/source checks. Browser, database and live NextAuth session
// should also be verified after deployment.
test('root is server-session aware and sends authenticated staff to first accessible module', () => {
  assert.match(root, /getServerSession\(authOptions\)/);
  assert.match(root, /getFirstAccessibleRoute\(/);
  assert.match(root, /redirect\(destination \?\? '\/unauthorized'\)/);
  assert.match(root, /session\?\.user/);
});

test('root keeps anonymous public landing implementation', () => {
  assert.match(root, /getPublicCatalog\(/);
  assert.match(root, /getPublicLiveQueue\(/);
  assert.match(root, /getPublicSiteConfig\(/);
});

test('login navigates directly to authorized module and no longer pushes public root', () => {
  assert.match(login, /getFirstAccessibleRoute\(/);
  assert.match(login, /router\.replace\(destination/);
  assert.doesNotMatch(login, /router\.push\(\s*["']\/["']\s*\)/);
});

test('sidebar Dashboard uses protected dashboard path in all groups', () => {
  assert.match(sidebar, /paths: \[["']\/dashboard["'], ["']\/customers["']/);
  assert.match(sidebar, /path: ["']\/dashboard["'],\s*label: ["']Dashboard["']/);
  assert.doesNotMatch(sidebar, /path: ["']\/["'],\s*label: ["']Dashboard["']/);
});

test('temporary-password flow remains active', () => {
  assert.match(root, /requiresPasswordChange === true/);
  assert.match(login, /setShowChangePasswordModal\(true\)/);
});

test('RBAC resolver matches first visible sidebar item ordering', async () => {
  const { getFirstAccessibleRoute } = await import('../lib/auth/get-first-access-route.ts');
  assert.equal(getFirstAccessibleRoute({ dashboard: true, customers: true }), '/dashboard');
  assert.equal(getFirstAccessibleRoute({ dashboard: false, customers: true }), '/customers');
  assert.equal(getFirstAccessibleRoute({ appointments: true, payments: true }), '/appointments');
  assert.equal(getFirstAccessibleRoute({ payments: true }), '/payments');
  assert.equal(getFirstAccessibleRoute({}), null);
  assert.equal(getFirstAccessibleRoute(null), null);
});
