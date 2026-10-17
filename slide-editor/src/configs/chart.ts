import type { ChartData } from '@/types/slides'

export const CHART_TYPE_MAP: Record<string, string> = {
  'bar': 'Biểu đồ cột',
  'column': 'Biểu đồ thanh',
  'line': 'Biểu đồ đường',
  'area': 'Biểu đồ vùng',
  'scatter': 'Biểu đồ phân tán',
  'pie': 'Biểu đồ tròn',
  'ring': 'Biểu đồ vành khuyên',
  'radar': 'Biểu đồ radar',
}

export const CHART_DEFAULT_DATA: Record<string, ChartData> = {
  'bar': {
    labels: ['Hạng mục 1', 'Hạng mục 2', 'Hạng mục 3', 'Hạng mục 4', 'Hạng mục 5'],
    legends: ['Chuỗi 1', 'Chuỗi 2'],
    series: [[12, 19, 5, 2, 18], [7, 11, 13, 21, 9]],
  },
  'column': {
    labels: ['Hạng mục 1', 'Hạng mục 2', 'Hạng mục 3', 'Hạng mục 4', 'Hạng mục 5'],
    legends: ['Chuỗi 1', 'Chuỗi 2'],
    series: [[12, 19, 5, 2, 18], [7, 11, 13, 21, 9]],
  },
  'line': {
    labels: ['Hạng mục 1', 'Hạng mục 2', 'Hạng mục 3', 'Hạng mục 4', 'Hạng mục 5'],
    legends: ['Chuỗi 1', 'Chuỗi 2'],
    series: [[12, 19, 5, 2, 18], [7, 11, 13, 21, 9]],
  },
  'pie': {
    labels: ['Hạng mục 1', 'Hạng mục 2', 'Hạng mục 3', 'Hạng mục 4', 'Hạng mục 5'],
    legends: ['Giá trị'],
    series: [[12, 19, 5, 2, 18]],
  },
  'ring': {
    labels: ['Hạng mục 1', 'Hạng mục 2', 'Hạng mục 3', 'Hạng mục 4', 'Hạng mục 5'],
    legends: ['Giá trị'],
    series: [[12, 19, 5, 2, 18]],
  },
  'area': {
    labels: ['Hạng mục 1', 'Hạng mục 2', 'Hạng mục 3', 'Hạng mục 4', 'Hạng mục 5'],
    legends: ['Chuỗi 1', 'Chuỗi 2'],
    series: [[12, 19, 5, 2, 18], [7, 11, 13, 21, 9]],
  },
  'radar': {
    labels: ['Hạng mục 1', 'Hạng mục 2', 'Hạng mục 3', 'Hạng mục 4', 'Hạng mục 5'],
    legends: ['Chuỗi 1', 'Chuỗi 2'],
    series: [[12, 19, 5, 2, 18], [7, 11, 13, 21, 9]],
  },
  'scatter': {
    labels: ['Điểm 1', 'Điểm 2', 'Điểm 3', 'Điểm 4', 'Điểm 5'],
    legends: ['X', 'Y'],
    series: [[12, 19, 5, 2, 18], [7, 11, 13, 21, 9]],
  },
}

export const CHART_PRESET_THEMES = [
  ['#d87c7c', '#919e8b', '#d7ab82', '#6e7074', '#61a0a8', '#efa18d'],
  ['#dd6b66', '#759aa0', '#e69d87', '#8dc1a9', '#ea7e53', '#eedd78'],
  ['#516b91', '#59c4e6', '#edafda', '#93b7e3', '#a5e7f0', '#cbb0e3'],
  ['#893448', '#d95850', '#eb8146', '#ffb248', '#f2d643', '#ebdba4'],
  ['#4ea397', '#22c3aa', '#7bd9a5', '#d0648a', '#f58db2', '#f2b3c9'],
  ['#3fb1e3', '#6be6c1', '#626c91', '#a0a7e6', '#c4ebad', '#96dee8'],
  ['#fc97af', '#87f7cf', '#f7f494', '#72ccff', '#f7c5a0', '#d4a4eb'],
  ['#c1232b', '#27727b', '#fcce10', '#e87c25', '#b5c334', '#fe8463'],
  ['#2ec7c9', '#b6a2de', '#5ab1ef', '#ffb980', '#d87a80', '#8d98b3'],
  ['#e01f54', '#001852', '#f5e8c8', '#b8d2c7', '#c6b38e', '#a4d8c2'],
  ['#c12e34', '#e6b600', '#0098d9', '#2b821d', '#005eaa', '#339ca8'],
  ['#8a7ca8', '#e098c7', '#8fd3e8', '#71669e', '#cc70af', '#7cb4cc'],
]