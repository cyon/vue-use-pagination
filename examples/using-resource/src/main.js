import { createApp } from 'vue'
import App from './App.vue'
import { createResource } from '../../'

const users = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h'
]

createResource('users', async (opts) => {
  await sleep(2000)
  const offset = opts.page * opts.pageSize - opts.pageSize

  return {
    total: users.length,
    items: users.slice(offset, offset + opts.pageSize).map(user => user + opts.args.count.value)
  }
})

function sleep (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

createApp(App).mount('#app')
