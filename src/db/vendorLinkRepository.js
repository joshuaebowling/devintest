// All data access goes through stored procedures; no inline SQL against tables.

function toLink(row) {
  if (!row) return null;
  return {
    id: row.id,
    qbVendorId: row.qb_vendor_id,
    qbVendorName: row.qb_vendor_name,
    samsaraVendorId: row.samsara_vendor_id,
    samsaraVendorName: row.samsara_vendor_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createVendorLinkRepository(pool) {
  async function call(procedure, params) {
    const placeholders = params.map(() => '?').join(', ');
    const [results] = await pool.query(`CALL ${procedure}(${placeholders})`, params);
    return results[0];
  }

  return {
    async create({ qbVendorId, qbVendorName = null, samsaraVendorId, samsaraVendorName = null }) {
      const rows = await call('sp_vendor_link_create', [qbVendorId, qbVendorName, samsaraVendorId, samsaraVendorName]);
      return toLink(rows[0]);
    },

    async get(id) {
      const rows = await call('sp_vendor_link_get', [id]);
      return toLink(rows[0]);
    },

    async list({ qbVendorId = null, samsaraVendorId = null } = {}) {
      const rows = await call('sp_vendor_link_list', [qbVendorId, samsaraVendorId]);
      return rows.map(toLink);
    },

    async update(id, { qbVendorId = null, qbVendorName = null, samsaraVendorId = null, samsaraVendorName = null }) {
      const rows = await call('sp_vendor_link_update', [id, qbVendorId, qbVendorName, samsaraVendorId, samsaraVendorName]);
      return toLink(rows[0]);
    },

    async remove(id) {
      const rows = await call('sp_vendor_link_delete', [id]);
      return rows[0].affected_rows > 0;
    },
  };
}

module.exports = { createVendorLinkRepository };
