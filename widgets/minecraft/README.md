# Minecraft

Whether a Minecraft (Java Edition) server is up (marked when it does not answer), the players
online of the maximum, and its version, as homepage's minecraft widget. The widget asks the
server as the game's server list does. Without a port in `url` it looks up the server's
`_minecraft._tcp` SRV record, else it uses port 25565. homepage's `udp://host:port` form works
too (the status is asked over TCP all the same).

Learn more about [Minecraft servers](https://www.minecraft.net/en-us/download/server).

## Fields

`status`, `players`, `version`

## Example

```yaml
# services.yaml
- Games:
    - Minecraft:
        icon: minecraft
        widget:
          type: minecraft
          url: minecraft.lan:25565
```
