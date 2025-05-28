<template>
  <div class="register-page">
    <div class="form-container card shadow-lg p-4">
      <h1 class="mb-4 text-center text-success">Регистрация</h1>
      <form @submit.prevent="register">
        <div class="mb-3">
          <label for="username" class="form-label">Имя пользователя</label>
          <input
            v-model.trim="username"
            type="text"
            id="username"
            class="form-control"
            required
            placeholder="Введите имя пользователя"
          />
        </div>
        <div class="mb-3">
          <label for="email" class="form-label">Электронная почта</label>
          <input
            v-model.trim="email"
            type="email"
            id="email"
            class="form-control"
            required
            placeholder="example@domain.com"
          />
        </div>
        <div class="mb-3">
          <label for="password" class="form-label">Пароль</label>
          <input
            v-model="password"
            type="password"
            id="password"
            class="form-control"
            required
            placeholder="Введите пароль"
          />
        </div>
        <div class="mb-3">
          <label for="phone" class="form-label">Телефон</label>
          <input
            v-model="phone"
            type="text"
            id="phone"
            class="form-control"
            required
            placeholder="+1234567890"
            @input="validatePhone"
          />
          <small v-if="phoneError" class="text-danger">{{ phoneError }}</small>
        </div>
        <button
          type="submit"
          class="btn btn-dark-green w-100 mt-3"
          :disabled="isLoading || !!phoneError"
        >
          {{ isLoading ? 'Регистрация...' : 'Зарегистрироваться' }}
        </button>
        <p class="mt-3 text-center">
          Уже есть аккаунт? <router-link to="/login" class="text-success fw-bold">Войти</router-link>
        </p>
        <p class="mt-3 text-center">
          <router-link to="/" class="btn btn-outline-success">Вернуться на главную страницу</router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      username: '',
      email: '',
      password: '',
      phone: '',
      phoneError: null,
      isLoading: false,
    };
  },
  methods: {
    validatePhone() {
      console.log('Валидация телефона:', this.phone); // Отладка
      const phonePattern = /^\+\d{10,15}$/;
      if (!this.phone) {
        this.phoneError = 'Поле "Телефон" обязательно';
      } else if (!phonePattern.test(this.phone)) {
        this.phoneError = 'Введите номер телефона в формате +1234567890 (10-15 цифр)';
      } else {
        this.phoneError = null;
      }
      console.log('phoneError:', this.phoneError); // Отладка
    },
    showToast(message, type = 'error') {
      if (this.$toast) {
        this.$toast[type](message, { timeout: 5000 });
      } else {
        console[type === 'error' ? 'error' : 'log'](`Toast (${type}): ${message}`);
        alert(message);
      }
    },
    async register() {
      console.log('Попытка регистрации:', { username: this.username, email: this.email, phone: this.phone });
      if (!this.username || !this.email || !this.password || !this.phone) {
        this.showToast('Все поля обязательны');
        return;
      }
      if (this.phoneError) {
        this.showToast(this.phoneError);
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        this.showToast('Введите корректный email');
        return;
      }
      if (this.username.length > 50) {
        this.showToast('Имя пользователя не должно превышать 50 символов');
        return;
      }
      if (this.email.length > 100) {
        this.showToast('Email не должен превышать 100 символов');
        return;
      }

      this.isLoading = true;
      const userData = {
        username: this.username,
        email: this.email,
        password: this.password,
        phone: this.phone,
      };
      console.log('Данные для регистрации:', userData);

      try {
        const response = await axios.post('http://localhost:3000/api/register', userData);
        console.log('Ответ сервера:', response.data);
        this.showToast('Регистрация прошла успешно! Войдите в систему.', 'success');
        this.$router.push('/login');
      } catch (error) {
        console.error('Ошибка при регистрации:', error.response?.data || error.message);
        const errorMessage =
          error.response?.data?.error || 'Ошибка при регистрации. Попробуйте снова.';
        this.showToast(errorMessage);
      } finally {
        this.isLoading = false;
      }
    },
  },
  watch: {
    phone: 'validatePhone',
  },
  mounted() {
    this.validatePhone();
  },
};
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  background-color: #d5f7d5;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Comic Sans MS', 'Segoe UI', sans-serif;
}

.form-container {
  width: 100%;
  max-width: 500px;
  background-color: #fff;
  border-radius: 1rem;
}

.btn-dark-green {
  background-color: #2e7d32;
  color: white;
  border: none;
  transition: background-color 0.3s ease;
}

.btn-dark-green:hover {
  background-color: #256528;
}

.btn-dark-green:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>