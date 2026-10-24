# homelab-dashboard widgets

Widgets for [homelab-dashboard](https://github.com/stefanrenne/homelab-dashboard) for the usual homelab services, with the
same fields as the matching [homepage](https://gethomepage.dev) widgets. They live outside the
dashboard on purpose: this repository is an ordinary widget collection, installed like any third-party one.

Every widget has its own page with setup, fields and options on the
[documentation site](https://stefanrenne.github.io/homelab-dashboard/widgets/collection/)
(and as `widgets/<id>/README.md` here).

| Widget | Shows | Options |
|---|---|---|
| `adguard` | queries, blocked, filtered, processing time | `url`, `username`, `password` |
| `plex` | streams, albums, movies, TV shows | `url`, `key` |
| `jellyfin` | a row per stream; movies, series, episodes, songs, albums with `enableBlocks` | `url`, `key`, `enableNowPlaying`, `enableBlocks`, `enableUser`, `showEpisodeNumber` |
| `emby` | a row per stream; movies, series, episodes, songs with `enableBlocks` | `url`, `key`, `enableNowPlaying`, `enableBlocks`, `enableUser`, `showEpisodeNumber` |
| `homeassistant` | people home, lights on, switches on; or up to four states and templates (`custom`) | `url`, `key`, `custom` |
| `proxmox` | VMs and containers running, CPU and memory of the cluster or a node | `url`, `username` (token id), `password` (secret), `node`, `insecure` |
| `proxmoxbackupserver` | datastore usage, failed tasks (24 hours), CPU, memory | `url`, `username` (token id), `password` (secret), `datastore`, `insecure` |
| `qbittorrent` | leech, download rate, seed, upload rate; downloads per row with `enableLeechProgress` | `url`, `username`, `password` or `key`, `enableLeechProgress`, `enableLeechSize`, `queueLimit` (5) |
| `transmission` | leech, download rate, seed, upload rate | `url`, `username`, `password`, `rpcUrl` |
| `deluge` | leech, download rate, seed, upload rate; downloads per row with `enableLeechProgress` | `url`, `password`, `enableLeechProgress`, `queueLimit` (5) |
| `nzbget` | rate, remaining, downloaded | `url`, `username`, `password` |
| `pihole` | queries, blocked (also as a share), blocklist size | `url`, `version` (5 or 6), `key` |
| `radarr` | wanted, missing, queued, movies; the queue with `enableQueue: true` | `url`, `key`, `queueLimit` (5) |
| `sonarr` | wanted, queued, series; the queue with `enableQueue: true` | `url`, `key`, `queueLimit` (5) |
| `lidarr` | wanted, queued, artists | `url`, `key` |
| `readarr` | wanted, queued, books | `url`, `key` |
| `jackett` | configured, errored indexers | `url`, `key`, `password` |
| `ombi` | pending, approved, available | `url`, `key` |
| `bazarr` | missing episodes, missing movies | `url`, `key` |
| `prowlarr` | grabs, queries, failed grabs, failed queries | `url`, `key` |
| `sabnzbd` | rate, queue, time left | `url`, `key` |
| `seerr` | pending, approved, completed (Overseerr, Jellyseerr, Seerr) | `url`, `key` |
| `stash` | scenes, performers, tags (also images, galleries, studios via `fields`) | `url`, `key` |
| `tautulli` | current streams with progress | `url`, `key`, `enableUser`, `showEpisodeNumber` |
| `tdarr` | queue, processed, errored, saved | `url`, `key` (optional) |
| `whatsupdocker` | monitoring, updates | `url`, `username`, `password` |
| `portainer` | running, stopped, total | `url`, `key`, `env` |
| `unifi` | uptime, WAN, LAN and WLAN users and devices (also as `unifi_console`) | `url`, `key` or `username`/`password`, `site`, `insecure` |
| `longhorn` | storage used, in total and per node | `url`, `username`, `password` (or `provider: longhorn`), `include`, `expanded` |
| `glances` | cpu, memory, CPU temperature, uptime, disks | `url`, `username`, `password`, `version`, `cputemp`, `uptime`, `disk`, `expanded` |
| `openmeteo` | the current weather, no account needed (a header widget) | `latitude`, `longitude` (else the viewer's location), `label`, `units`, `timezone`, `cache` |
| `openweathermap` | the current weather (a header widget) | `apiKey` (or `provider: openweathermap`), `latitude`, `longitude`, `label`, `units`, `cache` |
| `stocks` | price and day change of up to eight symbols, from Finnhub (a header widget) | `watchlist`, `apiKey` (or `provider: finnhub`), `color`, `cache` |
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
