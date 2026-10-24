# Mastodon

The users, posts and known domains of a Mastodon instance, as homepage's mastodon widget. The
numbers are public: no key is needed.

Learn more about [Mastodon](https://joinmastodon.org/).

## Fields

`user_count`, `status_count`, `domain_count`

## Example

```yaml
# services.yaml
- Social:
    - Mastodon:
        href: https://mastodon.example.com
        icon: mastodon
        widget:
          type: mastodon
          url: https://mastodon.example.com
```
