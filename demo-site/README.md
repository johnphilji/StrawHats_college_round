# Acme Store Demo Site

This is the baseline "v1" static e-commerce demo site for the PATCHWORK visual editor.

## How to run locally

Navigate into this directory (`demo-site`) and run a local server:

```bash
npx serve .
# or
python -m http.server 4000
```

## ID Convention

Every component editable by PATCHWORK requires:
1. A unique `data-patchwork-id` (kebab-case).
2. A unique CSS class (e.g., `.btn-checkout`).
3. An entry in `patchwork.map.json`.

## Baseline State

The `checkout-button` component (ID: `checkout-button`) starts with:
- `background-color`: `#2563eb`
- `color`: `#ffffff`
- `border-radius`: `8px`
- `padding`: `12px 20px`
- `font-weight`: `600`
- Text: "Checkout"

## Adding a New Editable Component

1. Add the component to `index.html` or `checkout.html` with a new `data-patchwork-id` and unique class.
2. Add its styling block directly to `styles.css`.
3. Add the mapping definition to `patchwork.map.json`.
4. Run `node check-map.mjs` to ensure the integration is valid and there are no mapping errors.
