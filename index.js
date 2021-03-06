import { watch, ref, reactive, toRaw, computed, isReactive, isRef, onUnmounted } from 'vue'
import hash from 'object-hash'

const state = {
  resources: reactive({})
}

const instances = {}

function unreact (obj) {
  let clone = JSON.parse(JSON.stringify(obj))
  if (isReactive(clone)) {
    clone = toRaw(clone)
  } else if (isRef(clone)) {
    clone = clone._value
  }

  if (typeof clone === 'object' && clone !== null) {
    Object.keys(clone).map((key) => {
      if (key === '__v_isRef') {
        delete clone[key]
        return
      }
      clone[key] = unreact(clone[key])
    })
  }

  return clone
}

export function createResource (name, fetchPageFn, opts) {
  state.resources[name] = {
    lastFetched: null,
    registry: reactive({}),
    fn: fetchPageFn
  }

  instances[name] = {}
}

export function resource (name) {
  if (!state.resources[name]) throw new Error(`No resource with the name \`${name}\` found`)

  return {
    refresh () {
      Object.keys(state.resources[name].registry).forEach(key => delete state.resources[name].registry[key])
      Object.values(instances[name]).forEach(({ page, pageSize, args }) => {
        fetchData(name, { page, pageSize, args })
      })
    },
    async fetchRange ({ page = 1, pageSize = 10, args = null }) {
      const partition = getPartition(name, { page, pageSize, args })
      if (!partition || partition.includes(undefined)) {
        const items = await fetchData(name, { page, pageSize, args })
        return items
      }

      return partition
    }
  }
}

async function fetchData (nameOrFn, { page, pageSize, args = null, localRegistry = null }) {
  const cleanArgs = unreact(args)
  const fetcher = typeof nameOrFn === 'function' ? nameOrFn : state.resources[nameOrFn].fn
  const registryKey = cleanArgs ? hash(cleanArgs) : 'default'
  const registry = typeof nameOrFn === 'function' ? localRegistry : state.resources[nameOrFn].registry
  const offset = page * pageSize - pageSize

  if (instances[nameOrFn]) {
    instances[nameOrFn][registryKey] = {
      args: cleanArgs,
      page,
      pageSize
    }
  }

  const result = await fetcher({ page, pageSize, args: cleanArgs })

  if (result === false) return false

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
  const registryKey = args ? hash(unreact(args)) : 'default'
  const registry = typeof nameOrFn === 'function' ? localRegistry : state.resources[nameOrFn].registry
  const offset = page * pageSize - pageSize

  if (!registry[registryKey]) return null

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
    return opts.args ? hash(unreact(opts.args)) : 'default'
  }

  const total = computed(() => {
    if (!getRegistry()[getRegistryKey()]) return 1
    return getRegistry()[getRegistryKey()].length
  })
  const totalPages = computed(() => {
    return Math.ceil(total.value / pageSize.value)
  })

  const _page = ref(null)
  const page = computed({
    get: () => _page.value,
    set: (v) => { _page.value = Math.min(Math.max(v, 1), totalPages.value) }
  })
  const pageSize = ref(null)

  const offset = computed(() => {
    if (page.value === null || pageSize.value === null) return 0
    return page.value * pageSize.value - pageSize.value
  })
  const items = computed(() => {
    if (!getRegistry() || getRegistry().length === 0) return []

    // eslint-disable-next-line
    const key = getRegistryKey() // somehow it only tracks our changes if this is here

    if (!getRegistry()[getRegistryKey()]) return []
    const partition = getRegistry()[getRegistryKey()].slice(offset.value, offset.value + pageSize.value)
    if (partition.includes(undefined)) return []

    return partition
  })

  const loading = ref(false)

  watch([page, pageSize, args], async () => {
    if (typeof nameOrFn === 'string' && !state.resources[nameOrFn]) return

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
      args,
      localRegistry
    })
    if (!partition || partition.includes(undefined)) return wrapFetchData()
  })

  page.value = opts.page || 1
  pageSize.value = opts.pageSize || 10

  onUnmounted(() => {
    if (!instances[nameOrFn]) return
    delete instances[nameOrFn]
  })

  return reactive({
    page,
    pageSize,
    items,
    loading,
    total,
    totalPages
  })
}
