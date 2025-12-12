/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 背景系统
        'app-bg': '#0E1116',
        'workspace-bg': '#151A21',
        'card-bg': '#1A2029',
        'modal-bg': '#1F2630',
        
        // 文字系统
        'text-primary': '#E6EAF0',
        'text-secondary': '#9AA4B2',
        'text-muted': '#6B7280',
        'text-disabled': '#3F4753',
        
        // 交易语义色
        'trade-up': '#2BD97C',
        'trade-down': '#FF5C5C',
        'trade-neutral': '#5E6AD2',
        'trade-focus': '#00E5FF',
        
        // UI 结构色
        'accent-primary': '#00E5FF',
        'accent-secondary': '#2A3342',
        'border-default': '#1F2630',
        'selected-bg': '#202A36',
        'hover-bg': '#202A36',
      },
    },
  },
  plugins: [],
}
