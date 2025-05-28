<template>
  <div class="class-page">
    <h2>Детали занятия</h2>
    <p>Идентификатор занятия: {{ id }}</p>
    <p>Страница в разработке...</p>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';

const route = useRoute();
const id = route.params.id;
</script>

<style scoped>
.class-page {
  padding: 20px;
  background-color: #f7f1e9;
}
h2 {
  color: #f4a261;
}
</style>