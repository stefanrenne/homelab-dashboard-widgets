# RomM

The platforms, games, saves and save states in a RomM library, and with `fields` its screenshots
and total size, as homepage's romm widget. Fill in a user when your RomM needs a login for its
statistics.

Learn more about [RomM](https://romm.app/).

## Fields

`platforms`, `totalRoms`, `saves`, `states`, `screenshots`, `totalfilesize`

## Example

```yaml
# services.yaml
- Games:
    - RomM:
        href: http://romm.lan:8080
        icon: romm
        widget:
          type: romm
          url: http://romm.lan:8080
```
