<template>
  <div id="app">
    Total Items: {{ users.total }}<br>
    Total Pages: {{ users.totalPages }}<br>
    Loading: {{ users.loading }}<br>
    Items: {{ users.items }}<br>
    Page: {{ users.page }}<br>
    <button @click="users.page--">Previous Page</button>
    <button @click="users.page++">Next Page</button>
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
