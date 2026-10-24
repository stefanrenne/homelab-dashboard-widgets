# Syncthing Relay Server

The active sessions, connections, data relayed and the average transfer rate over the past hour
of a Syncthing relay server (strelaysrv), as homepage's strelaysrv widget. Use the relay's status
port (22070 by default, `-status-srv`) in `url`.

Learn more about [Syncthing relays](https://docs.syncthing.net/users/strelaysrv.html).

## Fields

`numActiveSessions`, `numConnections`, `dataRelayed`, `transferRate`

## Example

```yaml
# services.yaml
- Files:
    - Syncthing relay:
        icon: syncthing
        widget:
          type: strelaysrv
          url: http://relay.lan:22070
```
