# Frigate

The number of cameras, Frigate's uptime and version, as homepage's frigate widget. With
`enableRecentEvents: true` the five latest events follow, one per row: camera, what was seen
with its score, and how long ago.

Port 5000 answers without a login (inside your network or Docker network). On the authenticated
port 8971 give `username` and `password` of a Frigate user, and `insecure: true` for Frigate's
own certificate.

Learn more about [Frigate](https://frigate.video/).

## Fields

`cameras`, `uptime`, `version`

## Example

```yaml
# services.yaml
- Security:
    - Frigate:
        href: https://frigate.lan:8971
        icon: frigate
        widget:
          type: frigate
          url: http://frigate.lan:5000
          enableRecentEvents: true
```
