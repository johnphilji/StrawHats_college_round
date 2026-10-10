const fs = require('fs');
const path = require('path');

const targetSiteDir = path.join(__dirname, 'apps/target-site');

const packageJson = {
  "name": "@patchwork/target-site",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.21.0"
  }
};

const serverJs = `
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Server memory state for simulated redeploys
let currentVersion = 1;

// Base layout helper
const renderLayout = (title, content) => \`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>\${title}</title>
    <!-- PATCHWORK Integration -->
    <script src="http://localhost:4001/pw.js" data-site="acme" defer></script>
    <style>
        body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 0; background: #f8fafc; color: #0f172a; }
        header { background: #fff; padding: 1rem 2rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 1.5rem; font-weight: bold; tracking: -1px; }
        .promo-v1 { background: #indigo; color: white; text-align: center; padding: 0.5rem; font-size: 0.875rem; background-color: #4f46e5; }
        .holiday-promo-v2 { background: #e11d48; color: white; text-align: center; padding: 0.5rem; font-size: 0.875rem; }
        main { display: flex; max-w: 1200px; margin: 0 auto; padding: 2rem; gap: 2rem; }
        .products { flex: 1; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        .card { background: #fff; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 8px; }
        .card button { margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer; }
        .cart-panel { width: 300px; background: #fff; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 8px; height: fit-content; }
        
        /* v1 styles */
        .btn { padding: 0.75rem 1.5rem; border-radius: 4px; border: none; cursor: pointer; font-weight: 500; }
        .btn-primary { background: #0ea5e9; color: white; }
        .cart-actions { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; }

        /* v2 styles (redeployed version) */
        .mini-cart { position: sticky; top: 2rem; width: 300px; background: #fff; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 8px; }
        .cart-wrapper { margin-top: 2rem; padding-top: 1rem; border-top: 1px dashed #cbd5e1; }
        .cta { display: block; text-align: center; padding: 1rem; border-radius: 999px; text-decoration: none; font-weight: bold; cursor: pointer; }
        .cta--pay { background: #16a34a; color: white; }
    </style>
</head>
<body>
    \${content}
</body>
</html>
\`;

app.get('/', (req, res) => {
    let content = '';

    const headerHtml = \`
        <header>
            <div class="logo">ACME STORE</div>
            <nav>Shop | Categories | About</nav>
        </header>
    \`;

    const productsHtml = \`
        <div class="products">
            <div class="card"><h3>Wireless Earbuds</h3><p>$99.00</p><button>Add to cart</button></div>
            <div class="card"><h3>Smart Watch</h3><p>$199.00</p><button>Add to cart</button></div>
            <div class="card"><h3>Laptop Stand</h3><p>$49.00</p><button>Add to cart</button></div>
            <div class="card"><h3>Mechanical Keyboard</h3><p>$149.00</p><button>Add to cart</button></div>
        </div>
    \`;

    if (currentVersion === 1) {
        content = \`
            <div class="promo-v1">Free shipping on orders over $50!</div>
            \${headerHtml}
            <main>
                \${productsHtml}
                <aside class="cart-panel">
                    <h2>Your Cart</h2>
                    <p>1x Wireless Earbuds - $99.00</p>
                    <div class="cart-actions">
                        <p>Total: $99.00</p>
                        <button id="checkout-btn" class="btn btn-primary cart-actions__checkout" onclick="window.location.href='/checkout'">Checkout</button>
                    </div>
                </aside>
            </main>
        \`;
    } else {
        // Version 2 (Redeploy) - Selectors broken!
        content = \`
            <div class="holiday-promo-v2">Holiday Sale: Free shipping!</div>
            \${headerHtml}
            <main>
                \${productsHtml}
                <aside class="mini-cart">
                    <h2>Cart</h2>
                    <p>1 item | $99.00</p>
                    <div class="cart-wrapper">
                        <p>Total: $99.00</p>
                        <a class="cta cta--pay" data-action="pay" href="/checkout">Proceed to Checkout</a>
                    </div>
                </aside>
            </main>
        \`;
    }

    res.send(renderLayout('Acme Store', content));
});

app.get('/checkout', (req, res) => {
    const content = \`
        <header>
            <div class="logo">ACME STORE - CHECKOUT</div>
        </header>
        <main style="justify-content: center; margin-top: 4rem;">
            <div style="text-align: center; background: white; padding: 4rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h1 style="color: #10b981;">Success!</h1>
                <div id="order-summary" style="font-size: 1.25rem; margin-top: 1rem;">Order confirmed</div>
                <a href="/" style="display: inline-block; margin-top: 2rem; color: #64748b;">Return to shop</a>
            </div>
        </main>
    \`;
    res.send(renderLayout('Checkout - Acme', content));
});

// Admin endpoint to simulate redeploys
app.post('/__admin/version', (req, res) => {
    const { v } = req.body;
    if (v === 1 || v === 2) {
        currentVersion = v;
        return res.json({ success: true, version: currentVersion });
    }
    return res.status(400).json({ error: "Version must be 1 or 2" });
});

app.listen(PORT, () => {
    console.log(\`[Target Site] Running on http://localhost:\${PORT} (Version \${currentVersion})\`);
});
`;

fs.writeFileSync(path.join(targetSiteDir, 'package.json'), JSON.stringify(packageJson, null, 2));
fs.writeFileSync(path.join(targetSiteDir, 'server.js'), serverJs.trim());

console.log('Target site generated successfully.');
