import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"
// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(),react()],
   resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("antd") || id.includes("rc-")) return "vendor-antd";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("xlsx")) return "vendor-xlsx";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("react-router") || id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
          return "vendor";
        },
      },
    },
  },
})
