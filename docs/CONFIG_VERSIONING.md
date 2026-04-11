# Config Versioning Strategy

> Status: **Design proposal** — nothing in this document is implemented yet.
> This file exists so that when `@ogc-maps/storybook-components` approaches
> v1.0.0 we already have a plan for managing `MapConfig` shape changes
> without breaking stored admin configs.

## Why this exists

The `MapConfig` Zod schema in `packages/map-ui-lib/src/schemas/config.ts` is
the contract between:

1. **JSON configs on disk** (`apps/map-client/public/config.json` and others)
2. **Admin-app database rows** (`map_admin.map_configs.config_json` and the
   per-version snapshots in `map_admin.config_versions`)
3. **Runtime code** (Zustand store, UI components, export pipelines)

Today we move quickly and the only contract is *"whatever the schema says
today, parse with `safeValidateMapConfig`"*. Pre-1.0 that is fine — if we
break the schema, we fix the checked-in configs and move on. Post-1.0 we
will have:

- **External consumers** of `@ogc-maps/storybook-components` who depend on
  the shape of `MapConfig` and cannot be fixed by us.
- **Long-lived admin DB rows** that may have been written against older
  schema versions and need to keep parsing after an upgrade.
- **Rollback expectations** — a user who breaks a config should be able to
  restore a previous version and have it work.

The goal of this design is: **schema changes are additive and automatic.
Every old config always parses into the newest shape, and the original is
preserved so rollback is possible.**

## Proposed design

### 1. Schema version field

Add a `version` field to `MapConfigSchema`:

```ts
export const CURRENT_CONFIG_VERSION = '1.0.0';

export const MapConfigSchema = z.object({
  version: z.string().default(CURRENT_CONFIG_VERSION),
  // ... existing fields
});
```

Key rules:

- **Default, not required.** Configs on disk that predate the versioning
  rollout parse as `1.0.0` (or whatever the first released version is).
  This means existing configs work unchanged.
- **Semver string, not integer.** We already publish with semver via
  changesets, so using the same scheme for the schema avoids a second
  mental model.
- **MAJOR bumps** when we make a breaking change (field removal, type
  change, semantic change). **MINOR** for additive changes (new optional
  field with a default). **PATCH** for bug fixes to the parse logic itself.

### 2. Migration registry

A new file `packages/map-ui-lib/src/schemas/configMigrations.ts`:

```ts
import type { MapConfig } from '../types';

type Migration = {
  from: string;        // semver range or exact version
  to: string;          // exact version after applying
  migrate: (config: unknown) => unknown;
};

export const CONFIG_MIGRATIONS: Migration[] = [
  // Example: 1.0.0 → 1.1.0 renamed `legendOrder` to `legend.order`
  {
    from: '1.0.0',
    to: '1.1.0',
    migrate: (raw) => {
      const cfg = raw as Record<string, unknown>;
      const ui = (cfg.ui ?? {}) as Record<string, unknown>;
      if (ui.legendOrder && !(cfg.legend as Record<string, unknown>)?.order) {
        return {
          ...cfg,
          legend: { ...(cfg.legend ?? {}), order: ui.legendOrder },
          ui: Object.fromEntries(Object.entries(ui).filter(([k]) => k !== 'legendOrder')),
        };
      }
      return cfg;
    },
  },
];
```

Rules for migration functions:

- **Pure, idempotent.** Running a migration twice on the same input must
  produce the same output as running it once. Callers must be able to
  replay migrations without risk.
- **Work on `unknown`, not `MapConfig`.** The *input* to a migration is an
  older shape that does **not** match the current `MapConfig` type. Migrations
  cast to `Record<string, unknown>` and return `unknown`.
- **One step at a time.** Don't write `1.0.0 → 1.5.0` in a single function.
  Write five small migrations. The runner chains them by matching `from`
  against the current config version and applying until we reach
  `CURRENT_CONFIG_VERSION`.
- **Tests are mandatory.** Every migration gets a fixture of the old shape
  under `packages/map-ui-lib/src/schemas/__tests__/migrations/` and a test
  that runs the migration and validates the output against the new schema.

### 3. Migration runner

Exposed alongside `validateMapConfig`:

```ts
export function migrateAndValidate(raw: unknown): {
  config: MapConfig;
  migratedFrom: string | null; // null if no migration was needed
} {
  const rawObj = (raw ?? {}) as Record<string, unknown>;
  const initialVersion = (typeof rawObj.version === 'string' ? rawObj.version : '1.0.0');
  let current: unknown = { ...rawObj, version: initialVersion };
  let applied = false;

  while (true) {
    const currentVersion = (current as { version: string }).version;
    if (currentVersion === CURRENT_CONFIG_VERSION) break;
    const step = CONFIG_MIGRATIONS.find((m) => m.from === currentVersion);
    if (!step) {
      throw new Error(
        `No migration from ${currentVersion} to ${CURRENT_CONFIG_VERSION} — ` +
        `this config was written by a newer version of the app.`,
      );
    }
    current = { ...(step.migrate(current) as object), version: step.to };
    applied = true;
  }

  return {
    config: validateMapConfig(current),
    migratedFrom: applied ? initialVersion : null,
  };
}
```

### 4. Admin app integration

On config load in the admin app server:

1. Read `config_json` from `map_admin.map_configs`.
2. Run `migrateAndValidate`.
3. If `migratedFrom !== null`, store the **migrated** config back into
   `map_admin.map_configs.config_json` in the same transaction AND insert
   a new row into `map_admin.config_versions` with:
   - `original_config_json` = the pre-migration shape
   - `migrated_from_version` = the old version string
   - `created_by = 'auto-migration'`
4. Return a `X-Config-Migrated: <from>-><to>` response header so the admin
   UI can show a non-blocking banner: *"This config was migrated from v1.0.0
   to v1.1.0. The original is preserved in history."*

On the **map-client** side, migration happens in-memory only. We don't
write back to disk — the operator is expected to update the checked-in
config.json.

### 5. Rollback

Because `config_versions` now stores both the original and migrated shapes
for every auto-migration row, rollback is just "copy `original_config_json`
from row N back into `map_configs.config_json`". The migration runner will
re-migrate it on next load, so rollback is safe even across multiple schema
upgrades.

### 6. What counts as breaking

A change is **non-breaking** (MINOR bump, no migration needed) when:

- Adding a new optional field with a `.default()` value.
- Widening an enum (adding a new variant) *if* existing code has a
  fallback branch.
- Loosening a `min`/`max` constraint.

A change is **breaking** (MAJOR bump, migration required) when:

- Renaming a field.
- Changing a field's type (even `string` → `number`).
- Narrowing an enum (removing a variant).
- Changing a field's semantics without changing its shape — e.g. if
  `zoom` changed meaning from "tile-server zoom" to "effective zoom".
  These are the dangerous ones because nothing fails fast.
- Moving a field between objects (`ui.foo` → `layers[].foo`).

If you aren't sure, assume breaking. A needless migration is cheap; a
silent schema drift is not.

## What this design does NOT do

- **It does not allow downgrades.** If a user opens a v1.2.0 config with a
  v1.0.0 client, they get an error. Downgrades require a separate
  `CONFIG_DOWNGRADES` registry that we would only build if a real customer
  asks.
- **It does not version sub-objects independently.** `LayerConfig`,
  `BasemapConfig`, `UIConfig`, and so on all move together with
  `MapConfig`. This keeps the mental model simple at the cost of occasional
  no-op migrations.
- **It does not handle partial parses.** If a config is garbage beyond
  recovery, `validateMapConfig` throws and the admin UI shows the ZodError
  the same way it does today.

## Implementation order (when we do build it)

1. Add `version` to the schema as `.optional()` with `.default('1.0.0')`.
   Land it. Every existing config keeps parsing; nothing changes downstream.
2. Add the migration file + runner with an empty `CONFIG_MIGRATIONS` array
   and a test that asserts `migrateAndValidate` round-trips a fresh config
   unchanged.
3. Wire `migrateAndValidate` into the admin-app loader and the map-client
   boot path. Still no migrations — this is the instrumentation step.
4. When the first breaking change lands, **that PR** adds the migration,
   the fixture, the test, and bumps `CURRENT_CONFIG_VERSION`.

## Testing checklist for every migration

- [ ] Fixture of the old config shape under `__tests__/migrations/`.
- [ ] Test: old fixture, when run through `migrateAndValidate`, produces a
  config that passes `MapConfigSchema.parse`.
- [ ] Test: the migrated config, when re-run through the migration, is
  unchanged (idempotency).
- [ ] Test: fields the migration **doesn't** touch are preserved byte-for-byte.
- [ ] Test: `migratedFrom` is correctly populated.
- [ ] If the migration removed a field: confirm no downstream code still
  references it.

## Open questions

- **Do we version `config.json` on disk too?** The `map-client` loads from
  `/config.json`, which is operator-managed. We should probably warn
  loudly in the console when an unversioned config is migrated, so the
  operator knows to update the file. Decision: yes, console warning. No
  automatic writeback to disk — the browser shouldn't be writing to the
  operator's static files.
- **How do we coordinate with the lib's published version?** The
  `CURRENT_CONFIG_VERSION` string is independent of the npm package version
  because the schema can change without a code release (and vice versa).
  They will usually move together, but don't hard-couple them.
- **Who runs migrations on bulk imports?** The `Import Map` flow (Phase 3,
  Chunk 3E) should also go through `migrateAndValidate`, so that pasting a
  v1.0.0 config into a v1.2.0 app works automatically.
