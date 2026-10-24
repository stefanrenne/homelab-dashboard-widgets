# Suwayomi

The manga chapters in Suwayomi's library that are downloaded, not downloaded, read and unread,
and with `fields` the combinations (downloaded and read, downloaded and unread, ...), as
homepage's suwayomi widget. `category` limits it to one category: its ID is in the address when
you open it (`?tab=<id>`). Fill in `username` and `password` when Suwayomi has basic
authentication on.

Learn more about [Suwayomi](https://github.com/Suwayomi/Suwayomi-Server).

## Fields

`download`, `nondownload`, `read`, `unread`, `downloadedread`, `downloadedunread`,
`nondownloadedread`, `nondownloadedunread`

## Example

```yaml
# services.yaml
- Reading:
    - Suwayomi:
        href: http://suwayomi.lan:4567
        icon: suwayomi
        widget:
          type: suwayomi
          url: http://suwayomi.lan:4567
          fields: [unread, downloadedunread, download, read]
```
