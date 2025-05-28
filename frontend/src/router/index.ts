import { createRouter, createWebHistory } from 'vue-router';
import ParentPage from '../views/ParentPage.vue';
import TeacherPage from '../views/TeacherPage.vue';
import AdminPage from '../views/AdminPage.vue';
import RegisterPage from '../views/RegisterPage.vue';
import LoginPage from '../views/LoginPage.vue';
import ParentHomePage from '../views/ParentHome.vue';
import type { RouteRecordRaw } from 'vue-router';
import axios, { AxiosError } from 'axios';

axios.defaults.baseURL = 'http://localhost:3000';

const routes: RouteRecordRaw[] = [
  { path: '/', component: ParentHomePage },
  { path: '/parent', component: ParentPage, meta: { requiresAuth: true, role: 'parent' } },
  { path: '/teacher', component: TeacherPage, meta: { requiresAuth: true, role: 'teacher' } },
  { path: '/admin', component: AdminPage, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/register', component: RegisterPage },
  { path: '/login', component: LoginPage },
  { path: '/center/:id', component: () => import('../views/CenterPage.vue') },
  { path: '/class/:id', component: () => import('../views/ClassPage.vue') },
  { path: '/search', component: () => import('../views/SearchResults.vue') },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');
  console.log('Checking user:', user);
  console.log('Checking token:', token);

  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!user || !token) {
      console.log('No auth or token, redirecting to /login');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      next({ path: '/login' });
      return;
    }

    try {
      const response = await axios.get('/api/auth/validate', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.data.valid) {
        console.log('Invalid token, redirecting to /login');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        next({ path: '/login' });
        return;
      }

      const userRole = response.data.role;

      if (to.meta.role && to.meta.role !== userRole) {
        console.log('Role mismatch:', to.meta.role, userRole);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        next({ path: '/login' });
        return;
      }

      console.log('Proceeding to route:', to.path);
      next();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error(
        'Token validation error:',
        error.response?.data?.error || error.message || 'Unknown error'
      );
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      next({ path: '/' });
    }
  } else if (to.path === '/login' && user && token) {
    try {
      const response = await axios.get('/api/auth/validate', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.valid) {
        console.log('User already authenticated, redirecting based on role');
        const userRole = response.data.role;
        if (userRole === 'parent') {
          next('/parent');
        } else if (userRole === 'teacher') {
          next('/teacher');
        } else if (userRole === 'admin') {
          next('/admin');
        } else if (userRole === 'center_admin') {
          next('/center-admin');
        } else {
          next();
        }
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        next();
      }
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      console.error(
        'Token validation error on login:',
        error.response?.data?.error || error.message || 'Unknown error'
      );
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      next();
    }
  } else {
    console.log('Unauthenticated navigation');
    next();
  }
});

export default router;