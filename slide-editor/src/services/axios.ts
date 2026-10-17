import axios from 'axios'
import message from '@/utils/message'

const instance = axios.create({ timeout: 1000 * 300 })

instance.interceptors.response.use(
  response => {
    if (response.status >= 200 && response.status < 400) {
      return Promise.resolve(response.data)
    }

    message.error('Lỗi yêu cầu không xác định!')
    return Promise.reject(response)
  },
  error => {
    if (error && error.response) {
      if (error.response.status >= 400 && error.response.status < 500) {
        return Promise.reject(error.message)
      }
      else if (error.response.status >= 500) {
        return Promise.reject(error.message)
      }
      
      message.error('Máy chủ gặp lỗi không xác định!')
      return Promise.reject(error.message)
    }

    message.error('Không kết nối được máy chủ hoặc máy chủ phản hồi quá lâu!')
    return Promise.reject(error)
  }
)

export default instance