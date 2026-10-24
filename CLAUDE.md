# CLAUDE.md

Widget collection for homelab-dashboard (`../homelab-dashboard`). Each folder in `widgets/` is
one widget package following the dashboard's widget API 1
(`../homelab-dashboard/docs/widgets/api-reference.md`).

## Structure

| Path | What |
|---|---|
| `widgets/<id>/` | `widget.yaml`, `server.js`, `i18n.json`, `README.md` (its docs page, rule 13), optionally `client.js` (its own look). Folder name = widget id. |
| `fixtures/<id>.json` | API answers per route (`"GET /api/v3/movie": ...`; `{ "_headers": {...}, "_body": ... }` for headers, `"_text"` for a plain text body), used by tests and the mock. |
| `scripts/mock-homelab.mjs` | Serves the fixtures at `/<id>/...`; the tests start it, `npm run mock` too. |
| `tests/widgets.test.mjs` | Every widget through the public `ctx` against the mock, plus package checks. |

## Rules

1. **Each widget folder stands alone.** Only `node:` imports, no shared files between folders:
   users may install one folder (`subdir:` / `only:`). A test checks the imports.
2. **Keys and passwords are `secret: true`** in widget.yaml. A test checks names like key/password/token.
3. **Field keys follow homepage's widget** (block `key`), so `fields:` lists from homepage keep working.
4. **Every label has a translation in the dashboard's 17 languages**: en, nl, fr, de, es, ca, he,
   hr, hu, it, nb-NO, pt, ru, sv, vi, zh-Hans, zh-Hant (a test checks this).
5. **A new widget comes with a fixture, a test and a `README.md`**, and a row in the README table.
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
13. **`widgets/<id>/README.md` is the widget's page** on the dashboard's documentation site
    (https://stefanrenne.github.io/homelab-dashboard/widgets/collection/<id>.html), generated
    from the newest release. It holds, in this order:
    1. `# <name>`: exactly the `name` in widget.yaml.
    2. What it shows, and the setup the user must do in the service: where the API key or token
       is (menu path), which ids or names to fill in (Portainer's `env`, Unraid's pools), when an
       option is only needed with authentication on, what is marked as needing attention.
    3. `Learn more about [<service>](<url>).`
    4. `## Fields`: every block `key` the widget can return, in backticks. A test runs the widget
       on its fixture and fails when a returned key is missing.
    5. `## Example`: a complete `services.yaml` entry with `type: <id>` (or a `widgets.yaml` entry
       `- <id>:` for a header widget), the key through
       `{{HD_VAR_...}}`, made-up hosts (`*.lan`).
    The options table comes from widget.yaml: give an option a line comment (`# e.g.
    http://radarr:7878`, `# Settings > Management Access > API Keys`) when its name does not
    explain it. A changed option, field or setup step updates the README in the same commit.

## Releasing

Bump the changed widgets' `version`, add a CHANGELOG section, set `package.json`'s version, tag
`vX.Y.Z`, push with tags. CI checks the tag against package.json and the CHANGELOG and publishes a
GitHub release with a zip per widget.

## Commands

```bash
npm ci && npm test
npm run mock
```
