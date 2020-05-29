import { watch, ref, computed } from 'vue'

const state = {
  resources: {}
}

export function createResource (name, fetchPageFn, opts) {
  state.resources[name] = {
    lastFetched: null,
    registry: ref(null),
    fn: fetchPageFn
  }
}

export function usePagination (nameOrFn, opts) {
  const localRegistry = ref(null)

  const getRegistry = () => {
    if (typeof nameOrFn === 'function') {
      return localRegistry
    }
    if (state.resources[nameOrFn]) {
      return state.resources[nameOrFn].registry
    }
    return ref(null)
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
    if (!getRegistry().value || getRegistry().value.length === 0) return []

    const partition = getRegistry().value.slice(offset.value, offset.value + pageSize.value)
    if (partition.includes(undefined)) return []

    return partition
  })

  const loading = ref(false)
  const total = computed(() => {
    if (!getRegistry().value) return 0
    return getRegistry().value.length
  })
  const totalPages = computed(() => {
    return Math.ceil(total.value / pageSize.value)
  })

  watch([page, pageSize], async () => {
    if (typeof nameOrFn === 'string' && !state.resources[nameOrFn]) return

    if (page.value < 1) {
      page.value = 1
      return
    }

    if (getRegistry().value && totalPages.value < page.value) {
      page.value = totalPages.value
      return
    }

    const fetchData = async () => {
      loading.value = true
      const result = await getFetcherFn()({ page: page.value, pageSize: pageSize.value })
      if (getRegistry().value === null || result.total !== getRegistry().value.length) getRegistry().value = new Array(result.total)
      result.items.forEach((item, i) => {
        getRegistry().value[offset.value + i] = item
      })
      loading.value = false
      if (getRegistry().value && totalPages.value < page.value) page.value = totalPages.value
    }

    if (!getRegistry().value || getRegistry().value.length === 0) {
      return fetchData()
    }

    const partition = getRegistry().value.slice(offset.value, offset.value + pageSize.value)
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
