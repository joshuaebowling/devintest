const { HttpError, readBody } = require('./httpError');

function toVendor(v) {
  return {
    id: v.id,
    name: v.name,
    addressId: v.addressId ?? null,
    externalIds: v.externalIds ?? null,
  };
}

// Uses the Samsara maintenance vendors endpoint (GET /fleet/maintenance/vendors).
// The API token needs the "Read Work Orders" scope.
function createSamsaraClient({ apiToken, baseUrl, fetch = globalThis.fetch }) {
  return {
    async listVendors() {
      if (!apiToken) throw new HttpError(500, 'Samsara is not configured: set SAMSARA_API_TOKEN');

      const vendors = [];
      let after;
      do {
        const url = new URL('/fleet/maintenance/vendors', baseUrl);
        url.searchParams.set('includeExternalIds', 'true');
        if (after) url.searchParams.set('after', after);

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' },
        });
        const body = await readBody(res);
        if (!res.ok) throw new HttpError(502, 'Samsara API request failed', body);

        vendors.push(...(body.data || []).map(toVendor));
        after = body.pagination?.hasNextPage ? body.pagination.endCursor : undefined;
      } while (after);
      return vendors;
    },
  };
}

module.exports = { createSamsaraClient };
