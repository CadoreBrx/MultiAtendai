<script setup>
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="min-h-screen bg-[#040406] text-white font-sans selection:bg-indigo-500/30">
    <RouterView />
  </div>
</template>

<style>
/* Reset and Global Base */
:root {
  color-scheme: dark;
}

body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

/* Custom transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
