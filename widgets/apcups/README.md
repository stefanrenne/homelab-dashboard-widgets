# APC UPS

Status (on battery and a lost connection marked), load, battery charge and runtime left of an
APC UPS, read from [apcupsd](http://www.apcupsd.org/)'s network information server, as homepage's
apcups widget.

apcupsd listens on 127.0.0.1 by default: set `NISIP` in `/etc/apcupsd.conf` to an address the
dashboard can reach (and keep `NETSERVER on`), then restart apcupsd. `url` is that address and
port, `tcp://host:3551`.

Learn more about [apcupsd](http://www.apcupsd.org/).

## Fields

`status`, `load`, `bcharge`, `timeleft`

## Example

```yaml
# services.yaml
- Infrastructure:
    - UPS:
        icon: apc
        widget:
          type: apcups
          url: tcp://nas.lan:3551
```
