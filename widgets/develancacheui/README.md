# DeveLanCacheUI

The data a LanCache served from its cache and the data it fetched from the internet, from
DeveLanCacheUI's backend, as homepage's develancacheui widget. `url` is the backend (the API),
not the web interface.

Learn more about [DeveLanCacheUI](https://github.com/devedse/DeveLanCacheUI_Backend).

## Fields

`cachehitbytes`, `cachemissbytes`

## Example

```yaml
# services.yaml
- Network:
    - LanCache:
        icon: lancache
        widget:
          type: develancacheui
          url: http://lancache-ui.lan:7301
```
