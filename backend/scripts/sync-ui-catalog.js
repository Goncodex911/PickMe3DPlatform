/**
 * Copies the UI Marketplace product list (id + title) from the frontend catalogue into the backend, so the API can
 * refuse prices for ids that are not in the catalogue (Admin prices products, never adds them).
 *
 *   node scripts/sync-ui-catalog.js   (run again whenever frontend/public/ux-full-catalog.json changes)
 */
const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', '..', 'frontend', 'public', 'ux-full-catalog.json');
const target = path.join(__dirname, '..', 'src', 'data', 'uiCatalog.json');

const catalog = JSON.parse(fs.readFileSync(source, 'utf8'));
if (!Array.isArray(catalog)) throw new Error('ux-full-catalog.json must be an array');

const products = catalog
  .filter((item) => item && typeof item.id === 'string' && item.id.trim())
  .map((item) => ({ id: item.id.trim(), title: String(item.titleEn || item.title || item.id).trim(), category: item.category || '' }));

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(products, null, 0) + '\n');
console.log(`Wrote ${products.length} UI products to ${path.relative(process.cwd(), target)}`);
