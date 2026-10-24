# Uptime Kuma

The monitors of one status page that are up and down (marked), their average uptime over the
last 24 hours, and how long ago the page's incident was posted (marked), as homepage's
uptimekuma widget.

Uptime Kuma has no full API, so the widget reads a status page: make one under **Status Pages >
New Status Page** with the monitors you want, and give its slug, the part after `/status/` in its
address (`http://uptime-kuma.lan:3001/status/home` has slug `home`).

Learn more about [Uptime Kuma](https://github.com/louislam/uptime-kuma).

## Fields

`up`, `down`, `uptime`, `incident`

## Example

```yaml
# services.yaml
- Monitoring:
    - Uptime Kuma:
        href: http://uptime-kuma.lan:3001/status/home
        icon: uptime-kuma
        widget:
          type: uptimekuma
          url: http://uptime-kuma.lan:3001
          slug: home
```
