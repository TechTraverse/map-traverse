# Feedback Items Outside Code Scope

Non-code work tied to the 2026-05-10 Mike1 feedback. Code work is in
`PLAN.md`; evidence is in `INVESTIGATION.md`. This file is for replies to
send Mike (when he's back), and ops/deployment decisions for whoever owns
the EC2 host.

---

## A. Reply to send Mike — How does Sort Key work?

(Corresponds to PLAN.md item 6.)

> Sort Key controls drawing order **within a single layer** — which features
> in the *same* layer sit on top of which others. Higher numbers draw on
> top.
>
> By default it's a single number applied to every feature, which usually
> isn't useful. To use it the way you're asking — driven by a column on the
> layer's table — set Sort Key to a property expression like
> `["get", "priority"]` so MapLibre reads it from each feature. We're
> adding a "by property" toggle so you don't have to hand-edit the
> expression (item 6 below).
>
> For controlling which *layer* sits on top of which other layer, that's
> the layer order in the LayerPanel (drag-reorder) — not Sort Key.

Verify against the live deployed instance after item 6 ships before
sending.

---

## B. Heads-up to add to the reply

When Mike comes back:

- The `abandoned = "No"` filter you set on the towns layer was matching
  zero rows because the actual values in the data are `"NO"` (uppercase),
  not `"No"`. We're fixing two things: (1) the saved filter wasn't
  actually being applied to the map at all (separate bug), and (2) the
  filter editor now suggests valid values from the data so the next
  filter just works. After the fix you'll need to re-enter the value as
  `"NO"` or pick it from the dropdown. (See PLAN.md item 10.)
- We couldn't reproduce the "imagery layers prevent save" issue. Best
  guess: a transient state from a stale bundle. We're adding guardrails
  that prevent the editor from getting into that state regardless. Let
  us know if you hit it again.
- Same for the search fields you copied from the demo — they all check
  out against the data and they work in the live UI. We're adding
  pre-save validation so a future copy-paste tells you immediately if a
  field doesn't resolve.

---

## C. Items folded into PLAN.md

Tracked there, listed here so we don't double-track:

- Labeling lines/polygons → item 4
- Per-category line styling → item 5
- Color copy/paste → item 7
- Legend background → item 8
- Outline-only swatch → item 9

---

## D. Ops / deployment follow-ups (need a human owner)

Code can't fix these.

### D1. Bundles deployed on `16.147.169.174` are stale

- Map-client deployed: `index-Di0EN54N.js` · CSS `index-BnyVbAjW.css`.
- Admin deployed: `index-Dkt0uFu3.js` (+ `index-Bd_8ecLP.js`,
  `index-WGVBA-xX.js`).
- Local `dist/` hashes differ.

The repo's `docker-compose.yml` doesn't match what the host runs (host has
`ogc-maps-*` containers and a `caddy:2-alpine` gateway, not the repo's
nginx). **Find the actual host compose file** (probably under
`/home/ec2-user/`), document the redeploy command, and add it to
`docs/`. Until that's done, every PLAN.md item ships locally but not to
Mike.

### D2. Auth posture

PLAN's earlier draft said the deployed admin was in no-auth mode.
**That's wrong.** `ADMIN_PASSWORD_HASH` is set in the running container
(bcrypt of the value commented out in `terraform/terraform.tfvars`).
Login is required.

Decide:
- Rotate the password (it's checked in to source via the comment).
- Or migrate to a stronger auth mechanism if more clients are joining.

### D3. Postgres exposed to the public internet

`5432/tcp` is reachable from outside the VPC with the credentials in
`terraform output -raw db_password`. Confirmed working from off-host.
`allowed_postgres_cidrs` defaults to `0.0.0.0/0` in `variables.tf` and
`terraform.tfvars` doesn't override.

Lock down to a trusted CIDR, route DB access through a bastion / SSH
tunnel, or accept the risk. Document the call.

### D4. MapTiler API key in `ogc_sources.auth`

The `maptiler-satellite` source's `auth` blob holds a query-param API key,
and the same key is also embedded literally in the demo's
`imageryLayers[0].tileUrlTemplate` (see `investigation/saved_sources.json`
and `investigation/demo.config.json` locally). The key reaches every map-client
visitor in the unproxied tile URL, so it's effectively public — but it
shouldn't be checked into the DB seed or the demo config.

Rotate, then store the new key only in `ogc_sources.auth` (so the admin
proxy can attach it server-side), or proxy tile requests so the key never
hits the client.

### D5. Stale `public.*` seed data

`public.map_configs` and `public.ogc_sources` have leftover seed rows
that the running app doesn't read (it uses `map_admin.*`). The `public.demo`
config in particular is misleading — anyone debugging will load it
expecting the live demo. Drop the public-schema seed once you've
confirmed nothing references it.

---

## E. Reply structure for Monday

When Mike's back:

1. Open with what's shipping (items 3, 4, 6, 7, 8, 9 from PLAN.md, plain
   English).
2. Sort Key answer (section A).
3. The `"No"` vs `"NO"` heads-up + couldn't-reproduce notes (section B).
4. Items 5, 10 framed as "next round."
5. Don't bring up D1–D5 unless he's the right audience for ops.

Match Mike's register — non-technical.
