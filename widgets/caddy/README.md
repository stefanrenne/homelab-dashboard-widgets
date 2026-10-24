# Caddy

The upstreams of Caddy's reverse proxies, the requests in flight to them and the failed requests
Caddy counts (marked), as homepage's caddy widget.

The widget reads Caddy's admin API, which listens on `localhost:2019` by default. To reach it
from the dashboard set `admin 0.0.0.0:2019` (or another address) in the global options of the
Caddyfile, and keep that port inside your network: the admin API can change Caddy's
configuration.

Learn more about [Caddy](https://caddyserver.com/).

## Fields

`upstreams`, `requests`, `requests_failed`

## Example

```yaml
# services.yaml
- Network:
    - Caddy:
        icon: caddy
        widget:
          type: caddy
          url: http://caddy.lan:2019
```
