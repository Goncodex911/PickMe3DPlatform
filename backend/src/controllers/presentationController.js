const billing = require('../services/billingStore');
const { getPlan } = require('../config/plans');
const { generatePresentation, cleanInput } = require('../services/slidePipeline');
const jobQueue = require('../services/blueprintJobQueue');

const SLIDE_JOB = 'slide_deck';
const { buildPptx } = require('../services/pptx');
const { uploadIfBase64 } = require('../services/cloudinaryService');

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

// "Dùng deck này" (kiểu Canva): tạo bản sao độc lập của một deck công khai vào không gian của người dùng Pro.
// Deck gốc không bị đổi gì; bản sao không mang theo lượt thích / xem / bình luận và mặc định riêng tư.
exports.useDeck = async (req, res) => {
  const source = await billing.getDeck(req.params.id);
  if (!source || (!source.isPublic && !owns(source, req.user))) {
    return res.status(404).json({ success: false, message: 'Deck not found' });
  }
  const plan = getPlan(req.user.plan) || getPlan('free');
  const clone = (value) => JSON.parse(JSON.stringify(value ?? null));
  const theme = clone(source.theme) || {};
  // Ghi nguồn để trang deck hiện "Based on ‹deck› by ‹tác giả›" (không lưu id tài khoản tác giả)
  theme.copiedFrom = {
    deckId: String(source.id),
    title: String(source.title || '').slice(0, 120),
    authorName: String(source.authorName || '').slice(0, 80),
    copiedAt: new Date().toISOString(),
  };
  const title = `Copy of ${String(source.title || 'Untitled deck')}`.slice(0, 120);
  const deck = await billing.createDeck({
    userId: req.user.id,
    authorName: req.user.name || '',
    title,
    slides: Array.isArray(source.slides) ? clone(source.slides) : [],
    theme,
    thumbnail: source.thumbnail || '',
    isPublic: !(plan.privateDeck || req.user.role === 'admin'),
  });
  res.status(201).json({ success: true, data: deck });
};

// Pipeline nhiều tầng (Groq + Gemini, 3-5 lượt gọi) có thể quá thời gian chờ của một request:
// trả 202 + jobId ngay, client hỏi tiến độ ở GET /presentations/jobs/:id.
exports.generate = async (req, res) => {
  const input = cleanInput(req.body || {});
  if (!input.topic) return res.status(400).json({ success: false, message: 'Enter a topic' });
  const user = { id: req.user.id, name: req.user.name || '' };
  const job = jobQueue.createJob(SLIDE_JOB, { userId: String(user.id) });
  jobQueue.processJob(job.id, async (_job, update) => {
    const generated = await generatePresentation(input, update);
    const deck = await billing.createDeck({
      userId: user.id,
      authorName: user.name,
      title: generated.title,
      slides: generated.slides,
      theme: generated.theme,
      thumbnail: '',
      isPublic: true,
    });
    // Chỉ trừ một lượt cho cả pipeline, và chỉ khi có tầng do AI làm (deck dựng hoàn toàn theo luật không tính)
    if (generated.source === 'ai') await billing.bumpAi(user.id);
    return { deckId: deck.id, source: generated.source, stages: generated.stages, quality: generated.quality };
  });
  res.status(202).json({ success: true, jobId: job.id, status: job.status });
};

exports.job = (req, res) => {
  const job = jobQueue.getJob(req.params.jobId);
  if (!job || job.type !== SLIDE_JOB || job.payload?.userId !== String(req.user.id)) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }
  const done = job.status === 'completed';
  res.json({
    success: true,
    data: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      stage: done ? 'Done' : job.status === 'failed' ? 'Failed' : job.progress < 10 ? 'Starting' : job.stage,
      error: job.error,
      result: done ? job.result : null,
    },
  });
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
  if (typeof req.body?.title === 'string') {
    const title = req.body.title.trim().slice(0, 120);
    if (!title) return res.status(400).json({ success: false, code: 'INVALID_TITLE', message: 'Deck name cannot be empty' });
    patch.title = title;
  }
  if (Array.isArray(req.body?.slides)) patch.slides = req.body.slides;
  if (req.body?.theme && typeof req.body.theme === 'object') {
    patch.theme = { ...req.body.theme };
    // Ghi nguồn của bản sao ("Use this deck") do server đặt lúc sao chép: client không xoá / đổi / tự thêm được.
    // (Studio đổi theme deck cũ sang định dạng mới khi lưu nên có thể làm rơi trường này.)
    const source = current.theme && current.theme.copiedFrom;
    if (source) patch.theme.copiedFrom = source;
    else delete patch.theme.copiedFrom;
    if (!plan.brandKit) {
      delete patch.theme.brandLogo;
    } else if (patch.theme.brandLogo && patch.theme.brandLogo.startsWith('data:')) {
      patch.theme.brandLogo = await uploadIfBase64(patch.theme.brandLogo, 'pickme3d/brand');
    }
  }
  if (typeof req.body?.thumbnail === 'string') {
    if (req.body.thumbnail.startsWith('data:')) {
      patch.thumbnail = await uploadIfBase64(req.body.thumbnail, 'pickme3d/presentations');
    } else {
      patch.thumbnail = req.body.thumbnail;
    }
  }
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
