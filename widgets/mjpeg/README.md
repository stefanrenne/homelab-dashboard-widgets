# MJPEG

A camera's MJPEG stream on the card, over a blurred copy of itself, as homepage's mjpeg widget:
from [µStreamer](https://github.com/pikvm/ustreamer),
[camera-streamer](https://github.com/ayufan/camera-streamer), OctoPrint's or Klipper's webcam.
Your browser loads the stream directly, so `stream` must be reachable from the browser. `fit`
sets how the picture fills the card (default `contain`), `height` its height (default `10rem`).

Learn more about [MJPEG](https://en.wikipedia.org/wiki/Motion_JPEG).

## Fields

No blocks: the stream is drawn by the widget.

## Example

```yaml
# services.yaml
- 3D printing:
    - Printer camera:
        widget:
          type: mjpeg
          stream: http://printer.lan/webcam/?action=stream
          fit: cover
```
