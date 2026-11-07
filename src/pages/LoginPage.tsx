import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../api/client";
import { saveSession } from "../lib/auth";

/** 管理后台登录页：成功后跳回 /model。 */
export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const result = await loginAdmin(username.trim(), password);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    saveSession(result.token, result.username);
    navigate("/model", { replace: true });
  }

  return (
    <div className="login-shell">
      <form className="card login-card" onSubmit={submit}>
        <div className="login-head">
          <span className="seal" aria-hidden="true">
            量
          </span>
          <div>
            <span className="eyebrow">USAGE DASHBOARD</span>
            <h1 className="login-title">管理后台登录</h1>
          </div>
        </div>

        {error ? <p className="notice login-error">{error}</p> : null}

        <label className="login-field">
          <span>用户名</span>
          <input
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>

        <label className="login-field">
          <span>密码</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="refresh login-submit" type="submit" disabled={pending}>
          {pending ? "登录中…" : "登录"}
        </button>
      </form>
    </div>
  );
}
