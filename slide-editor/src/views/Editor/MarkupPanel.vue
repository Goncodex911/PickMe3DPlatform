<template>
  <MoveablePanel 
    class="notes-panel" 
    :width="300" 
    :height="130" 
    title="Gắn loại slide" 
    :left="-270" 
    :top="90"
    @close="close()"
  >
    <div class="container">
      <div class="row">
        <div style="width: 40%;">Loại trang:</div>
        <Select
          style="width: 60%;"
          :value="slideType"
          @update:value="value => updateSlide(value as SlideType | '')"
          :options="slideTypeOptions"
        />
      </div>
      <div class="row" v-if="handleElement && (handleElement.type === 'text' || (handleElement.type === 'shape' && handleElement.text))">
        <div style="width: 40%;">Loại chữ:</div>
        <Select
          style="width: 60%;"
          :value="textType"
          @update:value="value => updateElement(value as TextType | '')"
          :options="textTypeOptions"
        />
      </div>
      <div class="row" v-else-if="handleElement && handleElement.type === 'image'">
        <div style="width: 40%;">Loại ảnh:</div>
        <Select
          style="width: 60%;"
          :value="imageType"
          @update:value="value => updateElement(value as ImageType | '')"
          :options="imageTypeOptions"
        />
      </div>
      <div class="placeholder" v-else>Chọn ảnh, chữ hoặc hình có chữ để gắn loại</div>
    </div>
  </MoveablePanel>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { ImageType, SlideType, TextType } from '@/types/slides'

import MoveablePanel from '@/components/MoveablePanel.vue'
import Select from '@/components/Select.vue'

const slidesStore = useSlidesStore()
const mainStore = useMainStore()
const { currentSlide } = storeToRefs(slidesStore)
const { handleElement, handleElementId } = storeToRefs(mainStore)

const slideTypeOptions = ref<{ label: string; value: SlideType | '' }[]>([
  { label: 'Chưa gắn loại', value: '' },
  { label: 'Trang bìa', value: 'cover' },
  { label: 'Trang mục lục', value: 'contents' },
  { label: 'Trang chuyển tiếp', value: 'transition' },
  { label: 'Trang nội dung', value: 'content' },
  { label: 'Trang kết', value: 'end' },
])

const textTypeOptions = ref<{ label: string; value: TextType | '' }[]>([
  { label: 'Chưa gắn loại', value: '' },
  { label: 'Tiêu đề', value: 'title' },
  { label: 'Tiêu đề phụ', value: 'subtitle' },
  { label: 'Nội dung', value: 'content' },
  { label: 'Mục danh sách', value: 'item' },
  { label: 'Tiêu đề mục danh sách', value: 'itemTitle' },
  { label: 'Chú thích', value: 'notes' },
  { label: 'Đầu trang', value: 'header' },
  { label: 'Chân trang', value: 'footer' },
  { label: 'Số phần', value: 'partNumber' },
  { label: 'Số mục', value: 'itemNumber' },
])

const imageTypeOptions = ref<{ label: string; value: ImageType | '' }[]>([
  { label: 'Chưa gắn loại', value: '' },
  { label: 'Ảnh minh hoạ trang', value: 'pageFigure' },
  { label: 'Ảnh minh hoạ mục', value: 'itemFigure' },
  { label: 'Ảnh nền', value: 'background' },
])

const slideType = computed(() => currentSlide.value?.type || '')
const textType = computed(() => {
  if (!handleElement.value) return ''
  if (handleElement.value.type === 'text') return handleElement.value.textType || ''
  if (handleElement.value.type === 'shape' && handleElement.value.text) return handleElement.value.text.type || ''
  return ''
})
const imageType = computed(() => {
  if (!handleElement.value) return ''
  if (handleElement.value.type === 'image') return handleElement.value.imageType || ''
  return ''
})

const updateSlide = (type: SlideType | '') => {
  if (type) slidesStore.updateSlide({ type })
  else {
    slidesStore.removeSlideProps({
      id: currentSlide.value.id,
      propName: 'type',
    })
  }
}

const updateElement = (type: TextType | ImageType | '') => {
  if (!handleElement.value) return
  if (handleElement.value.type === 'image') {
    if (type) {
      slidesStore.updateElement({ id: handleElementId.value, props: { imageType: type as ImageType } })
    }
    else {
      slidesStore.removeElementProps({
        id: handleElementId.value,
        propName: 'imageType',
      })
    }
  }
  if (handleElement.value.type === 'text') {
    if (type) {
      slidesStore.updateElement({ id: handleElementId.value, props: { textType: type as TextType } })
    }
    else {
      slidesStore.removeElementProps({
        id: handleElementId.value,
        propName: 'textType',
      })
    }
  }
  if (handleElement.value.type === 'shape') {
    const text = handleElement.value.text
    if (!text) return

    if (type) {
      slidesStore.updateElement({
        id: handleElementId.value,
        props: { text: { ...text, type: type as TextType } },
      })
    }
    else {
      delete text.type
      slidesStore.updateElement({
        id: handleElementId.value,
        props: { text },
      })
    }
  }
}

const close = () => {
  mainStore.setMarkupPanelState(false)
}
</script>

<style lang="scss" scoped>
.notes-panel {
  height: 100%;
  font-size: 12px;
  user-select: none;
}
.container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.row {
  width: 100%;
  display: flex;
  align-items: center;

  & + .row {
    margin-top: 5px;
  }
}
.placeholder {
  height: 30px;
  line-height: 30px;
  text-align: center;
  color: #999;
  font-style: italic;
  border: 1px dashed #ccc;
  border-radius: $borderRadius;
  margin-top: 5px;
}
</style>