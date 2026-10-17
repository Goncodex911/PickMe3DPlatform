const LAYOUTS = ['title', 'pitch', 'lookbook', 'case-study', 'portfolio', 'quote', 'two-column', 'closing'];

function slide(layout, title, body) {
  return {
    id: `s-${layout}-${Math.random().toString(36).slice(2, 8)}`,
    layout,
    title,
    body,
  };
}

function generateDeck(topic) {
  const name = String(topic || 'Bộ sưu tập mới').trim().slice(0, 80) || 'Bộ sưu tập mới';
  return {
    title: name,
    theme: { mode: 'dark', accent: '#e11d48' },
    slides: [
      slide('title', name, 'Bài pitch được tạo cho PickMe3D'),
      slide('pitch', 'Vì sao khách chọn', `Ba điểm chạm của ${name}: chất liệu, dáng cắt, và câu chuyện thương hiệu.`),
      slide('lookbook', 'Lookbook', 'Ảnh chủ đạo của bộ sưu tập, kèm chú thích ngắn.'),
      slide('case-study', 'Case study', 'Trước khi có thiết kế này, trang sản phẩm thiếu nhịp. Sau khi dựng trên canvas, khách dừng lại lâu hơn.'),
      slide('quote', 'Một câu của nhà thiết kế', `"${name} là cuộc gặp giữa tay nghề và ánh sáng."`),
      slide('closing', 'Bước tiếp theo', 'Mở studio, chỉnh lại slide, rồi xuất khi gói cho phép.'),
    ].filter((item) => LAYOUTS.includes(item.layout)),
  };
}

module.exports = { generateDeck, LAYOUTS };
