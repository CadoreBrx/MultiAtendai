import { defineStore } from 'pinia';
import { ref } from 'vue';
import { setToken, clearToken } from '@/services/api';

export const useAuthStore = defineStore('auth', () => {
  const getInitialUser = () => {
    try {
      const data = localStorage.getItem('user');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Auth store: Erro ao parsear usuário do localStorage", e);
      localStorage.removeItem('user');
      return null;
    }
  };

  const getInitialEmpresa = () => {
    try {
      const data = localStorage.getItem('empresa');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      localStorage.removeItem('empresa');
      return null;
    }
  };

  const user = ref(getInitialUser());
  const empresa = ref(getInitialEmpresa());

  function login(userData, empresaData, token) {
    user.value = userData;
    empresa.value = empresaData;
    localStorage.setItem('user', JSON.stringify(userData));
    if (empresaData) {
      localStorage.setItem('empresa', JSON.stringify(empresaData));
    }
    if (token) {
      setToken(token);
    }
  }

  function logout() {
    user.value = null;
    empresa.value = null;
    localStorage.removeItem('user');
    localStorage.removeItem('empresa');
    localStorage.removeItem('chats');
    localStorage.removeItem('activeChat');
    clearToken();
    window.location.href = '/login';
  }

  return { user, empresa, login, logout };
});
