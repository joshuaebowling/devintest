const express = require('express');

function quickbooksRouter(quickbooks) {
  const router = express.Router();
  router.get('/vendors', async (req, res) => {
    res.json(await quickbooks.listVendors({ includeInactive: req.query.includeInactive === 'true' }));
  });
  // Returns the Intuit authorization URL; open it in a browser to connect QuickBooks.
  router.get('/connect-url', (req, res) => {
    res.json({ url: quickbooks.getAuthorizationUrl() });
  });
  return router;
}

function quickbooksAuthRouter(quickbooks) {
  const router = express.Router();
  // Public: Intuit redirects the browser here. Protected by the one-time OAuth `state`.
  router.get('/callback', async (req, res) => {
    await quickbooks.handleCallback(req.query);
    res.send('QuickBooks connected. You can close this window.');
  });
  return router;
}

function samsaraRouter(samsara) {
  const router = express.Router();
  router.get('/vendors', async (req, res) => {
    res.json(await samsara.listVendors());
  });
  return router;
}

module.exports = { quickbooksRouter, quickbooksAuthRouter, samsaraRouter };
