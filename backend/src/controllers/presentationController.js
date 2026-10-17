const billing = require('../services/billingStore');
const { getPlan } = require('../config/plans');
const { generateDeck } = require('../services/slideAi');
const { buildPptx } = require('../services/pptx');

function owns(deck, user) {
  return deck && String(deck.userId) === String(user.id);
}

async function flaggedDeck(user, id) {
  const rows = billing.applyReadOnly(await billing.listDecks(user.id), user.plan);
  return rows.find((deck) => deck.id === String(id)) || null;
}

exports.list = async (req, res) => {
  const rows = billing.applyReadOnly(await billing.listDecks(req.user.id), req.user.plan);
  res.json({ success: true, data: rows });
};

exports.create = async (req, res) => {
  const title = String(req.body?.title || 'Bài trình bày mới').trim().slice(0, 120) || 'Bài trình bày mới';
  const plan = getPlan(req.user.plan) || getPlan('free');
  const isPublic = req.body?.isPublic === false ? false : true;
  if (!isPublic && !plan.privateDeck) {
    return res.status(403).json({ success: false, code: 'UPGRADE_REQUIRED', message: 'Gói Free không tạo được deck riêng tư' });
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
  if (!topic) return res.status(400).json({ success: false, message: 'Nhập chủ đề' });
  const generated = generateDeck(topic);
  await billing.bumpAi(req.user.id);
  const deck = await billing.createDeck({
    userId: req.user.id,
    authorName: req.user.name || '',
    title: generated.title,
    slides: generated.slides,
    theme: generated.theme,
    thumbnail: '',
    isPublic: true,
  });
  res.status(201).json({ success: true, data: deck });
};

exports.getOne = async (req, res) => {
  const deck = await flaggedDeck(req.user, req.params.id);
  if (!owns(deck, req.user)) return res.status(404).json({ success: false, message: 'Không thấy bài' });
  res.json({ success: true, data: deck });
};

exports.publicOne = async (req, res) => {
  const deck = await billing.getDeck(req.params.id);
  if (!deck || !deck.isPublic) return res.status(404).json({ success: false, message: 'Không thấy bài' });
  res.json({ success: true, data: deck });
};

exports.update = async (req, res) => {
  const current = await flaggedDeck(req.user, req.params.id);
  if (!owns(current, req.user)) return res.status(404).json({ success: false, message: 'Không thấy bài' });
  if (current.readOnly) {
    return res.status(403).json({ success: false, code: 'READ_ONLY', message: 'Deck vượt hạn mức, chỉ xem được' });
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
      return res.status(403).json({ success: false, code: 'UPGRADE_REQUIRED', message: 'Cần gói Pro để để riêng tư' });
    }
    patch.isPublic = req.body.isPublic;
  }
  const saved = await billing.updateDeck(current.id, patch);
  res.json({ success: true, data: saved });
};

exports.remove = async (req, res) => {
  const current = await billing.getDeck(req.params.id);
  if (!owns(current, req.user)) return res.status(404).json({ success: false, message: 'Không thấy bài' });
  await billing.deleteDeck(current.id);
  res.json({ success: true });
};

exports.like = async (req, res) => {
  const deck = await billing.getDeck(req.params.id);
  if (!deck || (!deck.isPublic && !owns(deck, req.user))) {
    return res.status(404).json({ success: false, message: 'Không thấy bài' });
  }
  const likedBy = new Set(deck.likedBy || []);
  if (likedBy.has(req.user.id)) likedBy.delete(req.user.id);
  else likedBy.add(req.user.id);
  const saved = await billing.updateDeck(deck.id, { likedBy: [...likedBy], likesCount: likedBy.size });
  res.json({ success: true, data: { likesCount: saved.likesCount, liked: likedBy.has(req.user.id) } });
};

exports.comment = async (req, res) => {
  const deck = await billing.getDeck(req.params.id);
  if (!deck || !deck.isPublic) return res.status(404).json({ success: false, message: 'Không thấy bài' });
  const content = String(req.body?.content || '').trim().slice(0, 500);
  if (!content) return res.status(400).json({ success: false, message: 'Nhập nội dung' });
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
  const saved = await billing.updateDeck(deck.id, { comments });
  res.status(201).json({ success: true, data: saved.comments });
};

exports.exportPptx = async (req, res) => {
  const deck = await billing.getDeck(req.params.id);
  if (!owns(deck, req.user)) return res.status(404).json({ success: false, message: 'Không thấy bài' });
  const file = buildPptx(deck);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  res.setHeader('Content-Disposition', `attachment; filename="pickme-${deck.id}.pptx"`);
  res.end(file);
};
