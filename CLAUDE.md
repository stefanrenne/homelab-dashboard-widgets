# CLAUDE.md

Widget collection for homelab-dashboard (`../homelab-dashboard`). Each folder in `widgets/` is
one widget package following the dashboard's widget API 1
(`../homelab-dashboard/docs/widgets/api-reference.md`).

## Structure

| Path | What |
|---|---|
| `widgets/<id>/` | `widget.yaml`, `server.js`, `i18n.json`. Folder name = widget id. |
| `fixtures/<id>.json` | API answers per route (`"GET /api/v3/movie": ...`), used by tests and the mock. |
| `scripts/mock-homelab.mjs` | Serves the fixtures at `/<id>/...`; the tests start it, `npm run mock` too. |
| `tests/widgets.test.mjs` | Every widget through the public `ctx` against the mock, plus package checks. |

## Rules

1. **Each widget folder stands alone.** Only `node:` imports, no shared files between folders:
   users may install one folder (`subdir:` / `only:`). A test checks the imports.
2. **Keys and passwords are `secret: true`** in widget.yaml. A test checks names like key/password/token.
3. **Field keys follow homepage's widget** (block `key`), so `fields:` lists from homepage keep working.
4. **Every label has a translation in en, nl, fr, de and es** (a test checks this).
5. **A new widget comes with a fixture and a test**, and a row in the README table.
6. **Bump `version` in a widget's widget.yaml when it changes**, and tag the repo for a release.
7. Errors are thrown with a short message without secrets (`Radarr movie answered 401`); the
   dashboard turns "answered 401/404/5xx" into advice, so keep that wording.
8. **Labels are i18n keys, never sentences built in code.** Names in a label go in `vars`
   (`{ label: 'poolUsed', vars: { pool } }`), states are keys (`importBlocked`).
9. **Labels fit a phone**: whole words, no abbreviations, at most two lines at ~8 characters per
   line in a card with four blocks. `tests/widgets.test.mjs` estimates this per widget and language.
10. **Decimal units and one time format** (`m:ss`, `h:mm:ss`) in every widget.
11. **Mark what needs attention** with `status: 'warn'` (or `'error'`), on blocks and rows, and put
    problem rows first.
12. Show at most a handful of blocks by default; offer the rest through `defaultFields` + `fields`.

## Releasing

Bump the changed widgets' `version`, add a CHANGELOG section, set `package.json`'s version, tag
`vX.Y.Z`, push with tags. CI checks the tag against package.json and the CHANGELOG and publishes a
GitHub release with a zip per widget.

## Commands

```bash
npm ci && npm test
npm run mock
```
