# Changelog

Changes to the widget collection. Each widget also has its own `version` in its widget.yaml.

## [Unreleased]

### Added
- `glances`: CPU, memory, CPU temperature, uptime and disks from Glances (API 3 or 4), as
  homepage's glances info widget.
- `longhorn`: storage used in total and per node from the Longhorn API, with `provider: longhorn`,
  as homepage's longhorn info widget.
- `unifi` (also `unifi_console`): uptime, WAN status and LAN/WLAN users and devices from a UniFi
  Network controller, with an API key or a local account (UniFi OS or classic), as in homepage.
- `openmeteo`, `openweathermap` and `stocks` (Finnhub), moved here from the dashboard's built-in
  widgets: they talk to an outside service. Same options, plus `url` (another API server, e.g.
  your own Open-Meteo). A stock's block label is its symbol through `vars`. The dashboard keeps
  its built-in copies until its next release, and those win over these meanwhile.
- `pihole`: queries, blocked (also as a share) and the blocklist size, Pi-hole 5 and 6 (with a session from the password), as homepage's pihole widget.
- `adguard`: queries, blocked, filtered and processing time of AdGuard Home, as homepage's adguard widget.
- `plex`: active streams and the movie, TV and album counts of a Plex Media Server, as homepage's plex widget.
- Twelve more languages for every widget, the dashboard's set: Catalan, Hebrew, Croatian,
  Hungarian, Italian, Norwegian Bokmål, Portuguese, Russian, Swedish, Vietnamese and Chinese
  (simplified and traditional), within the label length rules.
- The first widgets with a `client.js` (their own look in the browser); tests render them in jsdom.

## [0.2.1] - 2026-10-24

### Added
- A `README.md` per widget with the setup in the service, every field and an example. It is the
  widget's page on the [documentation site](https://stefanrenne.github.io/homelab-dashboard/widgets/collection/).

### Changed
- The dashboard installs this collection by default (`#latest`); list it in `settings.yaml` only
  to pin a release or use `only:`. No widget code changed, so the widget versions stay the same.

## [0.2.0] - 2026-10-24

### Added
- Twelve widgets with homepage's field names: radarr, sonarr, bazarr, prowlarr, sabnzbd, seerr,
  stash, tautulli, tdarr, whatsupdocker, portainer and unraid.
- Queues that lead with problems and stop at `queueLimit` with "+N more"; counts that need
  attention marked; labels that fit a phone in five languages; decimal units and one time format.
- Validated against live services (all but tdarr and whatsupdocker).
