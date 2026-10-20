import { nanoid } from 'nanoid'
import type { PPTElement, Slide, SlideTheme } from '@/types/slides'

// Deck cũ của PickMe Slide Studio (tự viết) và của backend slideAi chỉ có title/body/image/icons,
// toạ độ tính theo % khung 16:9. Hàm này đổi sang slide PPTist (px trên khung 1000 x 562.5).

export const VIEWPORT_SIZE = 1000
export const VIEWPORT_RATIO = 0.5625

const W = VIEWPORT_SIZE
const H = VIEWPORT_SIZE * VIEWPORT_RATIO

export interface LegacyIcon {
  id?: string
  name: string
  x: number
  y: number
  size?: number
  color?: string
}

export interface LegacySlide {
  id?: string
  layout?: string
  title?: string
  body?: string
  image?: string
  bg?: string
  icons?: LegacyIcon[]
  [key: string]: unknown
}

export const PICKME_THEME: SlideTheme = {
  themeColors: ['#e11d48', '#f0a3b5', '#f2d48a', '#8fd8c4', '#a8b0c0', '#f5f2ea'],
  fontColor: '#f5f2ea',
  fontName: 'Plus Jakarta Sans',
  backgroundColor: '#151c2c',
  shadow: { h: 3, v: 3, blur: 2, color: '#808080' },
  outline: { width: 2, color: '#525252', style: 'solid' },
}

const LIGHT = { backgroundColor: '#f6f1e8', fontColor: '#1b140f', bodyColor: '#6d645c' }
const DARK = { backgroundColor: '#151c2c', fontColor: '#f5f2ea', bodyColor: '#a8b0c0' }

export function isPptistSlides(slides: unknown): slides is Slide[] {
  return Array.isArray(slides) && slides.length > 0 && slides.every(s => s && Array.isArray((s as Slide).elements))
}

export function isPptistTheme(theme: unknown): theme is SlideTheme {
  return !!theme && typeof theme === 'object' && Array.isArray((theme as SlideTheme).themeColors)
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function richText(text: string, size: number, opts: { bold?: boolean; italic?: boolean; align?: string }) {
  const lines = String(text || '').split(/\n/)
  return lines.map(line => {
    let inner = `<span style="font-size: ${size}px;">${escapeHtml(line) || '<br>'}</span>`
    if (opts.italic) inner = `<em>${inner}</em>`
    if (opts.bold) inner = `<strong>${inner}</strong>`
    const align = opts.align ? ` style="text-align: ${opts.align};"` : ''
    return `<p${align}>${inner}</p>`
  }).join('')
}

// Vị trí mặc định theo layout mà slideAi sinh ra: [x%, y%, w%] cho title và body
const LAYOUT_BOXES: Record<string, { title: number[]; body: number[]; align?: string }> = {
  title: { title: [8, 30, 84], body: [8, 58, 70] },
  quote: { title: [12, 28, 76], body: [12, 66, 76], align: 'center' },
  closing: { title: [10, 32, 80], body: [10, 58, 80], align: 'center' },
  lookbook: { title: [8, 10, 50], body: [8, 30, 40] },
}
const DEFAULT_BOX = { title: [8, 16, 84], body: [8, 42, 76] }

function num(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

// Khung bị kéo sang phải trong studio cũ vẫn giữ width cũ; cắt lại cho vừa slide
function fit(left: number, width: number) {
  return Math.max(80, Math.min(width, W - left))
}

export function legacyToPptist(slides: LegacySlide[], mode: 'dark' | 'light' = 'dark'): Slide[] {
  const palette = mode === 'light' ? LIGHT : DARK
  return slides.map(slide => {
    const boxes = LAYOUT_BOXES[slide.layout || ''] || DEFAULT_BOX
    const elements: PPTElement[] = []

    const titleSize = num(slide.titleSize, slide.layout === 'quote' ? 44 : 48)
    const titleLeft = (num(slide.titleX, boxes.title[0]) / 100) * W
    elements.push({
      type: 'text',
      id: nanoid(10),
      left: titleLeft,
      top: (num(slide.titleY, boxes.title[1]) / 100) * H,
      width: fit(titleLeft, (num(slide.titleW, boxes.title[2]) / 100) * W),
      height: titleSize * 1.4 + 20,
      rotate: 0,
      lineHeight: 1.1,
      textType: 'title',
      content: richText(String(slide.title || ''), titleSize, {
        bold: Boolean(slide.titleBold),
        italic: slide.titleItalic != null ? Boolean(slide.titleItalic) : true,
        align: boxes.align,
      }),
      // Instrument Serif không có dấu tiếng Việt
      defaultFontName: String(slide.titleFont && slide.titleFont !== 'Instrument Serif' ? slide.titleFont : 'Playfair Display'),
      defaultColor: String(slide.titleColor || palette.fontColor),
    })

    if (slide.body) {
      const bodySize = num(slide.bodySize, 22)
      const lines = String(slide.body).split(/\n/).length
      const bodyLeft = (num(slide.bodyX, boxes.body[0]) / 100) * W
      elements.push({
        type: 'text',
        id: nanoid(10),
        left: bodyLeft,
        top: (num(slide.bodyY, boxes.body[1]) / 100) * H,
        width: fit(bodyLeft, (num(slide.bodyW, boxes.body[2]) / 100) * W),
        height: bodySize * 1.5 * Math.max(1, lines) + 20,
        rotate: 0,
        lineHeight: 1.35,
        textType: 'content',
        content: richText(String(slide.body), bodySize, {
          bold: Boolean(slide.bodyBold),
          italic: Boolean(slide.bodyItalic),
          align: boxes.align,
        }),
        defaultFontName: String(slide.bodyFont || 'Plus Jakarta Sans'),
        defaultColor: String(slide.bodyColor || palette.bodyColor),
      })
    }

    if (slide.image) {
      const imageLeft = (num(slide.imageX, 8) / 100) * W
      const width = fit(imageLeft, (num(slide.imageW, 52) / 100) * W)
      elements.push({
        type: 'image',
        id: nanoid(10),
        src: slide.image,
        left: imageLeft,
        top: (num(slide.imageY, 58) / 100) * H,
        width,
        height: H * 0.34,
        rotate: 0,
        fixedRatio: false,
        radius: 12,
      })
    }

    for (const icon of slide.icons || []) {
      const size = num(icon.size, 48)
      elements.push({
        type: 'text',
        id: nanoid(10),
        left: (num(icon.x, 60) / 100) * W,
        top: (num(icon.y, 16) / 100) * H,
        width: size * 1.6,
        height: size * 1.4,
        rotate: 0,
        content: `<p><span style="font-size: ${size}px;">${escapeHtml(icon.name)}</span></p>`,
        defaultFontName: 'Material Symbols Rounded',
        defaultColor: icon.color || palette.fontColor,
      })
    }

    return {
      id: String(slide.id || nanoid(10)),
      elements,
      background: { type: 'solid', color: slide.bg || palette.backgroundColor },
    }
  })
}

export function legacyTheme(mode: 'dark' | 'light' = 'dark', accent?: string): SlideTheme {
  const palette = mode === 'light' ? LIGHT : DARK
  const themeColors = [...PICKME_THEME.themeColors]
  if (accent) themeColors[0] = accent
  return { ...PICKME_THEME, themeColors, backgroundColor: palette.backgroundColor, fontColor: palette.fontColor }
}
