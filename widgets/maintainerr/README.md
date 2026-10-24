# Maintainerr

What Maintainerr has cleaned up (items, episodes and movies, and with `fields` shows and
seasons) and the space its active collections can reclaim, as homepage's maintainerr widget.
`fields` also offers the space per movies and shows and the total capacity. Maintainerr's API
needs no key.

Learn more about [Maintainerr](https://maintainerr.info/).

## Fields

`itemsHandled`, `episodesHandled`, `moviesHandled`, `showsHandled`, `seasonsHandled`,
`reclaimable`, `movieReclaimable`, `showReclaimable`, `totalCapacity`

## Example

```yaml
# services.yaml
- Media:
    - Maintainerr:
        href: http://maintainerr.lan:6246
        icon: maintainerr
        widget:
          type: maintainerr
          url: http://maintainerr.lan:6246
```
