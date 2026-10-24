# evcc

The power from the solar panels, from (or, negative, to) the grid, used by the house and used for
charging, in kW, as homepage's evcc widget. evcc's API needs no key.

Learn more about [evcc](https://evcc.io/).

## Fields

`pv_power`, `grid_power`, `home_power`, `charge_power`

## Example

```yaml
# services.yaml
- Home:
    - evcc:
        href: http://evcc.lan:7070
        icon: evcc
        widget:
          type: evcc
          url: http://evcc.lan:7070
```
