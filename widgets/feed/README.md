# Feed

The latest items of an RSS 2.0 or Atom feed, as homepage's feed widget: `layout: list` (the
default) shows a line per item with its age and a small thumbnail, `layout: grid` image tiles
that fill the card's width. `maxItems` sets how many (default 5). Items open in a new tab.

Images come from the item's `media:thumbnail` or `media:content`, an image enclosure, or else the
first image in its content; some feeds have none. Your browser loads them from the feed's host,
at the size the feed links; set `images: false` for feeds whose images are slow. The dashboard
fetches the feed itself, at most every 10 minutes.

Learn more about [RSS](https://www.rssboard.org/rss-specification).

## Fields

No blocks: the items are drawn by the widget.

## Example

```yaml
# services.yaml
- News:
    - Homelab news:
        widget:
          type: feed
          url: https://news.example.com/rss.xml
          maxItems: 8
          layout: grid
```
