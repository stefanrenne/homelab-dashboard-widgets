# Scrutiny

The disks whose S.M.A.R.T. checks passed, failed (marked) and are unknown, as homepage's scrutiny
widget. What counts as failed follows Scrutiny's **Settings > Device Status - Thresholds**:
S.M.A.R.T., Scrutiny or both. Archived disks are left out. Scrutiny's API needs no key.

Learn more about [Scrutiny](https://github.com/AnalogJ/scrutiny).

## Fields

`passed`, `failed`, `unknown`

## Example

```yaml
# services.yaml
- Storage:
    - Scrutiny:
        href: http://scrutiny.lan:8080
        icon: scrutiny
        widget:
          type: scrutiny
          url: http://scrutiny.lan:8080
```
