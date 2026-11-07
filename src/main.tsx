import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App, { useAppData } from "./App";
import { ModelPage } from "./pages/ModelPage";
import { UserPage } from "./pages/UserPage";
import "./styles/dashboard.css";

/** 路由出口：从布局的轮询状态里取各自面板的数据。 */
function ModelRoute() {
  const { model } = useAppData();
  return <ModelPage data={model.data} />;
}

function UserRoute() {
  const { user } = useAppData();
  return <UserPage data={user.data} />;
}

// 部署在子路径（如 https://agelong.xyz/admin/）时，Vite 的 BASE_URL 为该前缀；
// 开发环境为 "/"。去掉尾斜杠作为 basename。
const routerBasename = import.meta.env.BASE_URL.replace(/\/+$/, "") || "/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Navigate to="/model" replace />} />
          <Route path="/model" element={<ModelRoute />} />
          <Route path="/users" element={<UserRoute />} />
          <Route path="*" element={<Navigate to="/model" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
