const crypto = require('crypto');
const { HttpError, readBody } = require('./httpError');

const AUTHORIZE_URL = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const API_BASE = {
  sandbox: 'https://sandbox-quickbooks.api.intuit.com',
  production: 'https://quickbooks.api.intuit.com',
};
const PAGE_SIZE = 1000; // QBO query max
const SCOPE = 'com.intuit.quickbooks.accounting';

function toVendor(v) {
  return {
    id: v.Id,
    name: v.DisplayName,
    companyName: v.CompanyName ?? null,
    active: v.Active,
    email: v.PrimaryEmailAddr?.Address ?? null,
    phone: v.PrimaryPhone?.FreeFormNumber ?? null,
  };
}

function createQuickBooksClient({ clientId, clientSecret, redirectUri, environment, minorVersion, tokenStore, fetch = globalThis.fetch }) {
  const pendingStates = new Set();

  function assertConfigured() {
    if (!clientId || !clientSecret) {
      throw new HttpError(500, 'QuickBooks is not configured: set QBO_CLIENT_ID and QBO_CLIENT_SECRET');
    }
  }

  async function requestToken(params) {
    assertConfigured();
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(params).toString(),
    });
    const body = await readBody(res);
    if (!res.ok) throw new HttpError(502, 'QuickBooks token request failed', body);

    tokenStore.set({
      accessToken: body.access_token,
      accessTokenExpiresAt: Date.now() + (body.expires_in - 60) * 1000,
      refreshToken: body.refresh_token,
    });
    return body;
  }

  async function getAccessToken() {
    const { accessToken, accessTokenExpiresAt, refreshToken } = tokenStore.get();
    if (accessToken && accessTokenExpiresAt > Date.now()) return accessToken;
    if (!refreshToken) {
      throw new HttpError(401, 'QuickBooks is not connected: open the URL from GET /api/quickbooks/connect-url or set QBO_REFRESH_TOKEN');
    }
    const body = await requestToken({ grant_type: 'refresh_token', refresh_token: refreshToken });
    return body.access_token;
  }

  async function query(sql) {
    const { realmId } = tokenStore.get();
    if (!realmId) throw new HttpError(500, 'QuickBooks realm (company) ID is unknown: set QBO_REALM_ID');

    const url = new URL(`${API_BASE[environment]}/v3/company/${realmId}/query`);
    url.searchParams.set('query', sql);
    url.searchParams.set('minorversion', minorVersion);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${await getAccessToken()}`, Accept: 'application/json' },
    });
    const body = await readBody(res);
    if (!res.ok) throw new HttpError(502, 'QuickBooks API request failed', body);
    return body.QueryResponse || {};
  }

  return {
    getAuthorizationUrl() {
      assertConfigured();
      const state = crypto.randomBytes(16).toString('hex');
      pendingStates.add(state);
      const url = new URL(AUTHORIZE_URL);
      url.search = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        scope: SCOPE,
        redirect_uri: redirectUri,
        state,
      }).toString();
      return url.toString();
    },

    async handleCallback({ code, state, realmId }) {
      if (!state || !pendingStates.delete(state)) throw new HttpError(400, 'Invalid OAuth state');
      if (!code) throw new HttpError(400, 'Missing authorization code');
      await requestToken({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
      if (realmId) tokenStore.set({ realmId });
    },

    async listVendors({ includeInactive = false } = {}) {
      const where = includeInactive ? ' WHERE Active IN (true, false)' : '';
      const vendors = [];
      for (let start = 1; ; start += PAGE_SIZE) {
        const page = await query(`SELECT * FROM Vendor${where} STARTPOSITION ${start} MAXRESULTS ${PAGE_SIZE}`);
        const batch = page.Vendor || [];
        vendors.push(...batch.map(toVendor));
        if (batch.length < PAGE_SIZE) break;
      }
      return vendors;
    },
  };
}

module.exports = { createQuickBooksClient };
