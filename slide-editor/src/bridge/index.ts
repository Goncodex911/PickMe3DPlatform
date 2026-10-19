import { reactive, watch } from 'vue'
import { toJpeg } from 'html-to-image'
import { useMainStore, useScreenStore, useSlidesStore, useSnapshotStore } from '@/store'
import type { DialogForExportTypes } from '@/types/export'
import type { Slide, SlideTheme } from '@/types/slides'
import { isPptistSlides, isPptistTheme, legacyTheme, legacyToPptist, PICKME_THEME, VIEWPORT_RATIO, type LegacySlide } from './legacy'

// Cầu nối postMessage với host PickMe3D (frontend Next.js).
// Studio -> host: PM_READY, PM_SAVE, PM_REQUEST_FEATURE, PM_SAVE_STATUS
// Host -> studio: PM_INIT, PM_PLAN, PM_FLUSH, PM_INSERT_DESIGN, PM_OPEN_EXPORT

// Bản build chạy cùng origin với host (frontend/public/slide-studio). Chỉ khi chạy `npm run dev` riêng ở 5174
// mới cần VITE_HOST_ORIGIN trỏ về host.
export const HOST_ORIGIN = import.meta.env.VITE_HOST_ORIGIN || window.location.origin

export const embedded = window.parent !== window
const params = new URLSearchParams(window.location.search)

export interface BridgeDesign {
  id?: string
  _id?: string
  title?: string
  thumbnailUrl?: string
  imageUrl?: string
}

export const bridge = reactive({
  ready: false,
  plan: 'free',
  readOnly: false,
  viewOnly: params.get('mode') === 'view',
  designs: [] as BridgeDesign[],
  features: null as { exportPptx?: boolean; watermark?: boolean } | null,
  aiDialog: false,
  downloadJob: params.get('job') === 'download',
  downloadFormat: '' as '' | 'pptx' | 'pdf' | 'image',
})

export const canExportPptx = () => bridge.features?.exportPptx ?? bridge.plan !== 'free'

function post(message: Record<string, unknown>) {
  if (!embedded) return
  window.parent.postMessage(message, HOST_ORIGIN)
}

export function requestFeature(feature: string, extra: Record<string, unknown> = {}) {
  post({ type: 'PM_REQUEST_FEATURE', feature, ...extra })
}

async function thumbnail() {
  const node = document.querySelector('.thumbnail-list .thumbnail-item .thumbnail') as HTMLElement | null
  if (!node) return undefined
  try {
    return await toJpeg(node, { pixelRatio: 3, quality: 0.8, skipFonts: true, cacheBust: false })
  }
  catch {
    return undefined
  }
}

let saveTimer = 0
let pendingExport: DialogForExportTypes | null = null
let pendingDownload: 'pptx' | 'pdf' | 'image' | null = null

function beginDownload(format: 'pptx' | 'pdf' | 'image') {
  if (format === 'pptx' && !canExportPptx()) {
    requestFeature('export-pptx')
    post({ type: 'PM_EXPORT_DONE', status: 'blocked', message: 'PPTX export requires the Pro plan' })
    return
  }
  bridge.downloadFormat = format
}

function queueDownload(format: 'pptx' | 'pdf' | 'image') {
  if (!bridge.ready) pendingDownload = format
  else beginDownload(format)
}

function openExport(format: DialogForExportTypes) {
  if (!bridge.ready) {
    pendingExport = format
    return
  }
  useMainStore().setDialogForExport(format)
}
let insertImage: ((src: string) => void) | null = null

export function registerImageInserter(fn: (src: string) => void) {
  insertImage = fn
}

async function emitSave(requestId?: string) {
  window.clearTimeout(saveTimer)
  if (bridge.readOnly || bridge.viewOnly) {
    if (requestId) post({ type: 'PM_SAVE_STATUS', status: 'skipped', requestId })
    return
  }
  const slidesStore = useSlidesStore()
  post({ type: 'PM_SAVE_STATUS', status: 'saving' })
  post({
    type: 'PM_SAVE',
    title: slidesStore.title,
    slides: JSON.parse(JSON.stringify(slidesStore.slides)),
    theme: { ...JSON.parse(JSON.stringify(slidesStore.theme)), viewportRatio: slidesStore.viewportRatio, format: 'pptist' },
    thumbnail: await thumbnail(),
    requestId,
  })
}

function scheduleSave() {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => emitSave(), 1500)
}

interface InitMessage {
  deck?: { title?: string; slides?: unknown[]; theme?: Record<string, unknown>; readOnly?: boolean }
  plan?: string
  designs?: BridgeDesign[]
  features?: { exportPptx?: boolean; watermark?: boolean } | null
}

async function applyInit(data: InitMessage) {
  const slidesStore = useSlidesStore()
  const deck = data.deck || {}
  const theme = deck.theme || {}
  bridge.plan = data.plan || 'free'
  bridge.readOnly = Boolean(deck.readOnly)
  bridge.designs = Array.isArray(data.designs) ? data.designs : []
  bridge.features = data.features && typeof data.features === 'object' ? data.features : null

  let slides: Slide[]
  let slideTheme: SlideTheme
  if (isPptistSlides(deck.slides)) {
    slides = deck.slides
    slideTheme = isPptistTheme(theme) ? { ...PICKME_THEME, ...(theme as Partial<SlideTheme>) } : PICKME_THEME
  }
  else {
    const mode = theme.mode === 'light' ? 'light' : 'dark'
    const legacy = Array.isArray(deck.slides) && deck.slides.length ? deck.slides as LegacySlide[] : [{ title: deck.title || 'Untitled deck' }]
    slides = legacyToPptist(legacy, mode)
    slideTheme = legacyTheme(mode, typeof theme.accent === 'string' ? theme.accent : undefined)
  }

  slidesStore.setTitle(deck.title || 'Untitled deck')
  slidesStore.setViewportRatio(typeof theme.viewportRatio === 'number' ? theme.viewportRatio : VIEWPORT_RATIO)
  slidesStore.updateSlideIndex(0)
  slidesStore.setSlides(slides, slideTheme)

  if (bridge.downloadJob) {
    // Trang deck chỉ cần dựng slide để tải file, không mở editor.
  }
  else if (bridge.readOnly || bridge.viewOnly) useScreenStore().setScreening(true)
  else await useSnapshotStore().initSnapshotDatabase()

  if (!bridge.ready) {
    bridge.ready = true
    if (pendingDownload) {
      const format = pendingDownload
      pendingDownload = null
      beginDownload(format)
    }
    if (pendingExport && !bridge.readOnly && !bridge.viewOnly) {
      useMainStore().setDialogForExport(pendingExport)
      pendingExport = null
    }
    if (bridge.downloadJob) return
    watch(
      () => [slidesStore.slides, slidesStore.title, slidesStore.theme, slidesStore.viewportRatio],
      scheduleSave,
      { deep: true },
    )
  }
}

export function startBridge() {
  window.addEventListener('message', event => {
    if (event.origin !== HOST_ORIGIN || event.source !== window.parent) return
    const data = event.data
    if (!data || typeof data !== 'object') return
    if (data.type === 'PM_INIT') applyInit(data)
    if (data.type === 'PM_PLAN') {
      bridge.plan = typeof data.plan === 'string' ? data.plan : bridge.plan
      bridge.features = data.features && typeof data.features === 'object' ? data.features : bridge.features
    }
    if (data.type === 'PM_OPEN_EXPORT' && ['pptx', 'pdf', 'image'].includes(data.format)) openExport(data.format)
    if (data.type === 'PM_DOWNLOAD' && ['pptx', 'pdf', 'image'].includes(data.format)) queueDownload(data.format)
    if (data.type === 'PM_FLUSH') emitSave(typeof data.requestId === 'string' ? data.requestId : 'flush')
    if (data.type === 'PM_INSERT_DESIGN' && typeof data.imageUrl === 'string' && data.imageUrl && insertImage) {
      if (!bridge.readOnly && !bridge.viewOnly) insertImage(data.imageUrl)
    }
  })

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      emitSave()
    }
  })

  post({ type: 'PM_READY' })
}
