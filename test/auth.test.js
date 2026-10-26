const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } = require('jose');
const { createApp } = require('../src/app');
const { createEntraAuth } = require('../src/middleware/auth');

const TENANT = '11111111-1111-1111-1111-111111111111';
const CLIENT = '22222222-2222-2222-2222-222222222222';
const V2_ISSUER = `https://login.microsoftonline.com/${TENANT}/v2.0`;

let app;
let privateKey;
let otherKey;

before(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  ({ privateKey: otherKey } = await generateKeyPair('RS256'));
  const jwk = await exportJWK(pair.publicKey);
  const jwks = createLocalJWKSet({ keys: [{ ...jwk, kid: 'k1', alg: 'RS256' }] });

  app = createApp({
    authenticate: createEntraAuth({ tenantId: TENANT, clientId: CLIENT, requiredScope: 'access_as_user', requiredAppRole: 'VendorLinks.Access', jwks }),
    vendorLinkRepo: { list: async () => [] },
    quickbooks: { handleCallback: async () => {} },
    samsara: { listVendors: async () => [] },
  });
});

function sign(claims, { key = privateKey, issuer = V2_ISSUER, audience = CLIENT, expiresIn = '5m' } = {}) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

const get = (token) => {
  const req = request(app).get('/api/vendor-links');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

test('public routes need no token', async () => {
  await request(app).get('/health').expect(200);
  await request(app).get('/auth/quickbooks/callback').expect(200);
});

test('missing token -> 401 with WWW-Authenticate', async () => {
  const res = await get().expect(401);
  assert.equal(res.headers['www-authenticate'], 'Bearer');
});

test('delegated user token with required scope -> 200', async () => {
  await get(await sign({ scp: 'access_as_user', oid: 'u1', name: 'User' })).expect(200);
});

test('v1 token (sts.windows.net issuer, api:// audience) -> 200', async () => {
  await get(await sign({ scp: 'access_as_user' }, { issuer: `https://sts.windows.net/${TENANT}/`, audience: `api://${CLIENT}` })).expect(200);
});

test('app-only service token with required role -> 200', async () => {
  await get(await sign({ roles: ['VendorLinks.Access'], azp: 'svc' })).expect(200);
});

test('token without required scope or role -> 403', async () => {
  await get(await sign({ scp: 'User.Read' })).expect(403);
  await get(await sign({ roles: ['Other.Role'] })).expect(403);
  await get(await sign({})).expect(403);
});

test('invalid tokens -> 401', async () => {
  await get(await sign({ scp: 'access_as_user' }, { audience: 'someone-else' })).expect(401);
  await get(await sign({ scp: 'access_as_user' }, { issuer: 'https://login.microsoftonline.com/other-tenant/v2.0' })).expect(401);
  await get(await sign({ scp: 'access_as_user' }, { expiresIn: Math.floor(Date.now() / 1000) - 60 })).expect(401);
  await get(await sign({ scp: 'access_as_user' }, { key: otherKey })).expect(401);
  await get('not-a-jwt').expect(401);
});

test('refuses to start without tenant/client config', () => {
  assert.throws(() => createEntraAuth({ tenantId: TENANT }), /AZURE_API_CLIENT_ID/);
});
