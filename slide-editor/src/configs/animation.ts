import type { TurningMode } from '@/types/slides'

export const ANIMATION_DEFAULT_DURATION = 1000
export const ANIMATION_DEFAULT_TRIGGER = 'click'
export const ANIMATION_CLASS_PREFIX = 'animate__'

export const ENTER_ANIMATIONS = [
  {
    type: 'bounce',
    name: 'Bounce',
    children: [
      { name: 'Bounce in', value: 'bounceIn' },
      { name: 'Bounce in right', value: 'bounceInLeft' },
      { name: 'Bounce in left', value: 'bounceInRight' },
      { name: 'Bounce in up', value: 'bounceInUp' },
      { name: 'Bounce in down', value: 'bounceInDown' },
    ],
  },
  {
    type: 'fade',
    name: 'Fade',
    children: [
      { name: 'Fade in', value: 'fadeIn' },
      { name: 'Fade in down', value: 'fadeInDown' },
      { name: 'Fade in down (far)', value: 'fadeInDownBig' },
      { name: 'Fade in right', value: 'fadeInLeft' },
      { name: 'Fade in right (far)', value: 'fadeInLeftBig' },
      { name: 'Fade in left', value: 'fadeInRight' },
      { name: 'Fade in left (far)', value: 'fadeInRightBig' },
      { name: 'Fade in up', value: 'fadeInUp' },
      { name: 'Fade in up (far)', value: 'fadeInUpBig' },
      { name: 'Fade in from top left', value: 'fadeInTopLeft' },
      { name: 'Fade in from top right', value: 'fadeInTopRight' },
      { name: 'Fade in from bottom left', value: 'fadeInBottomLeft' },
      { name: 'Fade in from bottom right', value: 'fadeInBottomRight' },
    ],
  },
  {
    type: 'rotate',
    name: 'Rotate',
    children: [
      { name: 'Rotate in', value: 'rotateIn' },
      { name: 'Rotate in down left', value: 'rotateInDownLeft' },
      { name: 'Rotate in down right', value: 'rotateInDownRight' },
      { name: 'Rotate in up left', value: 'rotateInUpLeft' },
      { name: 'Rotate in up right', value: 'rotateInUpRight' },
    ],
  },
  {
    type: 'zoom',
    name: 'Zoom',
    children: [
      { name: 'Zoom in', value: 'zoomIn' },
      { name: 'Zoom in down', value: 'zoomInDown' },
      { name: 'Zoom in left', value: 'zoomInLeft' },
      { name: 'Zoom in right', value: 'zoomInRight' },
      { name: 'Zoom in up', value: 'zoomInUp' },
    ],
  },
  {
    type: 'slide',
    name: 'Slide in',
    children: [
      { name: 'Slide in down', value: 'slideInDown' },
      { name: 'Slide in from right', value: 'slideInLeft' },
      { name: 'Slide in from left', value: 'slideInRight' },
      { name: 'Slide in up', value: 'slideInUp' },
    ],
  },
  {
    type: 'flip',
    name: 'Flip',
    children: [
      { name: 'Flip in (X axis)', value: 'flipInX' },
      { name: 'Flip in (Y axis)', value: 'flipInY' },
    ],
  },
  {
    type: 'back',
    name: 'Back in',
    children: [
      { name: 'Back in down', value: 'backInDown' },
      { name: 'Back in left', value: 'backInLeft' },
      { name: 'Back in right', value: 'backInRight' },
      { name: 'Back in up', value: 'backInUp' },
    ],
  },
  {
    type: 'lightSpeed',
    name: 'Fly in',
    children: [
      { name: 'Fly in from right', value: 'lightSpeedInRight' },
      { name: 'Fly in from left', value: 'lightSpeedInLeft' },
    ],
  },
]

export const EXIT_ANIMATIONS = [
  {
    type: 'bounce',
    name: 'Bounce',
    children: [
      { name: 'Bounce out', value: 'bounceOut' },
      { name: 'Bounce out left', value: 'bounceOutLeft' },
      { name: 'Bounce out right', value: 'bounceOutRight' },
      { name: 'Bounce out up', value: 'bounceOutUp' },
      { name: 'Bounce out down', value: 'bounceOutDown' },
    ],
  },
  {
    type: 'fade',
    name: 'Fade',
    children: [
      { name: 'Fade out', value: 'fadeOut' },
      { name: 'Fade out down', value: 'fadeOutDown' },
      { name: 'Fade out down (far)', value: 'fadeOutDownBig' },
      { name: 'Fade out left', value: 'fadeOutLeft' },
      { name: 'Fade out left (far)', value: 'fadeOutLeftBig' },
      { name: 'Fade out right', value: 'fadeOutRight' },
      { name: 'Fade out right (far)', value: 'fadeOutRightBig' },
      { name: 'Fade out up', value: 'fadeOutUp' },
      { name: 'Fade out up (far)', value: 'fadeOutUpBig' },
      { name: 'Fade out to top left', value: 'fadeOutTopLeft' },
      { name: 'Fade out to top right', value: 'fadeOutTopRight' },
      { name: 'Fade out to bottom left', value: 'fadeOutBottomLeft' },
      { name: 'Fade out to bottom right', value: 'fadeOutBottomRight' },
    ],
  },
  {
    type: 'rotate',
    name: 'Rotate',
    children: [
      { name: 'Rotate out', value: 'rotateOut' },
      { name: 'Rotate out down left', value: 'rotateOutDownLeft' },
      { name: 'Rotate out down right', value: 'rotateOutDownRight' },
      { name: 'Rotate out up left', value: 'rotateOutUpLeft' },
      { name: 'Rotate out up right', value: 'rotateOutUpRight' },
    ],
  },
  {
    type: 'zoom',
    name: 'Zoom',
    children: [
      { name: 'Zoom out', value: 'zoomOut' },
      { name: 'Zoom out down', value: 'zoomOutDown' },
      { name: 'Zoom out left', value: 'zoomOutLeft' },
      { name: 'Zoom out right', value: 'zoomOutRight' },
      { name: 'Zoom out up', value: 'zoomOutUp' },
    ],
  },
  {
    type: 'slide',
    name: 'Slide out',
    children: [
      { name: 'Slide out down', value: 'slideOutDown' },
      { name: 'Slide out left', value: 'slideOutLeft' },
      { name: 'Slide out right', value: 'slideOutRight' },
      { name: 'Slide out up', value: 'slideOutUp' },
    ],
  },
  {
    type: 'flip',
    name: 'Flip',
    children: [
      { name: 'Flip out (X axis)', value: 'flipOutX' },
      { name: 'Flip out (Y axis)', value: 'flipOutY' },
    ],
  },
  {
    type: 'back',
    name: 'Back out',
    children: [
      { name: 'Back out down', value: 'backOutDown' },
      { name: 'Back out left', value: 'backOutLeft' },
      { name: 'Back out right', value: 'backOutRight' },
      { name: 'Back out up', value: 'backOutUp' },
    ],
  },
  {
    type: 'lightSpeed',
    name: 'Fly out',
    children: [
      { name: 'Fly out right', value: 'lightSpeedOutRight' },
      { name: 'Fly out left', value: 'lightSpeedOutLeft' },
    ],
  },
]

export const ATTENTION_ANIMATIONS = [
  {
    type: 'shake',
    name: 'Shake',
    children: [
      { name: 'Shake horizontal', value: 'shakeX' },
      { name: 'Shake vertical', value: 'shakeY' },
      { name: 'Head shake', value: 'headShake' },
      { name: 'Swing', value: 'swing' },
      { name: 'Shake', value: 'wobble' },
      { name: 'Tada', value: 'tada' },
      { name: 'Jello', value: 'jello' },
    ],
  },
  {
    type: 'other',
    name: 'Other',
    children: [
      { name: 'Bounce', value: 'bounce' },
      { name: 'Flash', value: 'flash' },
      { name: 'Pulse', value: 'pulse' },
      { name: 'Rubber band', value: 'rubberBand' },
      { name: 'Heartbeat (fast)', value: 'heartBeat' },
    ],
  },
]

interface SlideAnimation {
  label: string
  value: TurningMode
}

export const SLIDE_ANIMATIONS: SlideAnimation[] = [
  { label: 'None', value: 'no' },
  { label: 'Random', value: 'random' },
  { label: 'Push horizontal', value: 'slideX' },
  { label: 'Push vertical', value: 'slideY' },
  { label: 'Push horizontal (3D)', value: 'slideX3D' },
  { label: 'Push vertical (3D)', value: 'slideY3D' },
  { label: 'Fade', value: 'fade' },
  { label: 'Rotate', value: 'rotate' },
  { label: 'Expand vertical', value: 'scaleY' },
  { label: 'Expand horizontal', value: 'scaleX' },
  { label: 'Zoom in', value: 'scale' },
  { label: 'Zoom out', value: 'scaleReverse' },
]