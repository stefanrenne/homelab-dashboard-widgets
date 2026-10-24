# PeaNUT

A UPS's battery charge (below 20% marked), load (above 80% marked) and state (on battery marked,
low battery as an error) from [Network UPS Tools](https://networkupstools.org/) through PeaNUT,
as homepage's peanut widget. `key` is the UPS's name in NUT (default `ups`); for more UPSes add a
service each. Fill in `username` and `password` when PeaNUT has authentication on. For apcupsd
use the `apcups` widget.

Learn more about [PeaNUT](https://github.com/Brandawg93/PeaNUT).

## Fields

`battery_charge`, `ups_load`, `ups_status`

## Example

```yaml
# services.yaml
- Power:
    - UPS:
        href: http://peanut.lan:8080
        icon: peanut
        widget:
          type: peanut
          url: http://peanut.lan:8080
          key: ups
```
