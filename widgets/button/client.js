// A full-width button: a link styled as a button (href), or a button that asks the dashboard to
// run the widget's action. The dashboard sets `busy` while the run lasts and shows the result.

class HdButton extends HTMLElement {
  get busy() {
    return this._busy === true;
  }
  set busy(value) {
    this._busy = value === true;
    this.render();
  }
  connectedCallback() {
    // `busy` set before this class was defined is an own property that hides the setter
    if (Object.hasOwn(this, 'busy')) {
      const value = this.busy;
      delete this.busy;
      this._busy = value === true;
    }
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' }).innerHTML = `<style>
        :host { display: block; }
        a, button {
          box-sizing: border-box; display: flex; align-items: center; justify-content: center;
          inline-size: 100%; min-block-size: 2.25rem; padding-block: .5rem; padding-inline: 1rem;
          border: 1px solid color-mix(in srgb, var(--hd-text) 25%, transparent); border-radius: 6px;
          background: color-mix(in srgb, var(--hd-text) 8%, transparent); color: var(--hd-text);
          font: inherit; font-size: .9375rem; font-weight: 500; line-height: 1.25; text-align: center;
          text-decoration: none; cursor: pointer; transition: background-color .15s ease;
        }
        a:hover, button:hover:not(:disabled) { background: color-mix(in srgb, var(--hd-text) 14%, transparent); }
        a:focus-visible, button:focus-visible { outline: 2px solid var(--hd-text); outline-offset: 2px; }
        button:disabled { cursor: progress; opacity: .7; }
        @media (prefers-reduced-motion: reduce) { a, button { transition: none; } }
        @media (prefers-contrast: more) { a, button { border-color: var(--hd-text); } }
      </style>`;
    }
    this.render();
  }
  render() {
    const root = this.shadowRoot;
    if (!root) return;
    const o = this.options ?? {};
    let href = null;
    if (o.href) {
      try {
        const url = new URL(o.href, document.baseURI);
        if (url.protocol === 'http:' || url.protocol === 'https:') href = url.href;
      } catch {
        // not a link: nothing to open
      }
    }
    const tag = href ? 'a' : 'button';
    let el = root.querySelector('a, button');
    if (el?.localName !== tag) {
      el?.remove();
      el = document.createElement(tag);
      if (tag === 'button') {
        el.type = 'button';
        el.addEventListener('click', () => {
          if (this.busy) return;
          // the label is the result dialog's title
          this.dispatchEvent(new CustomEvent('hd-widget-action', { bubbles: true, composed: true, detail: { title: this.options?.text ?? '' } }));
        });
      } else {
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
      }
      root.append(el);
    }
    el.textContent = o.text ?? '';
    if (href) {
      el.href = href;
    } else {
      el.disabled = this.busy;
      if (this.busy) el.setAttribute('aria-busy', 'true');
      else el.removeAttribute('aria-busy');
    }
  }
}
customElements.define('hd-button', HdButton);
