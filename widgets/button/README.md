# Button

A button on a card or in the header that opens a link, or runs a script or a shell command on the
dashboard's server, for jobs such as pulling new images, restarting a stack or starting a backup.
Set exactly one of `href`, `script` or `command`; with none or several, the card shows an error.

- `href` opens the page in a new tab.
- `script` runs a file with `bash`. A relative path is relative to the config folder (`/config` in
  the container), which is also the folder the run starts in.
- `command` runs a line with `bash -c`, such as `docker compose -f stacks/media.yaml pull`.

While it runs, the button is disabled; when it is done, the dashboard shows the output (stdout and
stderr together, the last 64 kB) and the exit code. A run that takes longer than `timeout` seconds
(default 300) is stopped, together with everything it started. Values filled in from
`{{HD_VAR_*}}` are scrubbed from the output.

The run gets only `PATH` and `HOME` from the dashboard's environment; set `inheritEnv: true` to
pass all of it (including every `HD_VAR_*`). It runs as the dashboard's user (`node`, uid 1000, in
the image), so tools such as `curl`, `jq` or `docker` must be in the image and the Docker socket
must allow that user. Anyone who can open the dashboard can press the button: put the dashboard
behind authentication before you add buttons that change things. `script` and `command` are kept
on the server; the browser only gets the label.

Several buttons on one card are several `button` widgets, each one full width.

## Fields

No blocks: the button is drawn by the widget.

## Example

```yaml
# services.yaml
- Media:
    - Jellyfin:
        href: https://jellyfin.lan
        widgets:
          - type: button
            text: Pull new images
            command: docker compose -f stacks/media.yaml pull
            timeout: 600
          - type: button
            text: Back up the library
            script: scripts/backup-jellyfin.sh
          - type: button
            text: Release notes
            href: https://github.com/jellyfin/jellyfin/releases
```
