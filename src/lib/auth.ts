/** 管理后台登录态：localStorage 里的签名 token + 401 全局通知。 */

const TOKEN_KEY = "admin-web:token";
const USERNAME_KEY = "admin-web:username";
const UNAUTHORIZED_EVENT = "admin-web:unauthorized";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY);
}

export function saveSession(token: string, username: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

/** 统计接口返回 401 时由 fetch 封装调用：清掉本地登录态并广播。 */
export function notifyUnauthorized(): void {
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

/** 布局组件订阅 401 事件，收到后跳转登录页。返回退订函数。 */
export function onUnauthorized(handler: () => void): () => void {
  window.addEventListener(UNAUTHORIZED_EVENT, handler);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
}
