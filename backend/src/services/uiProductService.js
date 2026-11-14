/**
 * UI Marketplace pricing. Products are the fixed catalogue in data/uiCatalog.json (synced from the frontend by
 * scripts/sync-ui-catalog.js). Every product is paid: its price is the Admin's price (UiProductPrice collection)
 * or, when the Admin has not set one, the default price of its category below. Unknown ids are never priced.
 */
const mongoose = require('mongoose');
const UiProductPrice = require('../models/UiProductPrice');
const catalog = require('../data/uiCatalog.json');
const { MIN_PAID_PRICE_VND, MAX_PRICE_VND } = require('../config/pricing');

// Default price per catalogue category (VND). Simple components cost less than full screens and tools.
const CATEGORY_DEFAULT_PRICE = Object.freeze({
  '버튼': 29000, // Buttons
  '토글·선택': 29000, // Toggle & Select
  '로딩·진행': 29000, // Loading & Progress
  '입력·검색': 39000, // Input & Search
  '메뉴·탭': 39000, // Menu & Tabs
  '알림·피드백': 39000, // Alerts & Feedback
  '빈·오류 상태': 39000, // Empty & Error
  '카드·콘텐츠': 49000, // Cards & Content
  '로그인·가입': 59000, // Login & Signup
  '작업·시스템': 59000, // Ops & System
  '위젯·차트': 69000, // Widgets & Charts
  '분석·데이터': 69000, // Analytics & Data
  '공간·일정·디자인 도구': 79000, // Workspace & Design
  '문서·데이터 편집': 79000, // Docs & Data
});
const FALLBACK_PRICE = 49000;

const CATALOG = new Map(catalog.map((p) => [p.id, p]));

function dbOn() {
  return mongoose.connection.readyState === 1;
}

function getCatalogProduct(productId) {
  return CATALOG.get(String(productId || '').trim()) || null;
}

function defaultPrice(product) {
  return CATEGORY_DEFAULT_PRICE[product.category] || FALLBACK_PRICE;
}

async function overrides() {
  if (!dbOn()) return new Map();
  const rows = await UiProductPrice.find({}).select('productId price updatedAt').lean();
  return new Map(rows.filter((r) => Number(r.price) >= MIN_PAID_PRICE_VND).map((r) => [r.productId, r]));
}

/** { [productId]: price } for every catalogue product. */
async function listPriceMap() {
  const custom = await overrides();
  const map = {};
  for (const p of catalog) map[p.id] = custom.has(p.id) ? custom.get(p.id).price : defaultPrice(p);
  return map;
}

/** Effective price of one product (0 only for ids that are not in the catalogue). */
async function getPrice(productId) {
  const product = getCatalogProduct(productId);
  if (!product) return 0;
  if (dbOn()) {
    const row = await UiProductPrice.findOne({ productId: product.id }).select('price').lean();
    if (row && Number(row.price) >= MIN_PAID_PRICE_VND) return row.price;
  }
  return defaultPrice(product);
}

/** Full catalogue with prices, for the Admin pricing table. */
async function listCatalogWithPrices() {
  const custom = await overrides();
  return catalog.map((p) => {
    const row = custom.get(p.id);
    return {
      ...p,
      price: row ? row.price : defaultPrice(p),
      defaultPrice: defaultPrice(p),
      isCustom: Boolean(row),
      updatedAt: row ? row.updatedAt : null,
    };
  });
}

/** Sets the price of an existing catalogue product. UI products are always paid (no 0). */
async function setPrice(productId, price, adminId) {
  const product = getCatalogProduct(productId);
  if (!product) return { error: 'NOT_IN_CATALOG' };
  const value = Number(price);
  if (!Number.isInteger(value) || value < MIN_PAID_PRICE_VND || value > MAX_PRICE_VND) return { error: 'INVALID_PRICE' };
  const previous = await getPrice(product.id);
  const row = await UiProductPrice.findOneAndUpdate(
    { productId: product.id },
    { $set: { price: value, title: product.title, updatedBy: adminId || null } },
    { upsert: true, new: true }
  );
  return {
    product: { ...product, price: row.price, defaultPrice: defaultPrice(product), isCustom: true, updatedAt: row.updatedAt },
    previous,
  };
}

module.exports = {
  CATEGORY_DEFAULT_PRICE,
  getCatalogProduct,
  defaultPrice,
  listPriceMap,
  getPrice,
  listCatalogWithPrices,
  setPrice,
};
