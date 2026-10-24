# Moonraker

A Klipper 3D printer through Moonraker: the printer's state (marked when it is shut down or in
error), and while printing the current of all layers, the progress and the print's state (paused
and error marked), as homepage's moonraker widget. When Moonraker's authorization is on and the
dashboard's address is not under `trusted_clients`, create an API key (`/access/api_key`, or in
Mainsail or Fluidd) and use it as `key`.

Learn more about [Moonraker](https://moonraker.readthedocs.io/).

## Fields

`printer_state`, `layers`, `print_progress`, `print_status`

## Example

```yaml
# services.yaml
- 3D printing:
    - Voron:
        href: http://printer.lan
        icon: klipper
        widget:
          type: moonraker
          url: http://printer.lan:7125
          fields: [layers, print_progress, print_status]
```
