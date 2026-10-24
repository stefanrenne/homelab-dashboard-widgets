# OpenDTU

Today's yield of the solar inverters on an OpenDTU, the power now (in W and as a share of the
inverters' limit) and that limit, as homepage's opendtu widget. Fill in `username` and
`password` when **Settings > Security > Allow readonly access to web interface without password**
is off.

Learn more about [OpenDTU](https://github.com/tbnobody/OpenDTU).

## Fields

`yieldDay`, `relativePower`, `absolutePower`, `limit`

## Example

```yaml
# services.yaml
- Energy:
    - OpenDTU:
        href: http://opendtu.lan
        icon: opendtu
        widget:
          type: opendtu
          url: http://opendtu.lan
```
