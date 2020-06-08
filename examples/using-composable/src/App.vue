<template>
  <div id="app">
    Total Items: {{ users.total }}<br>
    Total Pages: {{ users.totalPages }}<br>
    Loading: {{ users.loading }}<br>
    Items: {{ users.items }}<br>
    Page: {{ users.page }}<br>
    <button @click="users.page--">Previous Page</button>
    <button @click="users.page++">Next Page</button>
    <br><br>
    Count: {{ count }}<br>
    <button @click="count++">Increase Count</button>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { usePagination } from '../../../'

export default {
  name: 'App',
  setup () {
    const count = ref(1)

    const usersArray = [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h'
    ]
    const users = usePagination(async (opts) => {
      const offset = opts.page * opts.pageSize - opts.pageSize

      return {
        total: usersArray.length,
        items: usersArray.slice(offset, offset + opts.pageSize).map(user => user + opts.args.count.value)
      }
    }, {
      page: 1,
      pageSize: 2,
      args: reactive({
        count
      })
    })

    return { users, count }
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
