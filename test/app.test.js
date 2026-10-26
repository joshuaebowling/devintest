const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');

function fakeRepo() {
  const rows = new Map();
  let nextId = 1;
  return {
    async create(fields) {
      for (const r of rows.values()) {
        if (r.qbVendorId === fields.qbVendorId || r.samsaraVendorId === fields.samsaraVendorId) {
          throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
        }
      }
      const row = { id: nextId++, qbVendorName: null, samsaraVendorName: null, ...fields };
      rows.set(row.id, row);
      return row;
    },
    async get(id) { return rows.get(id) || null; },
    async list() { return [...rows.values()]; },
    async update(id, fields) {
      if (!rows.has(id)) return null;
      Object.assign(rows.get(id), fields);
      return rows.get(id);
    },
    async remove(id) { return rows.delete(id); },
  };
}

function buildApp() {
  return createApp({
    authenticate: (req, res, next) => next(),
    vendorLinkRepo: fakeRepo(),
    quickbooks: {
      listVendors: async () => [{ id: '1', name: 'QB Vendor' }],
      getAuthorizationUrl: () => 'https://appcenter.intuit.com/connect/oauth2?state=x',
    },
    samsara: { listVendors: async () => [{ id: 'abc', name: 'Samsara Vendor' }] },
  });
}

test('vendor link CRUD', async () => {
  const app = buildApp();

  const created = await request(app).post('/api/vendor-links')
    .send({ qbVendorId: '1', samsaraVendorId: 'abc', qbVendorName: 'QB Vendor' }).expect(201);
  assert.equal(created.body.id, 1);

  await request(app).post('/api/vendor-links').send({ qbVendorId: '1', samsaraVendorId: 'xyz' }).expect(409);
  await request(app).post('/api/vendor-links').send({ qbVendorId: '2' }).expect(400);

  const fetched = await request(app).get('/api/vendor-links/1').expect(200);
  assert.equal(fetched.body.samsaraVendorId, 'abc');

  const updated = await request(app).put('/api/vendor-links/1').send({ samsaraVendorName: 'S' }).expect(200);
  assert.equal(updated.body.samsaraVendorName, 'S');
  await request(app).put('/api/vendor-links/1').send({}).expect(400);

  const list = await request(app).get('/api/vendor-links').expect(200);
  assert.equal(list.body.length, 1);

  await request(app).delete('/api/vendor-links/1').expect(204);
  await request(app).get('/api/vendor-links/1').expect(404);
  await request(app).get('/api/vendor-links/abc').expect(400);
});

test('external vendor endpoints', async () => {
  const app = buildApp();
  const qb = await request(app).get('/api/quickbooks/vendors').expect(200);
  assert.equal(qb.body[0].name, 'QB Vendor');
  const ss = await request(app).get('/api/samsara/vendors').expect(200);
  assert.equal(ss.body[0].name, 'Samsara Vendor');
  const connect = await request(app).get('/api/quickbooks/connect-url').expect(200);
  assert.match(connect.body.url, /^https:\/\/appcenter\.intuit\.com\//);
});
