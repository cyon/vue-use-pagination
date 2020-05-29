# vue-use-pagination

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

**Note: This library only works with Vue 3. For Vue 2, take a look at [vuex-pagination](https://www.github.com/cyon/vuex-pagination).**

This library takes the ideas behind [vuex-pagination](https://www.github.com/cyon/vuex-pagination) and applies them to Vue 3. The result
is a much more lightweight library that is very flexible to use.

## Installation

```bash
// Using npm:
npm install vue-use-pagination

// Or using Yarn:
yarn add vue-use-pagination
```

## Usage

There are basically two different ways how this library can be used and depending on where you want your logic to reside, you can
choose one over another (or combine them).

The traditional way separates the instances (where you display the data) and the resources (the logic that fetches the data).

```javascript
import { createResource } from 'vue-use-pagination'

createResource('users', async (opts) => {
  const result = await window.fetch(`/api/users?page=${opts.page}&pageSize=${opts.pageSize}`)
  const data = await result.json()

  return {
    total: data.total,
    items: data.data
  }
})
```

And in your component it can be used like that:

```javascript
import { usePagination } from 'vue-use-pagination'

export default {
  setup () {
    const users = usePagination('users', { page: 1, pageSize: 10 })

    return { users }
  }
}
```

Alternatively you can just drop the `createResource` call and instead just pass the fetcher function to `usePagination`:

```javascript
const users = usePagination(async (opts) => {
  const result = await window.fetch(`/api/users?page=${opts.page}&pageSize=${opts.pageSize}`)
  const data = await result.json()

  return {
    total: data.total,
    items: data.data
  }
}, { page: 1, pageSize: 10 })
```

This allows you to create your own composition functions:

```javascript
useUsers ({ page = 1, pageSize = 10 }) {
  const fetch = async (opts) => {
    const result = await window.fetch(`/api/users?page=${opts.page}&pageSize=${opts.pageSize}`)
    const data = await result.json()

    return {
      total: data.total,
      items: data.data
    }
  }

  return usePagination(fetch, { page, pageSize })
}
