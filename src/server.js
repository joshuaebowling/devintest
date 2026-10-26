const config = require('./config');
const pool = require('./db/pool');
const { createApp } = require('./app');
const { createEntraAuth } = require('./middleware/auth');
const { createVendorLinkRepository } = require('./db/vendorLinkRepository');
const { createQuickBooksClient } = require('./services/quickbooks');
const { createFileTokenStore } = require('./services/quickbooksTokenStore');
const { createSamsaraClient } = require('./services/samsara');

const { tokenFile, refreshToken, realmId, ...qboOptions } = config.quickbooks;

const app = createApp({
  authenticate: createEntraAuth(config.auth),
  vendorLinkRepo: createVendorLinkRepository(pool),
  quickbooks: createQuickBooksClient({
    ...qboOptions,
    tokenStore: createFileTokenStore({ filePath: tokenFile, refreshToken, realmId }),
  }),
  samsara: createSamsaraClient(config.samsara),
});

app.listen(config.port, () => console.log(`vendor-link-service listening on :${config.port}`));
