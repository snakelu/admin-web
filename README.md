# admin-web · 管理后台前端

独立于 `ai-writer` 后端的 React 管理前端。不止看板：后续运营、管理类页面都放在这里扩展。

现有页面：

- `/model` 模型用量：总请求、成功率、Tokens、备用切换、按模型/按天明细
- `/users` 用户行为：注册、作业、导学/点评、活跃用户、完成情况
- `/login` 管理员登录：统计接口已开启管理员鉴权，未登录访问任何页面会跳转到登录页

## 登录

- 凭证提交到后端 `POST {VITE_API_BASE_URL}/api/v1/auth/admin/login`，换取签名 token（默认 12 小时有效）后存入 localStorage
- 之后所有统计请求自动携带 `Authorization: Bearer <token>`；收到 401（过期/被更换）时清除本地登录态并跳回登录页
- 顶栏右侧显示当前用户名与"退出"按钮
- 初始账号由后端首次启动时创建（默认 snakelu / snakelu123@），详见 ai-writer README 的"管理员账号与看板鉴权"

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
| 开发 | 空（`.env.development`） | 同源请求 `/api/...`，vite 代理到本地后端；页面在根路径 `/` |
| 线上同源部署 | `/ai-writer`（`.env.production` 默认值） | 请求 `https://<域名>/ai-writer/api/v1/...`，由 nginx 反代到后端 |
| 跨域部署 | 完整地址，如 `https://agelong.xyz/ai-writer` | 需在后端 `CORS_ORIGINS` 放行看板域名 |

构建时覆盖：`VITE_API_BASE_URL=/ai-writer npm run build`。

另有 `VITE_BASE` 控制前端挂载路径（默认 `/admin/`，开发环境为 `/`）：Vite 以它作为资源引用前缀，react-router 以它作为 basename。改部署路径时同步修改 nginx 的对应 location。

## 部署（并入现有 nginx）

线上 nginx 已就绪：`/ai-writer/` 反代后端 API（剥前缀），根路径 `/` 是现有站点。admin-web 挂在**子路径 `/admin/`** 下，在现有 server 块里加入以下三段（完整说明见 [deploy/nginx.conf.example](deploy/nginx.conf.example)）：

```nginx
location /admin/ {
    root /var/www/agelong.xyz;
    index index.html;
    try_files $uri $uri/ /admin/index.html;
}

location /admin/assets/ {
    root /var/www/agelong.xyz;
    expires 30d;
    add_header Cache-Control "public, immutable";
}

location = /admin {
    return 301 /admin/;
}
```

发布流程（服务器上）：

```bash
cd /home/ecs-user/code/admin-web && npm run build
sudo mkdir -p /var/www/agelong.xyz/admin
sudo rsync -av --delete dist/ /var/www/agelong.xyz/admin/
sudo nginx -t && sudo nginx -s reload
```

部署后访问 `https://agelong.xyz/admin/`。前端请求固定走 `/ai-writer/api/v1/...`，不会落入现有 `/api/v1/`（8000 端口服务）的 location。不建议 alias 到 `/home/ecs-user` 下的 dist——家目录权限通常不允许 nginx worker 穿越读取。

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
