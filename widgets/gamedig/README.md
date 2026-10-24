# GameDig

Whether a game server is online (marked when it does not answer), its name and map, the players
(of the maximum), the bots and the ping, as homepage's gamedig widget. homepage uses the GameDig
library for this; this widget speaks the protocol most of its games use itself: **Valve's server
query** (A2S), which Counter-Strike, Team Fortress 2, Garry's Mod, Rust, ARK, Valheim, DayZ,
Satisfactory and many other Steam games answer. `serverType` is accepted for homepage's config
but not needed. Use the server's query port in `url` (often the game port; Valheim and ARK use
the game port + 1). For Minecraft use the `minecraft` widget.

Learn more about [Valve's server query](https://developer.valvesoftware.com/wiki/Server_queries).

## Fields

`status`, `name`, `map`, `currentPlayers`, `players`, `maxPlayers`, `bots`, `ping`

## Example

```yaml
# services.yaml
- Games:
    - Counter-Strike:
        icon: counter-strike-2
        widget:
          type: gamedig
          serverType: csgo
          url: udp://games.lan:27015
```
