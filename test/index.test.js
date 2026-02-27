const assert = require('assert');
const app = require('../src/index');
const http = require('http');

function makeRequest(base, method, path, body, cookies) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, base);
    const options = { method, hostname: url.hostname, port: url.port, path: url.pathname, headers: {} };
    if (cookies) options.headers['Cookie'] = cookies;
    if (body) {
      const data = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const setCookies = res.headers['set-cookie'] || [];
        const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');
        try { resolve({ status: res.statusCode, body: JSON.parse(data || '{}'), cookies: cookieStr }); }
        catch { resolve({ status: res.statusCode, body: data, cookies: cookieStr }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  const server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const base = `http://localhost:${port}`;
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try { await fn(); passed++; }
    catch (err) { failed++; console.error(`FAIL: ${name} — ${err.message}`); }
  }

  await test('GET /health', async () => {
    const r = await makeRequest(base, 'GET', '/health');
    assert.strictEqual(r.status, 200);
  });

  await test('Unauthenticated access returns 401', async () => {
    const r = await makeRequest(base, 'GET', '/api/dashboard');
    assert.strictEqual(r.status, 401);
  });

  // Login as admin
  let adminCookies;
  await test('Login as admin', async () => {
    const r = await makeRequest(base, 'POST', '/auth/login', { username: 'alice', password: 'alice123' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.user.role, 'admin');
    adminCookies = r.cookies;
  });

  await test('GET /auth/me with session', async () => {
    const r = await makeRequest(base, 'GET', '/auth/me', null, adminCookies);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.username, 'alice');
  });

  await test('GET /api/dashboard with auth', async () => {
    const r = await makeRequest(base, 'GET', '/api/dashboard', null, adminCookies);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /api/admin/users (admin only)', async () => {
    const r = await makeRequest(base, 'GET', '/api/admin/users', null, adminCookies);
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body));
  });

  await test('Logout', async () => {
    const r = await makeRequest(base, 'POST', '/auth/logout', null, adminCookies);
    assert.strictEqual(r.status, 200);
  });

  // Login as viewer
  let viewerCookies;
  await test('Login as viewer', async () => {
    const r = await makeRequest(base, 'POST', '/auth/login', { username: 'charlie', password: 'charlie123' });
    assert.strictEqual(r.status, 200);
    viewerCookies = r.cookies;
  });

  await test('Viewer cannot access admin', async () => {
    const r = await makeRequest(base, 'GET', '/api/admin/users', null, viewerCookies);
    assert.strictEqual(r.status, 403);
  });

  await test('Viewer cannot access editor content', async () => {
    const r = await makeRequest(base, 'GET', '/api/editor/content', null, viewerCookies);
    assert.strictEqual(r.status, 403);
  });

  // Login with email
  await test('Login via email', async () => {
    const r = await makeRequest(base, 'POST', '/auth/login/email', { email: 'bob@example.com', password: 'bob123' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.user.username, 'bob');
  });

  await test('Bad credentials returns 401', async () => {
    const r = await makeRequest(base, 'POST', '/auth/login', { username: 'alice', password: 'wrong' });
    assert.strictEqual(r.status, 401);
  });

  server.close();
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => { console.error(err); process.exit(1); });
