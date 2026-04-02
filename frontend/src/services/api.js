// Central API helper — todas as chamadas passam por aqui
const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Retorna a base URL da API.
 * Em produção com Nginx, VITE_API_URL = "" (proxy relativo).
 * Em dev local, VITE_API_URL = "http://localhost:3000".
 */
export function apiUrl(path) {
    return `${API_URL}${path}`;
}

/**
 * Retorna o token JWT salvo no localStorage.
 */
export function getToken() {
    return localStorage.getItem('token');
}

/**
 * Salva o token JWT no localStorage.
 */
export function setToken(token) {
    localStorage.setItem('token', token);
}

/**
 * Remove o token JWT do localStorage.
 */
export function clearToken() {
    localStorage.removeItem('token');
}

/**
 * Fetch wrapper com autenticação JWT automática.
 * Redireciona para /login se receber 401.
 */
export async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Não sobrescreve Content-Type se for FormData (para upload de arquivos)
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(apiUrl(path), {
        ...options,
        headers,
    });

    if (response.status === 401) {
        clearToken();
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Sessão expirada');
    }

    return response;
}

/**
 * URL base do WebSocket (para Socket.io).
 */
export function socketUrl() {
    return API_URL || window.location.origin;
}
