require('dotenv').config({ quiet: true });

const env = process.env;

module.exports = {
  port: Number(env.PORT || 3000),
  db: {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'vendor_link',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'vendor_link',
  },
  quickbooks: {
    clientId: env.QBO_CLIENT_ID,
    clientSecret: env.QBO_CLIENT_SECRET,
    realmId: env.QBO_REALM_ID,
    refreshToken: env.QBO_REFRESH_TOKEN,
    redirectUri: env.QBO_REDIRECT_URI || `http://localhost:${env.PORT || 3000}/auth/quickbooks/callback`,
    environment: env.QBO_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
    minorVersion: env.QBO_MINOR_VERSION || '75',
    tokenFile: env.QBO_TOKEN_FILE || '.qbo-tokens.json',
  },
  auth: {
    tenantId: env.AZURE_TENANT_ID,
    clientId: env.AZURE_API_CLIENT_ID,
    requiredScope: env.AZURE_API_SCOPE || 'access_as_user',
    requiredAppRole: env.AZURE_API_APP_ROLE || 'VendorLinks.Access',
  },
  samsara: {
    apiToken: env.SAMSARA_API_TOKEN,
    baseUrl: env.SAMSARA_BASE_URL || 'https://api.samsara.com',
  },
};
