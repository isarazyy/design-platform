import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/design-platform/',
  optimizeDeps: {
    include: ['dayjs', 'dayjs/locale/zh-cn', 'dayjs/plugin/localeData', 'dayjs/plugin/weekday', 'dayjs/plugin/weekOfYear', 'dayjs/plugin/weekYear'],
  },
})
