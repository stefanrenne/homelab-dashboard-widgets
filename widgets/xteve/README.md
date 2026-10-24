# xTeVe

The streams in xTeVe, the active ones and those mapped to the EPG, as homepage's xteve widget.
Turn on the API under **Settings > API**. Fill in `username` and `password` when xTeVe's
authentication is on.

Learn more about [xTeVe](https://github.com/xteve-project/xTeVe).

## Fields

`streams_all`, `streams_active`, `streams_xepg`

## Example

```yaml
# services.yaml
- Media:
    - xTeVe:
        href: http://xteve.lan:34400/web/
        icon: xteve
        widget:
          type: xteve
          url: http://xteve.lan:34400
```
