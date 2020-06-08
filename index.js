import { watch, ref, reactive, toRaw, computed } from 'vue'
import hash from 'object-hash'

const state = {
  resources: reactive({})
}

export function createResource (name, fetchPageFn, opts) {
  state.resources[name] = {
    lastFetched: null,
    registry: reactive({}),
    fn: fetchPageFn
  }
}

export function resource (name) {
  if (!state.resources[name]) throw new Error(`No resource with the name \`${name}\` found`)

  return {
    refresh () {
      Object.keys(state.resources[name].registry).forEach(key => delete state.resources[name].registry[key])
    },
    async fetchRange ({ page = 1, pageSize = 10, args = null }) {
    }
  }
}

async function fetchData (nameOrFn, { page, pageSize, args = null, localRegistry = null }) {
  const fetcher = typeof nameOrFn === 'function' ? nameOrFn : state.resources[nameOrFn].fn
  const registryKey = args ? hash(args) : 'default'
  const registry = typeof nameOrFn === 'function' ? localRegistry : state.resources[nameOrFn].registry
  const offset = page * pageSize - pageSize

  const result = await fetcher({ page, pageSize, args })
  if (!registry[registryKey] || result.total !== registry[registryKey].length) {
    registry[registryKey] = new Array(result.total)
  }
  const items = result.items || result.data
  if (!items) {
    throw new Error('No `items` found in result')
  }

  items.forEach((item, i) => {
    registry[registryKey][offset + i] = item
  })

  return items
}

function getPartition (nameOrFn, { page, pageSize, args = null, localRegistry = null }) {
  const registryKey = args ? hash(args) : 'default'
  const registry = typeof nameOrFn === 'function' ? localRegistry : state.resources[nameOrFn].registry
  const offset = page * pageSize - pageSize

  return registry[registryKey].slice(offset, offset + pageSize)
}

export function usePagination (nameOrFn, opts) {
  const localRegistry = reactive({})
  const args = opts.args || ref(null)

  const getRegistry = () => {
    if (typeof nameOrFn === 'function') {
      return localRegistry
    }
    if (state.resources[nameOrFn]) {
      return state.resources[nameOrFn].registry
    }
    return ref(null)
  }

  const getRegistryKey = () => {
    return opts.args ? hash(toRaw(opts.args)) : 'default'
  }

  const page = ref(null)
  const pageSize = ref(null)

  const offset = computed(() => {
    if (page.value === null || pageSize.value === null) return 0
    return page.value * pageSize.value - pageSize.value
  })
  const items = computed(() => {
    if (!getRegistry() || getRegistry().length === 0) return []

    if (!getRegistry()[getRegistryKey()]) return []
    const partition = getRegistry()[getRegistryKey()].slice(offset.value, offset.value + pageSize.value)
    if (partition.includes(undefined)) return []

    return partition
  })

  const loading = ref(false)
  const total = computed(() => {
    if (!getRegistry()[getRegistryKey()]) return 1
    return getRegistry()[getRegistryKey()].length
  })
  const totalPages = computed(() => {
    return Math.ceil(total.value / pageSize.value)
  })

  watch([page, pageSize, args, state.resources], async () => {
    if (typeof nameOrFn === 'string' && !state.resources[nameOrFn]) return

    if (page.value < 1) {
      page.value = 1
      return
    }

    if (getRegistry()[getRegistryKey()] && totalPages.value < page.value) {
      page.value = totalPages.value
      return
    }

    const wrapFetchData = async () => {
      loading.value = true
      try {
        await fetchData(nameOrFn, {
          page: page.value,
          pageSize: pageSize.value,
          args: opts.args ? toRaw(opts.args) : null,
          localRegistry
        })
      } catch (err) {
        loading.value = false
        if (process.env.NODE_ENV === 'development') console.error('Error occured', err)
      }

      loading.value = false
      if (getRegistry()[getRegistryKey()] && totalPages.value < page.value) page.value = totalPages.value
    }

    if (!getRegistry()[getRegistryKey()] || getRegistry()[getRegistryKey()].length === 0) {
      return wrapFetchData()
    }

    const partition = getPartition(nameOrFn, {
      page: page.value,
      pageSize: pageSize.value,
      args: args ? toRaw(args) : null,
      localRegistry
    })
    if (partition.includes(undefined)) return wrapFetchData()
  })

  page.value = opts.page || 1
  pageSize.value = opts.pageSize || 10

  return {
    page,
    pageSize,
    items,
    loading,
    total,
    totalPages
  }
}
