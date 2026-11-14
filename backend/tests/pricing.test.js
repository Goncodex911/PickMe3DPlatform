const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isValidPrice } = require('../src/config/pricing');
const uiProducts = require('../src/services/uiProductService');

test('price is 0 (free) or an integer VND from 1.000 to 50.000.000', () => {
  for (const ok of [0, 1000, 49000, 50000000, '99000']) assert.ok(isValidPrice(ok), `expected valid: ${ok}`);
  for (const bad of [-1, 500, 999, 1000.5, 50000001, 'abc', NaN, Infinity]) assert.ok(!isValidPrice(bad), `expected invalid: ${bad}`);
});

test('UI Marketplace only prices products that exist in the catalogue (Admin cannot add products)', async () => {
  assert.ok(uiProducts.getCatalogProduct('001'));
  assert.equal(uiProducts.getCatalogProduct('new-product'), null);
  const result = await uiProducts.setPrice('new-product', 49000, null);
  assert.equal(result.error, 'NOT_IN_CATALOG');
  const invalid = await uiProducts.setPrice('001', 500, null);
  assert.equal(invalid.error, 'INVALID_PRICE');
  const free = await uiProducts.setPrice('001', 0, null);
  assert.equal(free.error, 'INVALID_PRICE'); // UI products are never free
});

test('every UI catalogue product has a paid default price', async () => {
  const map = await uiProducts.listPriceMap();
  const ids = Object.keys(map);
  assert.equal(ids.length, 200);
  assert.ok(ids.every((id) => map[id] >= 1000), 'no free product');
  assert.equal(await uiProducts.getPrice('001'), uiProducts.CATEGORY_DEFAULT_PRICE['버튼']);
  assert.equal(await uiProducts.getPrice('not-a-product'), 0);
});
