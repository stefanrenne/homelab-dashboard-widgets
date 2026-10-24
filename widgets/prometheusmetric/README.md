# Prometheus Metric

The results of up to four PromQL queries, each with your own label, as homepage's
prometheusmetric widget. Each entry of `metrics` has a `label`, a `query` (the first result of a
vector, or a scalar, is shown) and optionally a `key` (for `fields`) and a `format`:

- `type`: `text` (default), `number`, `percent`, `bytes`, `bits`, `byterate`, `bitrate`,
  `duration` (seconds as a span), `relativeDate` (milliseconds, as a span from now) or `date`
  (milliseconds). homepage's binary types (`bbytes`, `bibyterate`, ...) show decimal units, as
  everywhere in this collection.
- `scale`: a number, or a fraction such as `1/16`, to multiply by.
- `prefix` and `suffix`: text before and after the value.
- `options.maximumFractionDigits` for `number` and `percent`.

The widget refreshes every 10 seconds; set `refreshInterval` (milliseconds) on the entry for
another rate. Fill in `username` and `password` when Prometheus sits behind basic
authentication.

Learn more about [querying Prometheus](https://prometheus.io/docs/prometheus/latest/querying/basics/).

## Fields

The blocks are the metrics you configure: `fields` takes their `key` (or `label`).

## Example

```yaml
# services.yaml
- Monitoring:
    - Prometheus:
        href: http://prometheus.lan:9090
        icon: prometheus
        widget:
          type: prometheusmetric
          url: http://prometheus.lan:9090
          metrics:
            - label: Alerts
              query: count(ALERTS{alertstate="firing"}) or vector(0)
            - label: Disk free
              query: node_filesystem_avail_bytes{mountpoint="/"}
              format: { type: bytes }
            - label: Uptime
              query: time() - node_boot_time_seconds
              format: { type: duration }
```
