<template>
  <div class="ai-topic">
    <div class="title">AI tạo bài trình bày</div>
    <p class="hint">Nhập chủ đề. PickMe3D sẽ tạo một deck mới và mở nó trong studio; bài đang sửa được lưu trước.</p>
    <Input
      ref="inputRef"
      v-model:value="topic"
      placeholder="Ví dụ: Bộ sưu tập lụa thu đông"
      :maxlength="80"
      @enter="submit()"
    />
    <div class="actions">
      <Button @click="bridge.aiDialog = false">Huỷ</Button>
      <Button type="primary" :disabled="!topic.trim()" @click="submit()">Tạo</Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { bridge, requestFeature } from './index'
import Input from '@/components/Input.vue'
import Button from '@/components/Button.vue'

const topic = ref('')
const inputRef = useTemplateRef<InstanceType<typeof Input>>('inputRef')

onMounted(() => nextTick(() => inputRef.value?.focus()))

const submit = () => {
  const value = topic.value.trim()
  if (!value) return
  requestFeature('ai-slide', { topic: value })
  bridge.aiDialog = false
}
</script>

<style lang="scss" scoped>
.title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
}
.hint {
  font-size: 12px;
  color: #666;
  margin-bottom: 12px;
}
.actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
