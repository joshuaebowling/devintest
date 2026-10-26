const express = require('express');

function quickbooksRouter(quickbooks) {
  const router = express.Router();
  router.get('/vendors', async (req, res) => {
    res.json(await quickbooks.listVendors({ includeInactive: req.query.includeInactive === 'true' }));
  });
  return router;
}

function quickbooksAuthRouter(quickbooks) {
  const router = express.Router();
  router.get('/connect', (req, res) => res.redirect(quickbooks.getAuthorizationUrl()));
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
