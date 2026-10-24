# Traefik

The HTTP routers, services and middlewares Traefik has, each marked when Traefik reports errors
or warnings for them, as homepage's traefik widget. `url` is where Traefik's API answers
(`api.insecure: true` serves it on port 8080, or a router to `api@internal`). Give `username`
and `password` when that router has basic authentication.

Learn more about [Traefik](https://doc.traefik.io/traefik/).

## Fields

`routers`, `services`, `middleware`

## Example

```yaml
# services.yaml
- Network:
    - Traefik:
        href: https://traefik.lan/dashboard/
        icon: traefik
        widget:
          type: traefik
          url: http://traefik.lan:8080
```
