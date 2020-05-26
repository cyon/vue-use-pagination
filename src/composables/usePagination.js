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

export function usePagination (name, opts) {
  const page = ref(null)
  const pageSize = ref(null)
  const items = ref([])
  const loading = ref(false)
  const total = computed(() => {
    const registryValue = state.resources[name].registry.value
    if (!registryValue) return 0
    return registryValue.length
  })
  const totalPages = computed(() => {
    return Math.ceil(total.value / pageSize.value)
  })

  watch([page, pageSize], async () => {
    const registry = state.resources[name].registry
    const offset = page.value * pageSize.value - pageSize.value

    if (page.value < 1) page.value = 1

    if (state.resources[name].registry.value && totalPages.value < page.value) {
      page.value = totalPages.value
      return
    }

    const fetchData = async () => {
      loading.value = true
      const result = await state.resources[name].fn({ page: page.value, pageSize: pageSize.value })
      if (registry.value === null || result.total !== registry.value.length) registry.value = new Array(result.total)
      result.items.forEach((item, i) => {
        registry.value[offset + i] = item
      })
      items.value = registry.value.slice(offset, offset + pageSize.value)
      loading.value = false
      if (state.resources[name].registry.value && totalPages.value < page.value) page.value = totalPages.value
    }

    if (items.value.length === 0) {
      return fetchData()
    }

    const partition = registry.value.slice(offset, offset + pageSize.value)
    if (partition.includes(undefined)) return fetchData()

    items.value = partition
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
