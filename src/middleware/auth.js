const { createRemoteJWKSet, jwtVerify } = require('jose');
const { HttpError } = require('../services/httpError');

// Validates Microsoft Entra ID access tokens issued for this API.
// Delegated (user) tokens must carry `requiredScope` in `scp`;
// app-only (service) tokens have no `scp` and must carry `requiredAppRole` in `roles`.
function createEntraAuth({ tenantId, clientId, requiredScope, requiredAppRole, jwks }) {
  if (!tenantId || !clientId) {
    throw new Error('Entra ID auth is not configured: set AZURE_TENANT_ID and AZURE_API_CLIENT_ID');
  }

  const keySet = jwks || createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`));
  const verifyOptions = {
    issuer: [`https://login.microsoftonline.com/${tenantId}/v2.0`, `https://sts.windows.net/${tenantId}/`],
    audience: [clientId, `api://${clientId}`],
    algorithms: ['RS256'],
  };

  function isAuthorized(payload) {
    if (typeof payload.scp === 'string') return payload.scp.split(' ').includes(requiredScope);
    return Array.isArray(payload.roles) && payload.roles.includes(requiredAppRole);
  }

  return async function authenticate(req, res, next) {
    const token = req.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) {
      res.set('WWW-Authenticate', 'Bearer');
      return next(new HttpError(401, 'Missing bearer token'));
    }

    let payload;
    try {
      ({ payload } = await jwtVerify(token, keySet, verifyOptions));
    } catch {
      res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
      return next(new HttpError(401, 'Invalid or expired token'));
    }

    if (!isAuthorized(payload)) {
      return next(new HttpError(403, 'Token lacks the required scope or app role'));
    }

    req.user = {
      oid: payload.oid,
      name: payload.name,
      username: payload.preferred_username ?? payload.upn,
      appId: payload.azp ?? payload.appid,
      isApp: typeof payload.scp !== 'string',
    };
    return next();
  };
}

module.exports = { createEntraAuth };
