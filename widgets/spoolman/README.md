# Spoolman

What is left on your filament spools in Spoolman, as a share of each spool's weight, labelled
with the filament's name, as homepage's spoolman widget. Less than 10% left is marked. It shows
the first four spools, or the ones in `spoolIds` (the IDs shown in Spoolman). Spoolman's API
needs no key.

Learn more about [Spoolman](https://github.com/Donkie/Spoolman).

## Fields

One block per spool, `spool<id>` by its ID: `spool1`, `spool2`, `spool3`, `spool4`, ...

## Example

```yaml
# services.yaml
- 3D printing:
    - Spoolman:
        href: http://spoolman.lan:7912
        icon: spoolman
        widget:
          type: spoolman
          url: http://spoolman.lan:7912
          spoolIds: [1, 2]
```
