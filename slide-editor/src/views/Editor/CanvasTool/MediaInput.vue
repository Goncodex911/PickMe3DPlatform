<template>
  <div class="media-input">
    <Tabs 
      :tabs="tabs" 
      v-model:value="type" 
      :tabsStyle="{ marginBottom: '15px' }" 
    />

    <template v-if="type === 'video'">
      <Input v-model:value="videoSrc" placeholder="Enter a video URL, e.g. https://xxx.mp4"></Input>
      <div class="btns">
        <FileInput accept="video/*" @change="files => uploadVideo(files)">
          <Button><i-icon-park-outline:upload /> Upload video</Button>
        </FileInput>
        <div class="group">
          <Button @click="emit('close')" style="margin-right: 10px;">Cancel</Button>
          <Button type="primary" @click="insertVideo()">Confirm</Button>
        </div>
      </div>
    </template>

    <template v-if="type === 'audio'">
      <Input v-model:value="audioSrc" placeholder="Enter an audio URL, e.g. https://xxx.mp3"></Input>
      <div class="btns">
        <FileInput accept="audio/*" @change="files => uploadAudio(files)">
          <Button><i-icon-park-outline:upload /> Upload audio</Button>
        </FileInput>
        <div class="group">
          <Button @click="emit('close')" style="margin-right: 10px;">Cancel</Button>
          <Button type="primary" @click="insertAudio()">Confirm</Button>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import message from '@/utils/message'
import { MIME_MAP } from '@/configs/mime'
import Tabs from '@/components/Tabs.vue'
import Input from '@/components/Input.vue'
import Button from '@/components/Button.vue'
import FileInput from '@/components/FileInput.vue'

type TypeKey = 'video' | 'audio'
interface TabItem {
  key: TypeKey
  label: string
}

const emit = defineEmits<{
  (event: 'insertVideo', payload: { src: string, ext?: string }): void
  (event: 'insertAudio', payload: { src: string, ext?: string }): void
  (event: 'close'): void
}>()

const type = ref<TypeKey>('video')

const videoSrc = ref('https://videos.pexels.com/video-files/29261597/12623866_640_360_24fps.mp4')
const audioSrc = ref('https://freesound.org/data/previews/614/614107_11861866-lq.mp3')

const tabs: TabItem[] = [
  { key: 'video', label: 'Video' },
  { key: 'audio', label: 'Audio' },
]

const insertVideo = () => {
  if (!videoSrc.value) return message.error('Please enter a valid video URL')
  emit('insertVideo', { src: videoSrc.value })
}

const insertAudio = () => {
  if (!audioSrc.value) return message.error('Please enter a valid audio URL')
  emit('insertAudio', { src: audioSrc.value })
}

const uploadVideo = async (files: FileList) => {
  const file = files[0]
  if (!file) return
  const ext = MIME_MAP[file.type] || ''
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'pickme3d/media')
    formData.append('resourceType', 'video')
    const res = await fetch('http://localhost:5001/api/upload', {
      method: 'POST',
      body: formData,
    })
    const json = await res.json()
    if (json.success && json.data?.url) {
      emit('insertVideo', { src: json.data.url, ext })
      return
    }
  } catch (err) {
    console.warn('Upload video to Cloudinary fallback:', err)
  }
  emit('insertVideo', { src: URL.createObjectURL(file), ext })
}

const uploadAudio = async (files: FileList) => {
  const file = files[0]
  if (!file) return
  const ext = MIME_MAP[file.type] || ''
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'pickme3d/media')
    formData.append('resourceType', 'video')
    const res = await fetch('http://localhost:5001/api/upload', {
      method: 'POST',
      body: formData,
    })
    const json = await res.json()
    if (json.success && json.data?.url) {
      emit('insertAudio', { src: json.data.url, ext })
      return
    }
  } catch (err) {
    console.warn('Upload audio to Cloudinary fallback:', err)
  }
  emit('insertAudio', { src: URL.createObjectURL(file), ext })
}
</script>

<style lang="scss" scoped>
.media-input {
  width: 480px;
}
.btns {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
}
</style>
