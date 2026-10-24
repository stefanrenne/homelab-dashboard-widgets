# Gatus

The endpoints whose latest check succeeded and failed (marked), and the uptime over the recent
results Gatus keeps, as homepage's gatus widget. Gatus's API needs no key.

Learn more about [Gatus](https://gatus.io/).

## Fields

`up`, `down`, `uptime`

## Example

```yaml
# services.yaml
- Monitoring:
    - Gatus:
        href: http://gatus.lan:8080
        icon: gatus
        widget:
          type: gatus
          url: http://gatus.lan:8080
```
