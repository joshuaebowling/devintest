const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createQuickBooksClient } = require('../src/services/quickbooks');
const { createSamsaraClient } = require('../src/services/samsara');
const { createFileTokenStore } = require('../src/services/quickbooksTokenStore');

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('QuickBooks: refreshes token, persists rotated refresh token, paginates vendors', async () => {
  const calls = [];
  const tokenStore = createFileTokenStore({ refreshToken: 'r1', realmId: '123' });
  const fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), opts });
    if (String(url).includes('/tokens/bearer')) {
      return json({ access_token: 'a1', refresh_token: 'r2', expires_in: 3600 });
    }
    const start = Number(new URL(url).searchParams.get('query').match(/STARTPOSITION (\d+)/)[1]);
    const count = start === 1 ? 1000 : 2;
    return json({ QueryResponse: { Vendor: Array.from({ length: count }, (_, i) => ({ Id: String(start + i), DisplayName: `V${start + i}`, Active: true })) } });
  };

  const qb = createQuickBooksClient({ clientId: 'id', clientSecret: 'secret', environment: 'sandbox', minorVersion: '75', tokenStore, fetch });
  const vendors = await qb.listVendors();

  assert.equal(vendors.length, 1002);
  assert.deepEqual(vendors[0], { id: '1', name: 'V1', companyName: null, active: true, email: null, phone: null });
  assert.equal(calls.filter((c) => c.url.includes('/tokens/bearer')).length, 1);
  assert.match(calls[1].url, /^https:\/\/sandbox-quickbooks\.api\.intuit\.com\/v3\/company\/123\/query/);
  assert.equal(calls[1].opts.headers.Authorization, 'Bearer a1');
  assert.equal(tokenStore.get().refreshToken, 'r2');
});

test('QuickBooks: errors when not connected', async () => {
  const qb = createQuickBooksClient({ clientId: 'id', clientSecret: 's', environment: 'sandbox', tokenStore: createFileTokenStore({ realmId: '1' }) });
  await assert.rejects(qb.listVendors(), { status: 401 });
});

test('Samsara: follows pagination cursor', async () => {
  const urls = [];
  const fetch = async (url, opts) => {
    urls.push(new URL(url));
    assert.equal(opts.headers.Authorization, 'Bearer tok');
    return new URL(url).searchParams.get('after')
      ? json({ data: [{ id: 'b', name: 'B' }], pagination: { endCursor: '', hasNextPage: false } })
      : json({ data: [{ id: 'a', name: 'A' }], pagination: { endCursor: 'c1', hasNextPage: true } });
  };
  const samsara = createSamsaraClient({ apiToken: 'tok', baseUrl: 'https://api.samsara.com', fetch });
  const vendors = await samsara.listVendors();

  assert.deepEqual(vendors.map((v) => v.id), ['a', 'b']);
  assert.equal(urls[0].pathname, '/fleet/maintenance/vendors');
  assert.equal(urls[1].searchParams.get('after'), 'c1');
});

test('Samsara: surfaces API errors as 502', async () => {
  const samsara = createSamsaraClient({ apiToken: 'tok', baseUrl: 'https://api.samsara.com', fetch: async () => json({ message: 'bad' }, 401) });
  await assert.rejects(samsara.listVendors(), { status: 502 });
});
