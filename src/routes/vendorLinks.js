const express = require('express');
const { HttpError } = require('../services/httpError');

const FIELDS = ['qbVendorId', 'qbVendorName', 'samsaraVendorId', 'samsaraVendorName'];

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'id must be a positive integer');
  return id;
}

function pickFields(body = {}) {
  const out = {};
  for (const field of FIELDS) {
    if (body[field] === undefined || body[field] === null) continue;
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      throw new HttpError(400, `${field} must be a non-empty string`);
    }
    out[field] = body[field].trim();
  }
  return out;
}

function vendorLinksRouter(repo) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const { qbVendorId, samsaraVendorId } = req.query;
    res.json(await repo.list({ qbVendorId, samsaraVendorId }));
  });

  router.get('/:id', async (req, res) => {
    const link = await repo.get(parseId(req.params.id));
    if (!link) throw new HttpError(404, 'Vendor link not found');
    res.json(link);
  });

  router.post('/', async (req, res) => {
    const fields = pickFields(req.body);
    if (!fields.qbVendorId || !fields.samsaraVendorId) {
      throw new HttpError(400, 'qbVendorId and samsaraVendorId are required');
    }
    res.status(201).json(await repo.create(fields));
  });

  const update = async (req, res) => {
    const id = parseId(req.params.id);
    const fields = pickFields(req.body);
    if (!Object.keys(fields).length) throw new HttpError(400, `Provide at least one of: ${FIELDS.join(', ')}`);
    const link = await repo.update(id, fields);
    if (!link) throw new HttpError(404, 'Vendor link not found');
    res.json(link);
  };
  router.put('/:id', update);
  router.patch('/:id', update);

  router.delete('/:id', async (req, res) => {
    const deleted = await repo.remove(parseId(req.params.id));
    if (!deleted) throw new HttpError(404, 'Vendor link not found');
    res.status(204).end();
  });

  return router;
}

module.exports = { vendorLinksRouter };
