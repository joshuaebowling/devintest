# vendor-link-service

Node.js (Express) + MySQL service that links **QuickBooks Online vendors** to **Samsara vendors**.

- All database CRUD goes through MySQL stored procedures (`db/migrations/002_vendor_link_procedures.sql`).
- Fetches vendor lists from the QuickBooks Online Accounting API and the Samsara API.
- `/api/*` is protected by Microsoft Entra ID (Azure AD) bearer tokens.

## Quick start

```bash
cp .env.example .env          # fill in Entra ID / QuickBooks / Samsara settings
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

## Authentication (Microsoft Entra ID)

Every `/api/*` request needs `Authorization: Bearer <access token>` issued by your Entra ID tenant for this API. `/health` and `/auth/quickbooks/callback` are public. The server refuses to start without `AZURE_TENANT_ID` and `AZURE_API_CLIENT_ID`.

Accepted tokens (signature, tenant issuer, audience and expiry are all verified):
- **Users** (browser apps, delegated): `scp` must include `AZURE_API_SCOPE` (default `access_as_user`). Any user in the tenant who can get a token is allowed.
- **Services** (client-credentials, app-only): `roles` must include `AZURE_API_APP_ROLE` (default `VendorLinks.Access`). Without this check, any app in the tenant could get a token for the API.

Missing/invalid token -> `401`; valid token without the scope/role -> `403`.

### Entra ID setup (Azure portal -> App registrations)
1. **API app**: register e.g. `vendor-link-api`. Set `AZURE_API_CLIENT_ID` to its Application (client) ID and `AZURE_TENANT_ID` to the Directory (tenant) ID.
   - *Expose an API*: set the Application ID URI to `api://<api-client-id>` and add the scope `access_as_user`.
   - *App roles*: add `VendorLinks.Access` with allowed member type **Applications**.
   - *Manifest*: set `"requestedAccessTokenVersion": 2` (v1 tokens are also accepted).
2. **Browser app (SPA)**: register separately with a SPA redirect URI, add API permission `vendor-link-api / access_as_user`, and use MSAL (e.g. `@azure/msal-browser`) to request the scope `api://<api-client-id>/access_as_user`.
3. **Service callers**: register the calling app, add API permission `vendor-link-api / VendorLinks.Access` (Application permission), **grant admin consent**, then use the client-credentials flow with scope `api://<api-client-id>/.default`.

Quick manual test with the Azure CLI: add `04b07795-8ddb-461a-bbee-02f9e1bf7b46` (Azure CLI) under *Expose an API -> Authorized client applications* for the scope, then:

```bash
TOKEN=$(az account get-access-token --scope api://<api-client-id>/access_as_user --query accessToken -o tsv)
curl -H "Authorization: Bearer $TOKEN" localhost:3000/api/vendor-links
```

## API

| method | path | notes |
| --- | --- | --- |
| GET | `/health` | public |
| GET | `/api/vendor-links` | optional `?qbVendorId=` / `?samsaraVendorId=` |
| GET | `/api/vendor-links/:id` | |
| POST | `/api/vendor-links` | body: `qbVendorId`, `samsaraVendorId` (required), `qbVendorName`, `samsaraVendorName` |
| PUT/PATCH | `/api/vendor-links/:id` | any subset of the body fields above |
| DELETE | `/api/vendor-links/:id` | 204 |
| GET | `/api/quickbooks/vendors` | all pages; `?includeInactive=true` to include inactive |
| GET | `/api/samsara/vendors` | all pages |
| GET | `/api/quickbooks/connect-url` | returns `{ url }`; open it in a browser to connect QuickBooks (callback: public `/auth/quickbooks/callback`) |

Duplicate QuickBooks or Samsara vendor IDs return `409`.

```bash
curl -X POST localhost:3000/api/vendor-links -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"qbVendorId":"56","qbVendorName":"Bob'\''s Tires","samsaraVendorId":"9814a1fa-f0c6-408b-bf85-51dc3bc71ac7","samsaraVendorName":"Acme Tire & Service"}'
```

## External APIs

### QuickBooks Online
1. Create an app at https://developer.intuit.com and set `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_ENVIRONMENT` (`sandbox`/`production`).
2. Add `QBO_REDIRECT_URI` (default `http://localhost:3000/auth/quickbooks/callback`) to the app's redirect URIs.
3. Call `GET /api/quickbooks/connect-url` (authenticated) and open the returned URL in a browser to authorize, **or** set `QBO_REALM_ID` + `QBO_REFRESH_TOKEN` (e.g. from the Intuit OAuth Playground).

QuickBooks rotates refresh tokens; the latest one is saved to `QBO_TOKEN_FILE` (default `.qbo-tokens.json`, git-ignored). Vendors are fetched via `SELECT * FROM Vendor` queries, 1000 per page.

### Samsara
Set `SAMSARA_API_TOKEN` (needs the **Read Work Orders** scope) and, for EU/CA orgs, `SAMSARA_BASE_URL`. Vendors come from `GET /fleet/maintenance/vendors` (currently a beta endpoint), following `pagination.endCursor`.

## Tests

```bash
npm test
```
