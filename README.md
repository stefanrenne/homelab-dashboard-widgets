# homelab-dashboard widgets

Widgets for [homelab-dashboard](../homelab-dashboard) for the usual homelab services, with the
same fields as the matching [homepage](https://gethomepage.dev) widgets. They live outside the
dashboard on purpose: this repository is an ordinary widget collection, installed like any third-party one.

| Widget | Shows | Options |
|---|---|---|
| `radarr` | wanted, missing, queued, movies; the queue with `enableQueue: true` | `url`, `key` |
| `sonarr` | wanted, queued, series; the queue with `enableQueue: true` | `url`, `key` |
| `bazarr` | missing episodes, missing movies | `url`, `key` |
| `prowlarr` | grabs, queries, failed grabs, failed queries | `url`, `key` |
| `sabnzbd` | rate, queue, time left | `url`, `key` |
| `seerr` | pending, approved, completed (Overseerr, Jellyseerr, Seerr) | `url`, `key` |
| `stash` | scenes, images, galleries, performers, studios, tags | `url`, `key` |
| `tautulli` | current streams with progress | `url`, `key`, `enableUser`, `showEpisodeNumber` |
| `tdarr` | queue, processed, errored, saved | `url`, `key` (optional) |
| `whatsupdocker` | monitoring, updates | `url`, `username`, `password` |
| `portainer` | running, stopped, total | `url`, `key`, `env` |
| `unraid` | cpu, memory, array and pools (homepage field names) | `url`, `key`, `pool1`–`pool4` |

Pick blocks with the dashboard's `fields`, e.g. `fields: [cpu, memoryPercent, pool1UsedPercent]`.

## Install

```yaml
# settings.yaml of the dashboard
plugins:
  - source: git+https://github.com/<you>/homelab-dashboard-widgets#v0.1.0
    only: [radarr, sonarr]        # optional: just these
  # while developing:
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

```bash
npm ci && npm test        # every widget against fixtures/, through a mock server
npm run mock              # the mock on http://127.0.0.1:4100/<widget>/... for trying things by hand
```

The fixtures in `fixtures/` are API answers in the shape the real services give. The Unraid
API schema is the documented one for Unraid 7; check it against a real server.
