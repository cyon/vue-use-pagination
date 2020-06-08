import { createApp } from 'vue'
import App from './App.vue'
import { createResource } from '../../../'

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
  const count = opts.args.count.value || opts.args.count

  return {
    total: users.length,
    items: users.slice(offset, offset + opts.pageSize).map(user => user + count)
  }
})

function sleep (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

createApp(App).mount('#app')
