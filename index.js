import { watch, ref, reactive, toRaw, computed } from 'vue'
import hash from 'object-hash'

const state = {
  resources: {}
}

export function createResource (name, fetchPageFn, opts) {
  state.resources[name] = {
    lastFetched: null,
    registry: reactive({}),
    fn: fetchPageFn
  }
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

  const getFetcherFn = () => {
    if (typeof nameOrFn === 'function') return nameOrFn
    if (state.resources[nameOrFn]) return state.resources[nameOrFn].fn
    return null
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

  watch([page, pageSize, args], async () => {
    if (typeof nameOrFn === 'string' && !state.resources[nameOrFn]) return

    if (page.value < 1) {
      page.value = 1
      return
    }

    if (getRegistry()[getRegistryKey()] && totalPages.value < page.value) {
      page.value = totalPages.value
      return
    }

    const fetchData = async () => {
      loading.value = true
      const result = await getFetcherFn()({ page: page.value, pageSize: pageSize.value, args: opts.args ? toRaw(opts.args) : null })
      if (!getRegistry()[getRegistryKey()] || result.total !== getRegistry()[getRegistryKey()].length) {
        getRegistry()[getRegistryKey()] = new Array(result.total)
      }
      result.items.forEach((item, i) => {
        getRegistry()[getRegistryKey()][offset.value + i] = item
      })
      loading.value = false
      if (getRegistry()[getRegistryKey()] && totalPages.value < page.value) page.value = totalPages.value
    }

    if (!getRegistry()[getRegistryKey()] || getRegistry()[getRegistryKey()].length === 0) {
      return fetchData()
    }

    const partition = getRegistry()[getRegistryKey()].slice(offset.value, offset.value + pageSize.value)
    if (partition.includes(undefined)) return fetchData()
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
