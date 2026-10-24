# Unmanic

The workers that are busy, all workers and the tasks pending in Unmanic, as homepage's unmanic
widget. Unmanic's API needs no key.

Learn more about [Unmanic](https://docs.unmanic.app/).

## Fields

`active_workers`, `total_workers`, `records_total`

## Example

```yaml
# services.yaml
- Media:
    - Unmanic:
        href: http://unmanic.lan:8888
        icon: unmanic
        widget:
          type: unmanic
          url: http://unmanic.lan:8888
```
