# Tdarr

Files in the transcode queue, processed and errored files, and the space saved. Tdarr needs a `key` only when its authentication is on (an API key from Tdarr's settings).

Learn more about [Tdarr](https://home.tdarr.io).

## Fields

`queue`, `processed`, `errored`, `saved`

## Example

```yaml
# services.yaml
- Media:
    - Tdarr:
        href: https://tdarr.lan
        icon: tdarr
        widget:
          type: tdarr
          url: http://tdarr:8265
```
