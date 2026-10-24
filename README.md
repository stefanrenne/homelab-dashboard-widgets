# homelab-dashboard widgets

Widgets for [homelab-dashboard](https://github.com/stefanrenne/homelab-dashboard) for the usual homelab services, with the
same fields as the matching [homepage](https://gethomepage.dev) widgets. They live outside the
dashboard on purpose: this repository is an ordinary widget collection, installed like any third-party one.

Every widget has its own page with setup, fields and options on the
[documentation site](https://stefanrenne.github.io/homelab-dashboard/widgets/collection/)
(and as `widgets/<id>/README.md` here).

| Widget | Shows | Options |
|---|---|---|
| `radarr` | wanted, missing, queued, movies; the queue with `enableQueue: true` | `url`, `key`, `queueLimit` (5) |
| `sonarr` | wanted, queued, series; the queue with `enableQueue: true` | `url`, `key`, `queueLimit` (5) |
| `bazarr` | missing episodes, missing movies | `url`, `key` |
| `prowlarr` | grabs, queries, failed grabs, failed queries | `url`, `key` |
| `sabnzbd` | rate, queue, time left | `url`, `key` |
| `seerr` | pending, approved, completed (Overseerr, Jellyseerr, Seerr) | `url`, `key` |
| `stash` | scenes, performers, tags (also images, galleries, studios via `fields`) | `url`, `key` |
| `tautulli` | current streams with progress | `url`, `key`, `enableUser`, `showEpisodeNumber` |
| `tdarr` | queue, processed, errored, saved | `url`, `key` (optional) |
| `whatsupdocker` | monitoring, updates | `url`, `username`, `password` |
| `portainer` | running, stopped, total | `url`, `key`, `env` |
| `longhorn` | storage used, in total and per node | `url`, `username`, `password` (or `provider: longhorn`), `include`, `expanded` |
| `glances` | cpu, memory, CPU temperature, uptime, disks | `url`, `username`, `password`, `version`, `cputemp`, `uptime`, `disk`, `expanded` |
| `unraid` | memory %, cpu, array %, pool1 %; more via `fields` (homepage field names) | `url`, `key`, `pool1`–`pool4` |

Pick blocks with the dashboard's `fields`, e.g. `fields: [cpu, memoryPercent, pool1UsedPercent]`.

What the widgets have in common:
- **Queues lead with problems.** Blocked or failed imports come first, marked, followed by the
  rest up to `queueLimit` and "+N more". Rows name the movie or episode, not the release.
- **Counts that need you are marked**: failed grabs, errored files, pending requests, updates,
  unread Unraid alerts, a stopped array, a paused SABnzbd.
- **One unit system and one time format**: decimal (kB, MB, GB, TB) and `m:ss` / `h:mm:ss`.
- **Labels fit a phone**: short whole words in every language, at most two lines.

## Install

The dashboard always installs this collection at its newest release; there is
nothing to add. List it in `settings.yaml` only to pin a release or take some of the widgets;
that entry replaces the default:

```yaml
# settings.yaml of the dashboard
plugins:
  - source: git+https://github.com/stefanrenne/homelab-dashboard-widgets#latest   # or a tag: #v0.2.0
    only: [radarr, sonarr]        # optional: just these
  # while developing (wins over the installed collection):
  - path: ~/git/homelab-dashboard-widgets
```

```yaml
# services.yaml
- Media:
    - Radarr:
        href: https://radarr.lan
        icon: radarr
        widget:
          type: radarr
          url: http://radarr:7878
          key: "{{HOMEPAGE_VAR_RADARR_KEY}}"
          enableQueue: true
```

Containers with homepage labels (`homepage.widget.type: radarr`, ...) work as they are.

## Development

Every release on GitHub also has a zip per widget (`radarr-0.2.0.zip`) and one of the whole
collection, for installing without git.

```bash
npm ci && npm test        # every widget against fixtures/, through a mock server
npm run mock              # the mock on http://127.0.0.1:4100/<widget>/... for trying things by hand
```

The fixtures in `fixtures/` are API answers in the shape the real services give. All widgets
except tdarr and whatsupdocker were checked against live services (Radarr, Sonarr, Bazarr,
Prowlarr, SABnzbd, Seerr, Tautulli, Portainer CE, Unraid 7, Stash) on 2026-10-24.

## License

[MIT](LICENSE)
