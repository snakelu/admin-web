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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
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
