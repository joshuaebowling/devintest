const express = require('express');
const { vendorLinksRouter } = require('./routes/vendorLinks');
const { quickbooksRouter, quickbooksAuthRouter, samsaraRouter } = require('./routes/externalVendors');
const { errorHandler } = require('./middleware/errorHandler');

function createApp({ authenticate, vendorLinkRepo, quickbooks, samsara }) {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/auth/quickbooks', quickbooksAuthRouter(quickbooks));

  app.use('/api', authenticate);
  app.use('/api/vendor-links', vendorLinksRouter(vendorLinkRepo));
  app.use('/api/quickbooks', quickbooksRouter(quickbooks));
  app.use('/api/samsara', samsaraRouter(samsara));

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
