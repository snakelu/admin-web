# admin-web · 管理后台前端

独立于 `ai-writer` 后端的 React 管理前端。不止看板：后续运营、管理类页面都放在这里扩展。

现有页面：

- `/model` 模型用量：总请求、成功率、Tokens、备用切换、按模型/按天明细
- `/users` 用户行为：注册、作业、导学/点评、活跃用户、完成情况

技术栈：Vite + React 19 + TypeScript + react-router。无 UI/图表库，图表为手写 SVG 组件，设计语言沿用小程序"纸白 + 墨灰 + 暖橙 + 草绿"，深色模式跟随系统。

## 开发

```bash
npm install
npm run dev        # http://localhost:5173
```

开发模式请求 `/api/...`，由 vite 代理到 `http://127.0.0.1:8080`（`ai-writer` 默认端口）。后端跑在其他端口时：

```bash
BACKEND_ORIGIN=http://127.0.0.1:8081 npm run dev
```

## 构建

```bash
npm run build      # 产出 dist/，文件名带 hash，可放心长缓存
npm run preview    # 本地冒烟验证生产构建（/api 与 /ai-writer 均代理到后端）
```

## API 地址配置

前端只有一个环境变量 `VITE_API_BASE_URL`，构建时注入：

| 环境 | 值 | 行为 |
| --- | --- | --- |
| 开发 | 空（`.env.development`） | 同源请求 `/api/...`，vite 代理到本地后端 |
| 线上同源部署 | `/ai-writer`（`.env.production` 默认值） | 请求 `https://<域名>/ai-writer/api/v1/...`，由 nginx 反代到后端 |
| 跨域部署 | 完整地址，如 `https://agelong.xyz/ai-writer` | 需在后端 `CORS_ORIGINS` 放行看板域名 |

构建时覆盖：`VITE_API_BASE_URL=/ai-writer npm run build`。

## 部署（并入现有 nginx）

线上 nginx 已经就绪并反向代理了 ai-writer 后端 API（`/ai-writer/` → 后端服务），前端只需**在现有 server 块里加静态资源两段**，参考 [deploy/nginx.conf.example](deploy/nginx.conf.example)：

```nginx
# 1) 静态根目录：npm run build 产出的 dist/
root /var/www/admin-web/dist;

# 2) SPA 路由回落（/model、/users 由 react-router 接管）
location / {
    try_files $uri $uri/ /index.html;
}
```

`/ai-writer/` 的反代保持现状不动。前端与接口同源，无需任何 CORS 配置。发布流程：本地或 CI 执行 `npm run build`，把 `dist/` 同步到服务器的静态目录即可。

## 目录结构

```
src/
  api/        接口地址、fetch 封装（429/异常归一化）、统计数据的类型定义
  hooks/      useStatsData：15 秒轮询 + 手动刷新，出错保留上一次数据
  lib/        数值格式化（万/亿折算、—占位、千分位）
  components/ KpiCards / LineChart / StackedBarChart / Ring / Empty
  pages/      ModelPage（模型用量）、UserPage（用户行为）
  styles/     全套设计系统（亮/暗、响应式、动效降级）
```

新增页面：`src/pages/` 加组件，`main.tsx` 加一条 Route，`App.tsx` 的 nav 加一个 NavLink 即可。
