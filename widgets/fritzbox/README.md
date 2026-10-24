# FRITZ!Box

The internet connection of a FRITZ!Box: its state (marked when it is not connected), uptime,
line speed, the current download and upload rates, the traffic received and sent, and the
external IPv4 and IPv6 addresses and the IPv6 prefix, as homepage's fritzbox widget. It needs no
credentials, but the box must allow it: turn on **Home Network > Network > Network Settings >
Access Settings in the Home Network > Allow access for applications** and **Transmit status
information over UPnP**.

The widget talks to port 49000 (49443 for an `https` url) unless the url names a port; `http` is
noticeably faster. With `https`, `insecure: true` accepts the box's self-signed certificate.

Learn more about [FRITZ!Box](https://en.fritz.com/).

## Fields

`connectionStatus`, `uptime`, `maxDown`, `maxUp`, `down`, `up`, `received`, `sent`,
`externalIPAddress`, `externalIPv6Address`, `externalIPv6Prefix`

## Example

```yaml
# services.yaml
- Network:
    - FRITZ!Box:
        href: http://fritz.box
        icon: avm-fritzbox
        widget:
          type: fritzbox
          url: http://fritz.box
          fields: [connectionStatus, uptime, down, up]
```
