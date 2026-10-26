# vendor-link-service

Node.js (Express) + MySQL service that links **QuickBooks Online vendors** to **Samsara vendors**.

- All database CRUD goes through MySQL stored procedures (`db/migrations/002_vendor_link_procedures.sql`).
- Fetches vendor lists from the QuickBooks Online Accounting API and the Samsara API.

## Quick start

```bash
cp .env.example .env          # fill in QuickBooks / Samsara credentials
docker compose up -d --wait   # MySQL 8.4 on :3306
npm install
npm run db:migrate            # creates table + stored procedures (idempotent)
npm start                     # http://localhost:3000
```

`npm run db:migrate` works against any MySQL 8 server configured via `DB_*` env vars; it parses `DELIMITER` blocks, so the `.sql` files can also be run directly with the `mysql` CLI.

## Database

Table `vendor_links` (one-to-one: each QuickBooks vendor and each Samsara vendor can appear in at most one link):

| column | type |
| --- | --- |
| `id` | INT UNSIGNED, PK |
| `qb_vendor_id` | VARCHAR(64), unique |
| `qb_vendor_name` | VARCHAR(255), nullable |
| `samsara_vendor_id` | VARCHAR(64), unique |
| `samsara_vendor_name` | VARCHAR(255), nullable |
| `created_at` / `updated_at` | TIMESTAMP |

Stored procedures:

| procedure | purpose |
| --- | --- |
| `sp_vendor_link_create(qb_id, qb_name, samsara_id, samsara_name)` | insert, returns new row |
| `sp_vendor_link_get(id)` | single row |
| `sp_vendor_link_list(qb_id, samsara_id)` | all rows; either filter may be `NULL` |
| `sp_vendor_link_update(id, qb_id, qb_name, samsara_id, samsara_name)` | `NULL` args leave columns unchanged; returns row |
| `sp_vendor_link_delete(id)` | returns `affected_rows` |

## API

| method | path | notes |
| --- | --- | --- |
| GET | `/health` | |
| GET | `/api/vendor-links` | optional `?qbVendorId=` / `?samsaraVendorId=` |
| GET | `/api/vendor-links/:id` | |
| POST | `/api/vendor-links` | body: `qbVendorId`, `samsaraVendorId` (required), `qbVendorName`, `samsaraVendorName` |
| PUT/PATCH | `/api/vendor-links/:id` | any subset of the body fields above |
| DELETE | `/api/vendor-links/:id` | 204 |
| GET | `/api/quickbooks/vendors` | all pages; `?includeInactive=true` to include inactive |
| GET | `/api/samsara/vendors` | all pages |
| GET | `/auth/quickbooks/connect` | starts QuickBooks OAuth; callback at `/auth/quickbooks/callback` |

Duplicate QuickBooks or Samsara vendor IDs return `409`.

```bash
curl -X POST localhost:3000/api/vendor-links -H 'content-type: application/json' \
  -d '{"qbVendorId":"56","qbVendorName":"Bob'\''s Tires","samsaraVendorId":"9814a1fa-f0c6-408b-bf85-51dc3bc71ac7","samsaraVendorName":"Acme Tire & Service"}'
```

## External APIs

### QuickBooks Online
1. Create an app at https://developer.intuit.com and set `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_ENVIRONMENT` (`sandbox`/`production`).
2. Add `QBO_REDIRECT_URI` (default `http://localhost:3000/auth/quickbooks/callback`) to the app's redirect URIs.
3. Visit `http://localhost:3000/auth/quickbooks/connect` to authorize, **or** set `QBO_REALM_ID` + `QBO_REFRESH_TOKEN` (e.g. from the Intuit OAuth Playground).

QuickBooks rotates refresh tokens; the latest one is saved to `QBO_TOKEN_FILE` (default `.qbo-tokens.json`, git-ignored). Vendors are fetched via `SELECT * FROM Vendor` queries, 1000 per page.

### Samsara
Set `SAMSARA_API_TOKEN` (needs the **Read Work Orders** scope) and, for EU/CA orgs, `SAMSARA_BASE_URL`. Vendors come from `GET /fleet/maintenance/vendors` (currently a beta endpoint), following `pagination.endCursor`.

## Tests

```bash
npm test
```
