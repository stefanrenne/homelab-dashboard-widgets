# ESPHome

ESPHome devices online, offline (marked), not online (offline and unknown together, marked) and
in total, as homepage's esphome widget; unknown through `fields`. ESPHome counts a device as
unknown when its config is invalid or its name does not resolve. Give `username` and `password`
when the ESPHome dashboard has a login.

Learn more about [ESPHome](https://esphome.io/).

## Fields

`online`, `offline`, `offline_alt`, `total`, `unknown`

## Example

```yaml
# services.yaml
- Home:
    - ESPHome:
        href: http://esphome.lan:6052
        icon: esphome
        widget:
          type: esphome
          url: http://esphome.lan:6052
```
