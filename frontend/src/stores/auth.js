import { defineStore } from 'pinia';
import { ref } from 'vue';

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

  const user = ref(getInitialUser());

  function login(userData) {
    user.value = userData;
    localStorage.setItem('user', JSON.stringify(userData));
  }

  function logout() {
    user.value = null;
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  return { user, login, logout };
});
