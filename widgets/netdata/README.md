# Netdata

The warning and critical alarms that are raised in Netdata (both marked), as homepage's netdata
widget. Netdata's API needs no key.

Learn more about [Netdata](https://www.netdata.cloud/).

## Fields

`warnings`, `criticals`

## Example

```yaml
# services.yaml
- Monitoring:
    - Netdata:
        href: http://netdata.lan:19999
        icon: netdata
        widget:
          type: netdata
          url: http://netdata.lan:19999
```
