# Changelog

Changes to the widget collection. Each widget also has its own `version` in its widget.yaml.

## [Unreleased]

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
