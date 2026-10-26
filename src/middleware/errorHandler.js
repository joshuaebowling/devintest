function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A link already exists for that QuickBooks or Samsara vendor' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err.status) {
    return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };
