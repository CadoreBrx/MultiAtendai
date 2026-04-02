import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/views/ChatView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/instances',
      name: 'instances',
      component: () => import('@/views/InstancesView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/departaments',
      name: 'departaments',
      component: () => import('@/views/DepartamentsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/crm',
      name: 'crm',
      component: () => import('@/views/CRMView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/schedule',
      name: 'schedule',
      component: () => import('@/views/ScheduleView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/UsersView.vue'),
      meta: { requiresAuth: true }
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.user) {
    return '/login';
  } else if ((to.name === 'login' || to.name === 'register') && auth.user) {
    return '/';
  }
});

export default router;
