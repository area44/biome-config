<script setup>
  import { ref } from "vue";

  const count = ref(0);
  const increment = () => {
    count.value++;
  };
</script>

<template>
  <div class="counter">
    <p>Current count: {{ count }}</p>
    <button type="button" @click="increment">Increment</button>
  </div>
</template>

<style scoped>
  .counter {
    padding: 1rem;
  }
</style>
