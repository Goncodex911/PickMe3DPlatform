<template>
  <div class="upgrade-notice">
    <p>Xuất PPTX cần gói Pro trở lên.</p>
    <Button type="primary" @click="upgrade()">Xem gói nâng cấp</Button>
  </div>
</template>

<script lang="ts" setup>
import { requestFeature } from './index'
import Button from '@/components/Button.vue'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const upgrade = () => {
  requestFeature('export-pptx')
  emit('close')
}
</script>

<style lang="scss" scoped>
.upgrade-notice {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 14px;
}
</style>
