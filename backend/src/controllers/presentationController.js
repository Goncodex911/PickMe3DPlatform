const billing = require('../services/billingStore');
const { getPlan } = require('../config/plans');
const { generateDeck } = require('../services/slideAi');
const { buildPptx } = require('../services/pptx');

function owns(deck, user) {
  return Boolean(deck && user && String(deck.userId) === String(user.id));
}

// Dữ liệu trả về cho người xem: bỏ danh sách id người thích/xem, thêm cờ đã thích và có phải chủ deck
function forViewer(deck, user, { firstSlideOnly = false } = {}) {
  const { likedBy = [], viewedBy = [], ...rest } = deck;
  const viewerId = user ? String(user.id) : '';
  return {
    ...rest,
    slides: firstSlideOnly ? (deck.slides || []).slice(0, 1) : deck.slides,
    slideCount: (deck.slides || []).length,
    liked: Boolean(viewerId && likedBy.includes(viewerId)),
    isOwner: owns(deck, user),
  };
}

async function flaggedDeck(user, id) {
  const rows = billing.applyReadOnly(await billing.listDecks(user.id), user.plan);
  return rows.find((deck) => deck.id === String(id)) || null;
}

exports.list = async (req, res) => {
  const rows = billing.applyReadOnly(await billing.listDecks(req.user.id), req.user.plan);
  res.json({ success: true, data: rows.map((deck) => forViewer(deck, req.user)) });
};

// Deck công khai của các tài khoản khác
exports.community = async (req, res) => {
  const rows = await billing.listPublicDecks({ excludeUserId: req.user.id, limit: req.query.limit });
  res.json({ success: true, data: rows.map((deck) => forViewer(deck, req.user, { firstSlideOnly: true })) });
};

exports.create = async (req, res) => {
  const title = String(req.body?.title || 'Untitled deck').trim().slice(0, 120) || 'Untitled deck';
  const plan = getPlan(req.user.plan) || getPlan('free');
  const isPublic = req.body?.isPublic === false ? false : true;
  if (!isPublic && !plan.privateDeck) {
    return res.status(403).json({ success: false, code: 'UPGRADE_REQUIRED', message: 'The Free plan cannot create private decks' });
  }
  const deck = await billing.createDeck({
    userId: req.user.id,
    authorName: req.user.name || '',
    title,
    slides: Array.isArray(req.body?.slides) ? req.body.slides : [],
    theme: req.body?.theme || { mode: 'dark', accent: '#e11d48' },
    thumbnail: '',
    isPublic,
  });
  res.status(201).json({ success: true, data: deck });
};

exports.generate = async (req, res) => {
  const topic = String(req.body?.topic || '').trim();
  if (!topic) return res.status(400).json({ success: false, message: 'Enter a topic' });
  const generated = await generateDeck(topic);
  const deck = await billing.createDeck({
    userId: req.user.id,
    authorName: req.user.name || '',
    title: generated.title,
    slides: generated.slides,
    theme: generated.theme,
    thumbnail: '',
    isPublic: true,
  });
  // Chỉ trừ lượt khi deck đã lưu và thật sự do AI viết (bộ mẫu dự phòng không tính)
  if (generated.source === 'ai') await billing.bumpAi(req.user.id);
  res.status(201).json({ success: true, data: deck, source: generated.source });
};

// Chủ deck xem đầy đủ; tài khoản khác chỉ xem được deck công khai, ở chế độ chỉ xem
exports.getOne = async (req, res) => {
  const mine = await flaggedDeck(req.user, req.params.id);
  if (owns(mine, req.user)) return res.json({ success: true, data: forViewer(mine, req.user) });
  const deck = await billing.getDeck(req.params.id);
  if (!deck || !deck.isPublic) return res.status(404).json({ success: false, message: 'Deck not found' });
  res.json({ success: true, data: { ...forViewer(deck, req.user), readOnly: true } });
};

exports.publicOne = async (req, res) => {
  const deck = await billing.getDeck(req.params.id);
  if (!deck || (!deck.isPublic && !owns(deck, req.user))) return res.status(404).json({ success: false, message: 'Deck not found' });
  res.json({ success: true, data: forViewer(deck, req.user) });
};

// Ghi một lượt xem. Chủ deck không tính; tài khoản khác tính một lần; không đăng nhập thì cộng mỗi lần mở
exports.view = async (req, res) => {
  const deck = await billing.getDeck(req.params.id);
  if (!deck || (!deck.isPublic && !owns(deck, req.user))) return res.status(404).json({ success: false, message: 'Deck not found' });
  if (owns(deck, req.user)) return res.json({ success: true, data: { viewsCount: deck.viewsCount, counted: false } });
  if (req.user) {
    const viewedBy = new Set(deck.viewedBy || []);
    if (viewedBy.has(String(req.user.id))) return res.json({ success: true, data: { viewsCount: deck.viewsCount, counted: false } });
    viewedBy.add(String(req.user.id));
    const saved = await billing.updateDeck(deck.id, { viewedBy: [...viewedBy], viewsCount: (deck.viewsCount || 0) + 1 }, { touch: false });
    return res.json({ success: true, data: { viewsCount: saved.viewsCount, counted: true } });
  }
  const saved = await billing.updateDeck(deck.id, { viewsCount: (deck.viewsCount || 0) + 1 }, { touch: false });
  return res.json({ success: true, data: { viewsCount: saved.viewsCount, counted: true } });
};

exports.update = async (req, res) => {
  const current = await flaggedDeck(req.user, req.params.id);
  if (!owns(current, req.user)) return res.status(404).json({ success: false, message: 'Deck not found' });
  if (current.readOnly) {
    return res.status(403).json({ success: false, code: 'READ_ONLY', message: 'This deck is over your plan limit and is view only' });
  }
  const plan = getPlan(req.user.plan) || getPlan('free');
  const patch = {};
  if (typeof req.body?.title === 'string') patch.title = req.body.title.trim().slice(0, 120);
  if (Array.isArray(req.body?.slides)) patch.slides = req.body.slides;
  if (req.body?.theme && typeof req.body.theme === 'object') {
    patch.theme = { ...req.body.theme };
    if (!plan.brandKit) delete patch.theme.brandLogo;
  }
  if (typeof req.body?.thumbnail === 'string') patch.thumbnail = req.body.thumbnail.slice(0, 400000);
  if (typeof req.body?.isPublic === 'boolean') {
    if (req.body.isPublic === false && !plan.privateDeck) {
      return res.status(403).json({ success: false, code: 'UPGRADE_REQUIRED', message: 'Private decks require the Pro plan' });
    }
    patch.isPublic = req.body.isPublic;
  }
  const saved = await billing.updateDeck(current.id, patch);
  res.json({ success: true, data: saved });
};

exports.remove = async (req, res) => {
  const current = await billing.getDeck(req.params.id);
  if (!owns(current, req.user)) return res.status(404).json({ success: false, message: 'Deck not found' });
  await billing.deleteDeck(current.id);
  res.json({ success: true });
};

exports.like = async (req, res) => {
  const deck = await billing.getDeck(req.params.id);
  if (!deck || (!deck.isPublic && !owns(deck, req.user))) {
    return res.status(404).json({ success: false, message: 'Deck not found' });
  }
  const likedBy = new Set(deck.likedBy || []);
  if (likedBy.has(req.user.id)) likedBy.delete(req.user.id);
  else likedBy.add(req.user.id);
  const saved = await billing.updateDeck(deck.id, { likedBy: [...likedBy], likesCount: likedBy.size }, { touch: false });
  res.json({ success: true, data: { likesCount: saved.likesCount, liked: likedBy.has(req.user.id) } });
};

exports.comment = async (req, res) => {
  const deck = await billing.getDeck(req.params.id);
  if (!deck || !deck.isPublic) return res.status(404).json({ success: false, message: 'Deck not found' });
  const content = String(req.body?.content || '').trim().slice(0, 500);
  if (!content) return res.status(400).json({ success: false, message: 'Enter a comment' });
  const comments = [
    ...(deck.comments || []),
    {
      id: `${Date.now()}`,
      userId: req.user.id,
      userName: req.user.name || 'Designer',
      content,
      createdAt: new Date().toISOString(),
    },
  ];
  const saved = await billing.updateDeck(deck.id, { comments }, { touch: false });
  res.status(201).json({ success: true, data: saved.comments });
};

exports.exportPptx = async (req, res) => {
  const deck = await billing.getDeck(req.params.id);
  if (!owns(deck, req.user)) return res.status(404).json({ success: false, message: 'Deck not found' });
  const file = buildPptx(deck);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  res.setHeader('Content-Disposition', `attachment; filename="pickme-${deck.id}.pptx"`);
  res.end(file);
};
