# Prometheus

The active scrape targets that are up, down (marked) and in total in Prometheus, as homepage's
prometheus widget. Prometheus's API needs no key; fill in `username` and `password` when it sits
behind basic authentication. For the value of a PromQL query use `prometheusmetric`.

Learn more about [Prometheus](https://prometheus.io/).

## Fields

`targets_up`, `targets_down`, `targets_total`

## Example

```yaml
# services.yaml
- Monitoring:
    - Prometheus:
        href: http://prometheus.lan:9090
        icon: prometheus
        widget:
          type: prometheus
          url: http://prometheus.lan:9090
```
