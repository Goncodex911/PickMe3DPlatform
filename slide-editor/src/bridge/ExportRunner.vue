<template>
  <div v-if="needsPaint" ref="root" class="pm-export">
    <ThumbnailSlide
      v-for="slide in slides"
      :key="slide.id"
      :slide="slide"
      :size="1600"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { saveAs } from 'file-saver'
import { toJpeg, toPng } from 'html-to-image'
import { useSlidesStore } from '@/store'
import useExport from '@/hooks/useExport'
import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import { bridge, HOST_ORIGIN, embedded } from '@/bridge'
import { dataUrlBytes, pdfFromJpegs, safeName, zipStore } from './pack'

const { slides, title } = storeToRefs(useSlidesStore())
const { exportPPTX } = useExport()
const root = ref<HTMLElement | null>(null)
const needsPaint = computed(() => bridge.downloadFormat === 'pdf' || bridge.downloadFormat === 'image')
let started = false

function notify(status: 'done' | 'error', message?: string) {
  if (!embedded) return
  window.parent.postMessage({ type: 'PM_EXPORT_DONE', status, message }, HOST_ORIGIN)
}

async function waitPaint(node: HTMLElement) {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    const images = [...node.querySelectorAll('img')]
    const canvases = [...node.querySelectorAll('canvas')]
    const pending = images.some(image => !image.complete) || canvases.some(canvas => canvas.width === 0)
    if (!pending) {
      await new Promise(resolve => window.setTimeout(resolve, 250))
      return
    }
    await new Promise(resolve => window.setTimeout(resolve, 150))
  }
}

async function capture(node: HTMLElement, format: 'png' | 'jpeg') {
  node.querySelectorAll('foreignObject [xmlns]').forEach(span => span.removeAttribute('xmlns'))
  const shot = format === 'png' ? toPng : toJpeg
  return shot(node, { quality: 0.92, pixelRatio: 1, cacheBust: false, fontEmbedCSS: '' })
}

async function run(format: 'pptx' | 'pdf' | 'image') {
  if (started) return
  started = true
  const filename = safeName(title.value)
  try {
    if (format === 'pptx') {
      await exportPPTX(slides.value, true, true)
      notify('done')
      return
    }
    await nextTick()
    if (!root.value) await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    const node = root.value
    if (!node) throw new Error('Không dựng được slide')
    await waitPaint(node)
    const cards = [...node.querySelectorAll<HTMLElement>('.thumbnail-slide')]
    if (!cards.length) throw new Error('Không dựng được slide')
    if (format === 'image') {
      const files = []
      for (let index = 0; index < cards.length; index++) {
        const url = await capture(cards[index], 'png')
        files.push({ name: `${filename}-${index + 1}.png`, data: dataUrlBytes(url) })
      }
      const blob = new Blob([zipStore(files) as BlobPart], { type: 'application/zip' })
      saveAs(blob, `${filename}.zip`)
    }
    else {
      const pages = []
      for (const card of cards) {
        const url = await capture(card, 'jpeg')
        pages.push({ jpeg: dataUrlBytes(url), width: card.offsetWidth || 1600, height: card.offsetHeight || 900 })
      }
      const blob = new Blob([pdfFromJpegs(pages) as BlobPart], { type: 'application/pdf' })
      saveAs(blob, `${filename}.pdf`)
    }
    notify('done')
  }
  catch (error) {
    notify('error', error instanceof Error ? error.message : 'Xuất file thất bại')
  }
}

watch(() => bridge.downloadFormat, (format) => {
  if (format) run(format)
}, { immediate: true })
</script>

<style scoped>
.pm-export {
  position: fixed;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
}
</style>
