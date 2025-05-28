<template>
  <div class="parent-home-page">
    <!-- Error -->
    <div v-if="error" class="alert alert-danger text-center">{{ error }}</div>

    <!-- Header -->
    <header class="header">
      <div class="container">
        <div class="d-flex justify-content-between align-items-center py-3">
          <h2 class="text-orange mb-0">Найдите занятия для вашего ребёнка</h2>
          <div>
            <router-link v-if="!isAuthenticated" to="/register" class="btn btn-green me-2">Регистрация</router-link>
            <router-link v-if="!isAuthenticated" to="/login" class="btn btn-outline-orange">Вход</router-link>
            <router-link v-if="isAuthenticated" to="/parent" class="btn btn-green">Личный кабинет</router-link>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="hero-section text-center">
      <div class="hero-overlay">
        <h1 class="display-4 text-white mb-4 animate__animated animate__fadeInDown">
          Добро пожаловать на платформу для детских занятий!
        </h1>
        <p class="lead text-white mb-5 animate__animated animate__fadeInUp">
          Найдите лучшие кружки и секции для ваших детей в пару кликов.
        </p>
        <div class="search-form container animate__animated animate__fadeInUp">
          <div class="row g-3 align-items-end">
            <div class="col-md-2">
              <label for="age" class="form-label text-white">Возраст</label>
              <input type="number" v-model="filters.age" id="age" class="form-control" placeholder="1–16" min="1" max="16" />
            </div>
            <div class="col-md-2">
              <label for="gender" class="form-label text-white">Пол</label>
              <select v-model="filters.gender" id="gender" class="form-select">
                <option value="none">Любой</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </div>
            <div class="col-md-2">
              <label for="category" class="form-label text-white">Категория</label>
              <select v-model="filters.category" id="category" class="form-select">
                <option value="">Все категории</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>
            <div class="col-md-2">
              <label for="city" class="form-label text-white">Город</label>
              <input type="text" v-model="filters.city" id="city" class="form-control" placeholder="Например, Москва" />
            </div>
            <div class="col-md-2">
              <label for="format" class="form-label text-white">Формат</label>
              <select v-model="filters.format" id="format" class="form-select">
                <option value="">Все форматы</option>
                <option value="group">Групповой</option>
                <option value="individual">Индивидуальный</option>
                <option value="online">Онлайн</option>
              </select>
            </div>
            <div class="col-md-2">
              <button @click="searchClasses" class="btn btn-orange w-100">Найти</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Map Section -->
    <section class="map-section container py-5">
      <h3 class="text-center mb-4 text-orange">Центры рядом с вами</h3>
      <div id="map" style="height: 400px;"></div>
    </section>

    <!-- Categories Section -->
    <section class="categories-section container py-5">
      <h3 class="text-center mb-4 text-orange">Популярные категории</h3>
      <div class="row">
        <div v-for="category in categories" :key="category.id" class="col-md-3 mb-4 animate__animated animate__fadeIn">
          <div class="card shadow-lg p-4 text-center bg-green-light">
            <h4>{{ category.name }}</h4>
            <button @click="selectCategory(category.id)" class="btn btn-orange mt-2">
              Посмотреть занятия
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Classes Section -->
    <section class="classes-section container py-5">
      <h3 class="text-center mb-4 text-orange">Рекомендуемые занятия</h3>
      <div v-if="loadingClasses" class="text-center">
        <p>Загрузка занятий...</p>
      </div>
      <div v-else class="row">
        <div v-for="cls in filteredClasses" :key="cls.id" class="col-md-4 mb-4 animate__animated animate__zoomIn">
          <div class="card shadow-lg p-4">
            <h4>{{ cls.subject }}</h4>
            <p><strong>Центр:</strong> <router-link :to="`/center/${cls.center_id}`">{{ cls.center_name }}</router-link></p>
            <p><strong>Возраст:</strong> {{ cls.min_age }}–{{ cls.max_age }} лет</p>
            <p><strong>Формат:</strong> {{ formatClassType(cls.class_type) }}</p>
            <p><strong>Расписание:</strong> {{ formatDate(cls.schedule) }}</p>
            <p><strong>Цена:</strong> {{ cls.price }} руб.</p>
            <p><strong>Учитель:</strong> {{ cls.teacher_name || 'Не указан' }}</p>
            <p><strong>Рейтинг центра:</strong> {{ cls.center_rating || 'Нет отзывов' }}</p>
            <router-link :to="`/class/${cls.id}`" class="btn btn-green mt-2">Подробнее</router-link>
          </div>
        </div>
        <div v-if="!filteredClasses.length" class="text-center text-muted">
          Занятия не найдены. Попробуйте изменить фильтры.
        </div>
      </div>
    </section>

    <!-- Reviews Section -->
    <section class="reviews-section container py-5">
      <h3 class="text-center mb-4 text-orange">Отзывы родителей</h3>
      <div v-if="loadingReviews" class="text-center">
        <p>Загрузка отзывов...</p>
      </div>
      <div v-else id="reviewsCarousel" class="carousel slide" data-bs-ride="carousel" data-bs-interval="5000">
        <div class="carousel-inner">
          <div v-for="(review, index) in reviews" :key="review.id" class="carousel-item" :class="{ active: index === 0 }">
            <div class="card shadow-sm p-4 text-center bg-green-light">
              <p class="review-text">"{{ review.content }}"</p>
              <p class="review-author">— {{ review.parent_name || 'Аноним' }}, {{ formatDate(review.created_at) }}</p>
            </div>
          </div>
          <div v-if="!reviews.length" class="carousel-item active">
            <div class="card shadow-sm p-4 text-center bg-green-light">
              <p class="review-text">Отзывы временно отсутствуют.</p>
            </div>
          </div>
        </div>
        <button class="carousel-control-prev" type="button" data-bs-target="#reviewsCarousel" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Предыдущий</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#reviewsCarousel" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Следующий</span>
        </button>
      </div>
      <p class="text-center mt-4">
        Хотите поделиться своим мнением? <router-link to="/parent" class="text-orange fw-bold">Войдите</router-link>, чтобы оставить отзыв!
      </p>
    </section>

    <!-- Footer -->
    <footer class="footer py-4 text-center">
      <p class="mb-0">© 2025 Платформа детских занятий. Все права защищены.</p>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import * as L from 'leaflet';

// Types
interface Category {
  id: number;
  name: string;
}

interface Class {
  id: number;
  subject: string;
  center_id: number;
  center_name: string;
  min_age: number;
  max_age: number;
  class_type: string;
  schedule: string;
  price: number;
  teacher_name?: string;
  center_rating?: number;
}

interface Review {
  id: number;
  content: string;
  parent_name?: string;
  created_at: string;
}

interface Center {
  id: number;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

interface Filters {
  age: string;
  gender: string;
  category: string;
  city: string;
  format: string;
}

// State
const router = useRouter();
const categories = ref<Category[]>([]);
const classes = ref<Class[]>([]);
const reviews = ref<Review[]>([]);
const centers = ref<Center[]>([]);
const filters = ref<Filters>({
  age: '',
  gender: 'none',
  category: '',
  city: '',
  format: '',
});
const error = ref<string | null>(null);
const loadingClasses = ref(false);
const loadingReviews = ref(false);
const isAuthenticated = ref(false);
const map = ref<L.Map | null>(null);

// Computed
const filteredClasses = computed(() => classes.value.slice(0, 6));

// Methods
const fetchCategories = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/categories');
    categories.value = response.data;
  } catch (err) {
    console.error('Error fetching categories:', err);
    error.value = 'Не удалось загрузить категории';
  }
};

const fetchClasses = async () => {
  loadingClasses.value = true;
  try {
    const params: Record<string, any> = {};
    if (filters.value.age) params.age = filters.value.age;
    if (filters.value.gender !== 'none') params.gender = filters.value.gender;
    if (filters.value.category) params.category_id = filters.value.category;
    if (filters.value.city) params.city = filters.value.city;
    if (filters.value.format) params.class_type = filters.value.format;

    const response = await axios.get('http://localhost:3000/api/classes/public', { params });
    classes.value = response.data;
  } catch (err) {
    console.error('Error fetching classes:', err);
    error.value = 'Не удалось загрузить занятия';
  } finally {
    loadingClasses.value = false;
  }
};

const fetchReviews = async () => {
  loadingReviews.value = true;
  try {
    const response = await axios.get('http://localhost:3000/api/reviews');
    reviews.value = response.data;
  } catch (err) {
    console.error('Error fetching reviews:', err);
    error.value = 'Не удалось загрузить отзывы';
  } finally {
    loadingReviews.value = false;
  }
};

const fetchCenters = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/centers');
    centers.value = response.data;
    initMap();
  } catch (err) {
    console.error('Error fetching centers:', err);
    error.value = 'Не удалось загрузить центры';
  }
};

const checkAuth = async () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const response = await axios.get('http://localhost:3000/api/auth/validate', {
        headers: { Authorization: `Bearer ${token}` },
      });
      isAuthenticated.value = response.data.valid;
    } catch (err) {
      isAuthenticated.value = false;
      localStorage.removeItem('token');
    }
  }
};

const searchClasses = () => {
  router.push({
    path: '/search',
    query: {
      age: filters.value.age || undefined,
      gender: filters.value.gender !== 'none' ? filters.value.gender : undefined,
      category_id: filters.value.category || undefined,
      city: filters.value.city || undefined,
      class_type: filters.value.format || undefined,
    },
  });
};

const selectCategory = (categoryId: number) => {
  filters.value.category = categoryId.toString();
  searchClasses();
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatClassType = (type: string) => {
  const types: { [key: string]: string } = {
    group: 'Групповой',
    individual: 'Индивидуальный',
    online: 'Онлайн',
  };
  return types[type] || type;
};

const initMap = () => {
  if (map.value) map.value.remove();
  map.value = L.map('map').setView([55.7558, 37.6173], 10); // Moscow default
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map.value);

  centers.value.forEach(center => {
    if (center.latitude && center.longitude) {
      L.marker([center.latitude, center.longitude])
        .addTo(map.value!)
        .bindPopup(`<b>${center.name}</b><br>${center.address}<br><a href="/center/${center.id}">Подробнее</a>`);
    }
  });
};

// Lifecycle
onMounted(() => {
  checkAuth();
  fetchCategories();
  fetchClasses();
  fetchReviews();
  fetchCenters();
});
</script>

<style scoped>
.parent-home-page {
  min-height: 100vh;
  background-color: #f7f1e9;
  font-family: 'Roboto', sans-serif;
}

.header {
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.hero-section {
  background-image: url('https://images.unsplash.com/photo-1516321497487-e288fb19713f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80');
  background-size: cover;
  background-position: center;
  height: 500px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-overlay {
  background-color: rgba(0, 0, 0, 0.5);
  padding: 40px;
  border-radius: 15px;
  width: 100%;
}

.hero-section h1 {
  font-size: 3rem;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.hero-section p {
  font-size: 1.5rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
}

.search-form {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 10px;
}

.form-control,
.form-select {
  border: 2px solid #90be6d;
  border-radius: 10px;
  font-size: 1.1rem;
}

.form-label {
  font-weight: 500;
}

.btn-orange {
  background-color: #ffca99;
  color: #333;
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 1.1rem;
  transition: background-color 0.3s ease, transform 0.3s ease;
}

.btn-orange:hover {
  background-color: #f4a261;
  transform: scale(1.05);
}

.btn-green {
  background-color: #90be6d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 1.1rem;
  transition: background-color 0.3s ease, transform 0.3s ease;
}

.btn-green:hover {
  background-color: #79a259;
  transform: scale(1.05);
}

.btn-outline-orange {
  border: 2px solid #ffca99;
  color: #f4a261;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 1.1rem;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.btn-outline-orange:hover {
  background-color: #f4a261;
  color: white;
}

.map-section h3,
.categories-section h3,
.classes-section h3,
.reviews-section h3 {
  font-size: 2.5rem;
  font-weight: bold;
  color: #f4a261;
}

.bg-green-light {
  background-color: #c3e4a8;
}

.card {
  border: 2px solid #90be6d;
  border-radius: 15px;
  background-color: #fff;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
}

.card h4 {
  font-size: 1.8rem;
  color: #f4a261;
}

.card p {
  font-size: 1.2rem;
  color: #333;
}

.reviews-section .carousel-item {
  transition: opacity 0.5s ease-in-out;
}

.review-text {
  font-style: italic;
  color: #555;
  font-size: 1.2rem;
}

.review-author {
  font-weight: bold;
  color: #90be6d;
}

.carousel-control-prev-icon,
.carousel-control-next-icon {
  background-color: #f4a261;
  border-radius: 50%;
  padding: 20px;
}

.footer {
  background-color: #fff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  color: #555;
}

.alert-danger {
  font-size: 1.8rem;
  padding: 20px;
}
</style>