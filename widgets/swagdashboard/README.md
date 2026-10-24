# SWAG Dashboard

The hosts SWAG proxies, those behind authentication, the configs that are outdated (marked) and
the IPs fail2ban has banned, from SWAG's dashboard mod, as homepage's swagdashboard widget. Use
the dashboard's port (81 by default) in `url`.

Learn more about [SWAG Dashboard](https://github.com/linuxserver/docker-mods/tree/swag-dashboard).

## Fields

`proxied`, `auth`, `outdated`, `banned`

## Example

```yaml
# services.yaml
- Network:
    - SWAG:
        href: http://swag.lan:81
        icon: linuxserver-io
        widget:
          type: swagdashboard
          url: http://swag.lan:81
```
