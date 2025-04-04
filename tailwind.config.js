const config = {
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    "./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}",
  ],

  plugins: [require("flowbite/plugin")],

  darkMode: "class",

  theme: {
    extend: {
      fontSize: {
        base: "14px", // 기본 폰트 크기를 작게 조정
      },
      spacing: {
        xs: "2px",
        sm: "4px",
        md: "6px",
      },
      colors: {
        background: {
          dark: "#121212", // 다크 배경
          panel: "#1E1E1E", // 패널 배경
        },
        text: "#E0E0E0", // 기본 텍스트 색상 (연한 회색)
        border: "#2A2A2A", // 보더 색상 (연한 블랙)
        primary: {
          50: "#E3F2FD",
          100: "#BBDEFB",
          200: "#90CAF9",
          300: "#64B5F6",
          400: "#42A5F5",
          500: "#2196F3", // 네온 블루 (메인 포인트)
          600: "#1E88E5",
          700: "#1976D2",
          800: "#1565C0",
          900: "#0D47A1",
        },
        accent: {
          50: "#E8F5E9",
          100: "#C8E6C9",
          200: "#A5D6A7",
          300: "#81C784",
          400: "#66BB6A",
          500: "#4CAF50", // 네온 민트 (서브 포인트)
          600: "#43A047",
          700: "#388E3C",
          800: "#2E7D32",
          900: "#1B5E20",
        },
      },
      boxShadow: {
        'md': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'lg': '0 6px 10px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'md': '8px',
        'lg': '12px',
      },
    },
  },
};

module.exports = config;
