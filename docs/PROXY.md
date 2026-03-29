# Source Proxy

The admin server can proxy requests to upstream OGC API sources on behalf of the map client. This keeps API keys and credentials server-side (never exposed to browsers) and avoids CORS issues with third-party tile servers.

---

## How It Works

```
Browser                    Admin Server                   Upstream Source
  │                            │                               │
  │  GET /api/configs/default  │                               │
  │ ──────────────────────────>│                               │
  │                            │  (rewrites proxied URLs)      │
  │  <config with proxy URLs>  │                               │
  │ <──────────────────────────│                               │
  │                            │                               │
  │  GET /api/proxy/{id}/...   │                               │
  │ ──────────────────────────>│  GET upstream + auth headers  │
  │                            │ ─────────────────────────────>│
  │                            │  <── response (tiles, JSON)   │
  │  <── streamed response     │                               │
  │                            │                               │
```

1. **Config rewriting** -- When the client fetches a map config (`GET /api/configs/:id`), the server checks which sources have `proxy = true`. For those sources, it rewrites `source.url` and imagery `tileUrlTemplate` values to point at the proxy endpoint, and strips the `auth` field so credentials never reach the browser.

2. **Request forwarding** -- The proxy endpoint (`/api/proxy/:sourceId/*`) looks up the source's real URL and auth from the database, applies credentials, and streams the upstream response back to the client.

---

## Enabling the Proxy

### Via the Admin UI

In the Source Editor, check **"Proxy requests through server"**. When combined with auth credentials, a note confirms that credentials will be applied server-side.

### Via the API

Set `proxy: true` when creating or updating a source:

```bash
# Create a proxied source
curl -X POST /api/sources -H 'Content-Type: application/json' -d '{
  "source_id": "aerial",
  "url": "https://tiles.example.com/api/v1",
  "source_type": "imagery",
  "auth": { "type": "query_param", "name": "access_token", "value": "sk_..." },
  "proxy": true
}'

# Enable proxy on an existing source
curl -X PUT /api/sources/42 -H 'Content-Type: application/json' -d '{
  "proxy": true
}'
```

### In MapConfig

The `proxy` field is part of the `OgcApiSource` schema (see [CONFIGURATION.md](./CONFIGURATION.md#ogcapisource)):

```ts
{
  id: 'aerial',
  url: 'https://tiles.example.com/api/v1',
  type: 'imagery',
  auth: { type: 'header', name: 'Authorization', value: 'Bearer sk_...' },
  proxy: true,
}
```

---

## Proxy Endpoint Reference

### `ALL /api/proxy/:sourceId/*`

Forwards any HTTP method to the upstream source identified by `:sourceId`.

**Behavior:**

- Looks up the source in the database (cached in memory for 60 seconds).
- Returns `404` if the source does not exist, `403` if `proxy` is not enabled.
- Merges query parameters: client params, then source URL params, then auth params (auth wins on conflict).
- Applies header-based auth to the upstream request.
- Forwards `Accept` and `Content-Type` headers.
- Streams the upstream response body back to the client.
- 30-second timeout on upstream requests.

**Response headers forwarded:** `content-type`, `content-length`, `content-encoding`, `cache-control`, `etag`, `last-modified`.

**Error responses:**

| Status | Meaning |
|---|---|
| 403 | Source exists but proxy is not enabled |
| 404 | Source not found |
| 502 | Upstream unreachable or stream error |
| 504 | Upstream request timed out (30s) |

---

## What Gets Rewritten

When a config is served, the server rewrites URLs for every source that has `proxy = true` in the `ogc_sources` table:

| Original field | Rewritten to |
|---|---|
| `source.url` | `/api/proxy/{sourceId}/{path}` |
| `source.auth` | Removed (never sent to browser) |
| `imageryLayer.tileUrlTemplate` | `/api/proxy/{sourceId}/{path}` (only if same origin as source URL) |

Imagery tile URL templates are only rewritten when their origin matches the source origin. This prevents the proxy from being used to reach unrelated hosts.

---

## Auth Handling

Both auth types are supported:

| Auth type | How it is applied |
|---|---|
| `query_param` | Appended to the upstream URL query string |
| `header` | Added as an HTTP request header to the upstream request |

Auth credentials are stored in the `ogc_sources.auth` JSONB column and are never included in the config response when proxy is enabled.

---

## Caching

Source lookups are cached in server memory to avoid a database query on every tile request:

- **TTL:** 60 seconds
- **Max entries:** 500 (evicts expired first, then oldest)

After updating a source's URL or auth in the admin UI, the proxy will pick up the change within 60 seconds. Restarting the admin server clears the cache immediately.
