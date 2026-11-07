import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// 后端地址：默认本机 8080，联调其他端口用 BACKEND_ORIGIN 覆盖。
const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:8080";
const backendProxy = { target: backendOrigin, changeOrigin: true };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    plugins: [react()],
    // 部署路径：线上挂在 https://agelong.xyz/admin/ 下（.env.production 的 VITE_BASE），
    // 开发环境默认根路径。路由 basename 会跟随 Vite 注入的 BASE_URL。
    base: env.VITE_BASE || "/",
    server: {
      port: 5173,
      proxy: {
        "/api": backendProxy,
      },
    },
    preview: {
      port: 4173,
      proxy: {
        "/api": backendProxy,
        // 生产构建把 VITE_API_BASE_URL 打进了包里（默认 /ai-writer）。
        // 与 nginx 的 "proxy_pass http://backend/" 一致：剥掉 /ai-writer 前缀再转发。
        "/ai-writer": {
          target: backendOrigin,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ai-writer/, ""),
        },
      },
    },
  };
});
