# HDHomeRun

The channels (and HD channels) in an HDHomeRun's lineup, the tuners in use, and for one tuner
(`tuner`, from 0) the channel it plays, the signal strength and quality (marked below 50%), the
client it streams to and the stream's rate, as homepage's hdhomerun widget. The tuner fields are
empty while that tuner is idle. The device needs no key.

Learn more about [HDHomeRun](https://www.silicondust.com/).

## Fields

`channels`, `hd`, `tunerCount`, `channelNumber`, `channelNetwork`, `signalStrength`,
`signalQuality`, `symbolQuality`, `clientIP`, `networkRate`

## Example

```yaml
# services.yaml
- Media:
    - HDHomeRun:
        href: http://hdhomerun.lan
        icon: hdhomerun
        widget:
          type: hdhomerun
          url: http://hdhomerun.lan
          tuner: 0
          fields: [channels, tunerCount, channelNetwork, signalStrength]
```
