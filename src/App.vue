<template>
  <div id="app">
    Total Items: {{ users.total }}<br>
    Total Pages: {{ users.totalPages }}<br>
    Loading: {{ users.loading }}<br>
    {{ users.items }}
    {{ users.page }}
    <button @click="users.page++">Increase</button>
  </div>
</template>

<script>
import { usePagination } from './composables/usePagination'

export default {
  name: 'App',
  setup () {
    const users = usePagination('users', { page: 1, pageSize: 2 })

    return { users }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
