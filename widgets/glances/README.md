# Glances

CPU, memory, CPU temperature, uptime and disks of a machine that runs
[Glances](https://nicolargo.github.io/glances/) in web server mode (`glances -w`, port 61208).
Set `version: 4` for Glances 4 or later. Give `username` and `password` only when Glances runs with
`--password`. `cputemp` takes the hottest CPU sensor (labels starting with `cpu_thermal`, `Core`,
`Tctl`, `Temperature` or `Package id`; add your own with `cpuSensorLabel`) and is marked from
85 °C. `disk` takes mount points as Glances lists them. CPU temperature, uptime and disks are off
by default because each takes an extra call, as in homepage.

Learn more about [Glances](https://glances.readthedocs.io/en/latest/api.html).

## Fields

`cpu`, `memory`, `memoryUsed`, `memoryTotal`, `cputemp`, `uptime`, `disk` (one mount point) or one per mount point named after it, `diskFree`

## Example

```yaml
# services.yaml
- Infrastructure:
    - Server:
        href: http://server.lan:61208
        icon: glances
        widget:
          type: glances
          url: http://server.lan:61208
          version: 4
          cputemp: true
          uptime: true
          disk: [/, /mnt/data]
          expanded: true
```
