<template>
  <div class="search-results-page">
    <h2>Результаты поиска</h2>
    <p>Параметры поиска: {{ query }}</p>
    <p>Страница в разработке...</p>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';

const route = useRoute();
const query = route.query;
</script>

<style scoped>
.search-results-page {
  padding: 20px;
  background-color: #f7f1e9;
}
h2 {
  color: #f4a261;
}
</style>