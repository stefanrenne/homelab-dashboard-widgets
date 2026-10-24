# Channels DVR Server

The shows, recordings, scheduled recordings and passes of a Channels DVR Server, as homepage's
channelsdvrserver widget. The server's API needs no key.

Learn more about [Channels DVR](https://getchannels.com/dvr-server/).

## Fields

`shows`, `recordings`, `scheduled`, `passes`

## Example

```yaml
# services.yaml
- Media:
    - Channels DVR:
        href: http://channels.lan:8089
        icon: channels-dvr
        widget:
          type: channelsdvrserver
          url: http://channels.lan:8089
```
