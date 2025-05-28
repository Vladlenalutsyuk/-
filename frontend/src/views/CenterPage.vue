<template>
  <div class="center-page">
    <h2>{{ center.name }}</h2>
    <p><strong>Адрес:</strong> {{ center.address }}</p>
    <p><strong>Город:</strong> {{ center.city }}</p>
    <p><strong>Описание:</strong> {{ center.description }}</p>
    <h3>Занятия в центре</h3>
    <div v-if="loading" class="text-center">Загрузка...</div>
    <div v-else class="row">
      <div v-for="cls in classes" :key="cls.id" class="col-md-4 mb-4">
        <div class="card p-4">
          <h4>{{ cls.subject }}</h4>
          <p><strong>Формат:</strong> {{ formatClassType(cls.class_type) }}</p>
          <p><strong>Расписание:</strong> {{ formatDate(cls.schedule) }}</p>
          <router-link :to="`/class/${cls.id}`" class="btn btn-green">Подробнее</router-link>
        </div>
      </div>
      <div v-if="!classes.length" class="text-center text-muted">
        Занятия не найдены.
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const center = ref({});
const classes = ref([]);
const loading = ref(false);

const fetchCenter = async () => {
  loading.value = true;
  try {
    const response = await axios.get(`/api/centers/${route.params.id}`);
    center.value = response.data;
    const classesResponse = await axios.get(`/api/classes/public`, {
      params: { center_id: route.params.id },
    });
    classes.value = classesResponse.data;
  } catch (error) {
    console.error('Error fetching center:', error);
  } finally {
    loading.value = false;
  }
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

onMounted(fetchCenter);
</script>

<style scoped>
.center-page {
  padding: 20px;
  background-color: #f7f1e9;
}
.card {
  border: 2px solid #90be6d;
  border-radius: 15px;
  background-color: #fff;
  transition: transform 0.3s ease;
}
.card:hover {
  transform: translateY(-5px);
}
.btn-green {
  background-color: #90be6d;
  color: white;
  border-radius: 25px;
  padding: 8px 16px;
}
.btn-green:hover {
  background-color: #79a259;
}
h2, h3 {
  color: #f4a261;
}
</style>