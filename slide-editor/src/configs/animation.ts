import type { TurningMode } from '@/types/slides'

export const ANIMATION_DEFAULT_DURATION = 1000
export const ANIMATION_DEFAULT_TRIGGER = 'click'
export const ANIMATION_CLASS_PREFIX = 'animate__'

export const ENTER_ANIMATIONS = [
  {
    type: 'bounce',
    name: 'Nảy',
    children: [
      { name: 'Nảy vào', value: 'bounceIn' },
      { name: 'Nảy vào sang phải', value: 'bounceInLeft' },
      { name: 'Nảy vào sang trái', value: 'bounceInRight' },
      { name: 'Nảy vào lên trên', value: 'bounceInUp' },
      { name: 'Nảy vào xuống dưới', value: 'bounceInDown' },
    ],
  },
  {
    type: 'fade',
    name: 'Hiện dần',
    children: [
      { name: 'Hiện vào', value: 'fadeIn' },
      { name: 'Hiện vào xuống dưới', value: 'fadeInDown' },
      { name: 'Hiện vào xuống dưới (xa)', value: 'fadeInDownBig' },
      { name: 'Hiện vào sang phải', value: 'fadeInLeft' },
      { name: 'Hiện vào sang phải (xa)', value: 'fadeInLeftBig' },
      { name: 'Hiện vào sang trái', value: 'fadeInRight' },
      { name: 'Hiện vào sang trái (xa)', value: 'fadeInRightBig' },
      { name: 'Hiện vào lên trên', value: 'fadeInUp' },
      { name: 'Hiện vào lên trên (xa)', value: 'fadeInUpBig' },
      { name: 'Hiện vào từ trên trái', value: 'fadeInTopLeft' },
      { name: 'Hiện vào từ trên phải', value: 'fadeInTopRight' },
      { name: 'Hiện vào từ dưới trái', value: 'fadeInBottomLeft' },
      { name: 'Hiện vào từ dưới phải', value: 'fadeInBottomRight' },
    ],
  },
  {
    type: 'rotate',
    name: 'Xoay',
    children: [
      { name: 'Xoay vào', value: 'rotateIn' },
      { name: 'Xoay vào quanh góc dưới trái', value: 'rotateInDownLeft' },
      { name: 'Xoay vào quanh góc dưới phải', value: 'rotateInDownRight' },
      { name: 'Xoay vào quanh góc trên trái', value: 'rotateInUpLeft' },
      { name: 'Xoay vào quanh góc trên phải', value: 'rotateInUpRight' },
    ],
  },
  {
    type: 'zoom',
    name: 'Thu phóng',
    children: [
      { name: 'Phóng to vào', value: 'zoomIn' },
      { name: 'Phóng to vào xuống dưới', value: 'zoomInDown' },
      { name: 'Phóng to vào từ trái', value: 'zoomInLeft' },
      { name: 'Phóng to vào từ phải', value: 'zoomInRight' },
      { name: 'Phóng to vào lên trên', value: 'zoomInUp' },
    ],
  },
  {
    type: 'slide',
    name: 'Trượt vào',
    children: [
      { name: 'Trượt vào xuống dưới', value: 'slideInDown' },
      { name: 'Trượt vào từ phải', value: 'slideInLeft' },
      { name: 'Trượt vào từ trái', value: 'slideInRight' },
      { name: 'Trượt vào lên trên', value: 'slideInUp' },
    ],
  },
  {
    type: 'flip',
    name: 'Lật',
    children: [
      { name: 'Lật vào theo trục X', value: 'flipInX' },
      { name: 'Lật vào theo trục Y', value: 'flipInY' },
    ],
  },
  {
    type: 'back',
    name: 'Phóng to và trượt vào',
    children: [
      { name: 'Phóng to trượt vào xuống dưới', value: 'backInDown' },
      { name: 'Phóng to trượt vào từ trái', value: 'backInLeft' },
      { name: 'Phóng to trượt vào từ phải', value: 'backInRight' },
      { name: 'Phóng to trượt vào lên trên', value: 'backInUp' },
    ],
  },
  {
    type: 'lightSpeed',
    name: 'Bay vào',
    children: [
      { name: 'Bay vào từ phải', value: 'lightSpeedInRight' },
      { name: 'Bay vào từ trái', value: 'lightSpeedInLeft' },
    ],
  },
]

export const EXIT_ANIMATIONS = [
  {
    type: 'bounce',
    name: 'Nảy',
    children: [
      { name: 'Nảy ra', value: 'bounceOut' },
      { name: 'Nảy ra sang trái', value: 'bounceOutLeft' },
      { name: 'Nảy ra sang phải', value: 'bounceOutRight' },
      { name: 'Nảy ra lên trên', value: 'bounceOutUp' },
      { name: 'Nảy ra xuống dưới', value: 'bounceOutDown' },
    ],
  },
  {
    type: 'fade',
    name: 'Hiện dần',
    children: [
      { name: 'Mờ dần ra', value: 'fadeOut' },
      { name: 'Mờ ra xuống dưới', value: 'fadeOutDown' },
      { name: 'Mờ ra xuống dưới (xa)', value: 'fadeOutDownBig' },
      { name: 'Mờ ra sang trái', value: 'fadeOutLeft' },
      { name: 'Mờ ra sang trái (xa)', value: 'fadeOutLeftBig' },
      { name: 'Mờ ra sang phải', value: 'fadeOutRight' },
      { name: 'Mờ ra sang phải (xa)', value: 'fadeOutRightBig' },
      { name: 'Mờ ra lên trên', value: 'fadeOutUp' },
      { name: 'Mờ ra lên trên (xa)', value: 'fadeOutUpBig' },
      { name: 'Mờ ra về trên trái', value: 'fadeOutTopLeft' },
      { name: 'Mờ ra về trên phải', value: 'fadeOutTopRight' },
      { name: 'Mờ ra về dưới trái', value: 'fadeOutBottomLeft' },
      { name: 'Mờ ra về dưới phải', value: 'fadeOutBottomRight' },
    ],
  },
  {
    type: 'rotate',
    name: 'Xoay',
    children: [
      { name: 'Xoay ra', value: 'rotateOut' },
      { name: 'Xoay ra quanh góc dưới trái', value: 'rotateOutDownLeft' },
      { name: 'Xoay ra quanh góc dưới phải', value: 'rotateOutDownRight' },
      { name: 'Xoay ra quanh góc trên trái', value: 'rotateOutUpLeft' },
      { name: 'Xoay ra quanh góc trên phải', value: 'rotateOutUpRight' },
    ],
  },
  {
    type: 'zoom',
    name: 'Thu phóng',
    children: [
      { name: 'Thu nhỏ ra', value: 'zoomOut' },
      { name: 'Thu nhỏ ra xuống dưới', value: 'zoomOutDown' },
      { name: 'Thu nhỏ ra về trái', value: 'zoomOutLeft' },
      { name: 'Thu nhỏ ra về phải', value: 'zoomOutRight' },
      { name: 'Thu nhỏ ra lên trên', value: 'zoomOutUp' },
    ],
  },
  {
    type: 'slide',
    name: 'Trượt ra',
    children: [
      { name: 'Trượt ra xuống dưới', value: 'slideOutDown' },
      { name: 'Trượt ra về trái', value: 'slideOutLeft' },
      { name: 'Trượt ra về phải', value: 'slideOutRight' },
      { name: 'Trượt ra lên trên', value: 'slideOutUp' },
    ],
  },
  {
    type: 'flip',
    name: 'Lật',
    children: [
      { name: 'Lật ra theo trục X', value: 'flipOutX' },
      { name: 'Lật ra theo trục Y', value: 'flipOutY' },
    ],
  },
  {
    type: 'back',
    name: 'Thu nhỏ và trượt ra',
    children: [
      { name: 'Thu nhỏ trượt ra xuống dưới', value: 'backOutDown' },
      { name: 'Thu nhỏ trượt ra về trái', value: 'backOutLeft' },
      { name: 'Thu nhỏ trượt ra về phải', value: 'backOutRight' },
      { name: 'Thu nhỏ trượt ra lên trên', value: 'backOutUp' },
    ],
  },
  {
    type: 'lightSpeed',
    name: 'Bay ra',
    children: [
      { name: 'Bay ra về phải', value: 'lightSpeedOutRight' },
      { name: 'Bay ra về trái', value: 'lightSpeedOutLeft' },
    ],
  },
]

export const ATTENTION_ANIMATIONS = [
  {
    type: 'shake',
    name: 'Rung lắc',
    children: [
      { name: 'Lắc ngang', value: 'shakeX' },
      { name: 'Lắc dọc', value: 'shakeY' },
      { name: 'Lắc đầu', value: 'headShake' },
      { name: 'Đung đưa', value: 'swing' },
      { name: 'Rung lắc', value: 'wobble' },
      { name: 'Giật mình', value: 'tada' },
      { name: 'Thạch rung', value: 'jello' },
    ],
  },
  {
    type: 'other',
    name: 'Khác',
    children: [
      { name: 'Nảy', value: 'bounce' },
      { name: 'Nhấp nháy', value: 'flash' },
      { name: 'Nhịp đập', value: 'pulse' },
      { name: 'Dây chun', value: 'rubberBand' },
      { name: 'Tim đập (nhanh)', value: 'heartBeat' },
    ],
  },
]

interface SlideAnimation {
  label: string
  value: TurningMode
}

export const SLIDE_ANIMATIONS: SlideAnimation[] = [
  { label: 'Không', value: 'no' },
  { label: 'Ngẫu nhiên', value: 'random' },
  { label: 'Đẩy ngang', value: 'slideX' },
  { label: 'Đẩy dọc', value: 'slideY' },
  { label: 'Đẩy ngang (3D)', value: 'slideX3D' },
  { label: 'Đẩy dọc (3D)', value: 'slideY3D' },
  { label: 'Mờ dần', value: 'fade' },
  { label: 'Xoay', value: 'rotate' },
  { label: 'Mở dọc', value: 'scaleY' },
  { label: 'Mở ngang', value: 'scaleX' },
  { label: 'Phóng to', value: 'scale' },
  { label: 'Thu nhỏ', value: 'scaleReverse' },
]