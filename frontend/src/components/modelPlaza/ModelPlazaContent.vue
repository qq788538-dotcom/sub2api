<template>
  <div
    class="model-plaza-page min-w-0 space-y-6"
    :class="
      embedded
        ? ''
        : 'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-dark-700 dark:bg-dark-900 sm:p-6 lg:p-8'
    "
  >
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">找到适合你的模型</h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-dark-400">选择分组，查看每 100 万 tokens 的实际价格。</p>
      </div>
      <RouterLink
        :to="isAuthenticated ? '/keys' : { path: '/login', query: { redirect: '/keys' } }"
        class="plaza-cta inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
      >
        管理 API 密钥 <span aria-hidden="true">↗</span>
      </RouterLink>
    </header>

    <div v-if="loading" class="flex min-h-[240px] items-center justify-center">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-primary-600/25 border-t-primary-600 dark:border-primary-400/25 dark:border-t-primary-400"></div>
    </div>
    <div
      v-else-if="error"
      class="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
    >
      {{ t('modelPlaza.loadFailed') }}
    </div>
    <div
      v-else-if="vendors.length === 0"
      class="rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center text-sm text-gray-500 dark:border-dark-600 dark:text-dark-400"
    >
      {{ t('modelPlaza.empty') }}
    </div>
    <template v-else>
      <!-- 厂商标签：每个标签下列出可用分组数 -->
      <nav class="plaza-tabs flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-dark-700" role="tablist" aria-label="模型厂商">
        <button
          v-for="v in vendors"
          :key="v.key"
          type="button"
          role="tab"
          :aria-selected="v.key === activeVendor"
          class="relative -mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 transition"
          :class="
            v.key === activeVendor
              ? 'border-primary-600 text-gray-900 dark:border-primary-400 dark:text-white'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-dark-400 dark:hover:text-dark-100'
          "
          @click="selectVendor(v.key)"
        >
          <PlatformIcon :platform="v.icon" size="sm" />
          <span class="plaza-tab-label font-medium">{{ v.label }}</span>
          <span class="text-xs text-gray-500 dark:text-dark-400">{{ v.groups.length }} 个可用分组</span>
        </button>
      </nav>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-dark-800/60">
        <strong class="font-semibold text-gray-900 dark:text-white">¥1 = $1 站内余额</strong>
        <span class="text-gray-500 dark:text-dark-400">人民币充值，按本站倍率计费：实付价 = 官方价 × 分组倍率。1M tokens = 100 万 tokens。</span>
      </div>

      <!-- 选择分组 -->
      <section class="space-y-4" aria-labelledby="plaza-pick-group">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="plaza-pick-group" class="text-lg font-semibold text-gray-900 dark:text-white">选择分组</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">同一模型，不同分组对应不同价格。</p>
          </div>
          <div class="inline-flex rounded-lg bg-gray-100 p-1 text-sm dark:bg-dark-800" role="radiogroup" aria-label="价格口径">
            <button
              v-for="opt in priceModes"
              :key="opt.key"
              type="button"
              role="radio"
              :aria-checked="priceMode === opt.key"
              class="rounded-md px-3 py-1.5 transition"
              :class="
                priceMode === opt.key
                  ? 'bg-white font-medium text-gray-900 shadow-sm dark:bg-dark-600 dark:text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:text-dark-400 dark:hover:text-dark-100'
              "
              @click="priceMode = opt.key"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="plaza-group-grid grid gap-3">
          <button
            v-for="g in currentVendor?.groups ?? []"
            :key="g.id"
            type="button"
            :aria-pressed="g.id === activeGroupId"
            class="relative flex min-h-[112px] flex-col items-start rounded-xl border bg-white p-4 text-left transition dark:bg-dark-900"
            :class="
              g.id === activeGroupId
                ? 'border-primary-500 ring-1 ring-primary-500 dark:border-primary-400'
                : 'border-gray-200 hover:border-gray-300 dark:border-dark-700 dark:hover:border-dark-500'
            "
            @click="activeGroupId = g.id"
          >
            <span class="pr-6 font-medium leading-snug text-gray-900 dark:text-white">{{ g.name }}</span>
            <span class="plaza-rate mt-2 font-semibold tabular-nums text-gray-900 dark:text-white">{{ effectiveRate(g) }}×</span>
            <span class="mt-1 text-xs text-gray-500 dark:text-dark-400">
              {{ g.models.length }} 个模型 · {{ g.user_rate_multiplier != null ? '你的专属倍率' : '当前分组倍率' }}
            </span>
            <span
              v-if="g.id === activeGroupId"
              class="absolute right-3 top-3 text-primary-600 dark:text-primary-400"
              aria-hidden="true"
            >✓</span>
          </button>
        </div>
      </section>

      <template v-if="activeGroup">
        <p class="text-sm text-gray-600 dark:text-dark-300">
          <span class="mr-2 font-semibold text-gray-900 dark:text-white">当前分组</span>
          {{ activeGroup.name }} · 创建 API Key 时选择此分组。
        </p>

        <div class="rounded-xl bg-gray-50 px-4 py-4 text-sm dark:bg-dark-800/60">
          <h3 class="font-semibold text-gray-900 dark:text-white">分组说明</h3>
          <p class="mt-2 text-gray-600 dark:text-dark-300">{{ activeGroup.description || '暂无说明。' }}</p>
          <p v-if="activeGroup.is_exclusive" class="mt-1 text-xs text-purple-600 dark:text-purple-400">专属分组，仅对已授权账号开放。</p>
          <p v-if="peakNote" class="mt-1 text-xs text-amber-600 dark:text-amber-400">{{ peakNote }}</p>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <label class="flex min-w-0 items-center gap-3 text-sm font-medium text-gray-700 dark:text-dark-200">
            <span class="shrink-0">搜索模型</span>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="输入模型名称，例如 gpt、sonnet…"
              class="w-64 min-w-0 max-w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-900 dark:text-white"
            />
          </label>
          <span class="text-xs text-gray-500 dark:text-dark-400">
            {{ visibleModels.length }} 个模型 · {{ priceMode === 'paid' ? '人民币实付参考' : '官方参考 · US$' }} / 100 万 tokens
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="plaza-simple-table w-full border-collapse text-sm tabular-nums">
            <thead>
              <tr class="border-b border-gray-200 text-xs text-gray-500 dark:border-dark-700 dark:text-dark-400">
                <th class="py-3 pl-3 pr-4 text-left font-medium">模型 ID</th>
                <th v-for="c in priceColumns" :key="c.key" class="px-3 py-3 text-right font-medium">{{ c.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="m in visibleModels"
                :key="`${m.platform}:${m.name}`"
                class="border-b border-gray-100 last:border-b-0 dark:border-dark-800"
              >
                <td class="py-3.5 pl-3 pr-4 align-top">
                  <div class="font-semibold text-gray-900 dark:text-white">{{ m.name }}</div>
                  <div v-if="modelHint(m)" class="mt-1 text-xs text-gray-500 dark:text-dark-400">{{ modelHint(m) }}</div>
                </td>
                <td v-for="c in priceColumns" :key="c.key" class="px-3 py-3.5 text-right align-top">
                  <template v-if="isTokenModel(m)">
                    <div class="font-semibold text-gray-900 dark:text-white">{{ primaryPrice(m, c.key) }}</div>
                    <div class="mt-1 text-xs text-gray-500 dark:text-dark-400">{{ secondaryPrice(m, c.key) }}</div>
                  </template>
                  <span v-else class="text-gray-400 dark:text-dark-500">—</span>
                </td>
              </tr>
              <tr v-if="visibleModels.length === 0">
                <td :colspan="priceColumns.length + 1" class="py-10 text-center text-gray-500 dark:text-dark-400">
                  {{ t('modelPlaza.noSearchResult') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 dark:text-dark-400">
          <span>输入：你发送的内容</span>
          <span>输出：模型生成的内容</span>
          <span>缓存：复用内容时的计费</span>
          <span>— 表示暂无价格，不代表免费。</span>
        </p>

        <details class="plaza-details border-t border-gray-200 pt-4 dark:border-dark-700">
          <summary class="cursor-pointer text-sm text-gray-500 dark:text-dark-400">
            <span class="font-semibold text-gray-900 dark:text-white">完整计费明细</span>
            <span class="ml-2">长上下文、缓存 1 小时、分时倍率与按次价格（按站内余额 $ 显示，¥1 = $1）</span>
          </summary>
          <div class="mt-4">
            <PlazaGroupSection :group="{ ...activeGroup, models: visibleModels }" />
          </div>
        </details>
      </template>

      <details v-if="descriptionHtml" class="plaza-details border-t border-gray-200 pt-4 dark:border-dark-700">
        <summary class="cursor-pointer text-sm font-semibold text-gray-900 dark:text-white">价格说明</summary>
        <div class="plaza-description mt-3 text-sm" v-html="descriptionHtml"></div>
      </details>

      <p class="text-xs text-gray-500 dark:text-dark-400">
        价格取自本站计费配置。{{ isAuthenticated ? '已按你的分组及专属倍率显示' : '登录后会显示适用于你的分组及专属倍率' }}；实际费用以请求对应的模型、用量和使用记录为准。
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import PlatformIcon from '@/components/common/PlatformIcon.vue'
import PlazaGroupSection from './PlazaGroupSection.vue'
import type { ModelPlazaGroup, ModelPlazaResponse, PlazaModel } from '@/api/modelPlaza'
import { formatScaled } from '@/utils/pricing'
import { BILLING_MODE_TOKEN } from '@/constants/channel'
import { useAuthStore } from '@/stores/auth'
import { groupPlazaVendors, type PlazaVendorKey } from './plazaVendors'

const props = defineProps<{
  response: ModelPlazaResponse | null
  loading: boolean
  error?: boolean
  /** 后台内嵌形态(AppLayout 内);保留调用接口。 */
  embedded?: boolean
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

const descriptionHtml = computed(() => {
  const md = props.response?.description?.trim()
  if (!md) return ''
  return DOMPurify.sanitize(marked.parse(md) as string)
})

/** 生效倍率 = 用户专属倍率 ?? 分组默认倍率。 */
function effectiveRate(g: ModelPlazaGroup): number {
  return g.user_rate_multiplier ?? g.rate_multiplier
}

const vendors = computed(() => groupPlazaVendors(props.response?.groups ?? [], effectiveRate))

const activeVendor = ref<PlazaVendorKey | null>(null)
const activeGroupId = ref<number | null>(null)
const currentVendor = computed(() => vendors.value.find((v) => v.key === activeVendor.value) ?? null)
const activeGroup = computed(
  () => currentVendor.value?.groups.find((g) => g.id === activeGroupId.value) ?? null
)

function selectVendor(key: PlazaVendorKey) {
  activeVendor.value = key
  activeGroupId.value = vendors.value.find((v) => v.key === key)?.groups[0]?.id ?? null
}

// 数据到达或刷新后，保证选中的厂商/分组仍然存在。
watch(
  vendors,
  (list) => {
    if (!list.length) return
    const current = list.find((v) => v.key === activeVendor.value)
    if (!current) {
      selectVendor(list[0].key)
    } else if (!current.groups.some((g) => g.id === activeGroupId.value)) {
      selectVendor(current.key)
    }
  },
  { immediate: true }
)

type PriceMode = 'paid' | 'catalog'
const priceMode = ref<PriceMode>('paid')
const priceModes: { key: PriceMode; label: string }[] = [
  { key: 'paid', label: '本站价格 · ¥' },
  { key: 'catalog', label: '官方参考 · US$' }
]

type PriceKey = 'input_price' | 'output_price' | 'cache_read_price' | 'cache_write_price'
const priceColumns: { key: PriceKey; label: string }[] = [
  { key: 'input_price', label: '输入价格' },
  { key: 'output_price', label: '输出价格' },
  { key: 'cache_read_price', label: '缓存读取' },
  { key: 'cache_write_price', label: '缓存写入 · 5 分钟' }
]

const searchQuery = ref('')
watch(activeGroupId, () => {
  searchQuery.value = ''
})

function isTokenModel(m: PlazaModel): boolean {
  return (m.pricing?.billing_mode || BILLING_MODE_TOKEN) === BILLING_MODE_TOKEN
}

/** 组内按官方输出价从高到低，无价格的排后，非 token 计费的沉底。 */
const visibleModels = computed<PlazaModel[]>(() => {
  const g = activeGroup.value
  if (!g) return []
  const q = searchQuery.value.trim().toLowerCase()
  const list = q ? g.models.filter((m) => m.name.toLowerCase().includes(q)) : g.models
  return [...list].sort((a, b) => {
    const ta = isTokenModel(a)
    const tb = isTokenModel(b)
    if (ta !== tb) return ta ? -1 : 1
    const pa = a.official_pricing?.output_price ?? a.pricing?.output_price ?? null
    const pb = b.official_pricing?.output_price ?? b.pricing?.output_price ?? null
    if (pa != null && pb != null && pa !== pb) return pb - pa
    if (pa != null && pb == null) return -1
    if (pa == null && pb != null) return 1
    return b.name.localeCompare(a.name)
  })
})

const PER_MILLION = 1_000_000

function paid(m: PlazaModel, key: PriceKey): string {
  const v = m.pricing?.[key]
  if (v == null || !activeGroup.value) return '—'
  // ¥1 = $1 站内余额，本站价直接按人民币展示。
  return formatScaled(v * effectiveRate(activeGroup.value), PER_MILLION, 2).replace(/^\$/, '¥')
}

function catalog(m: PlazaModel, key: PriceKey): string {
  const v = m.official_pricing?.[key]
  return v == null ? '—' : formatScaled(v, PER_MILLION, 2).replace(/^\$/, 'US$ ')
}

function primaryPrice(m: PlazaModel, key: PriceKey): string {
  return priceMode.value === 'paid' ? paid(m, key) : catalog(m, key)
}

function secondaryPrice(m: PlazaModel, key: PriceKey): string {
  return priceMode.value === 'paid' ? `官方 ${catalog(m, key)}` : `本站 ${paid(m, key)}`
}

function modelHint(m: PlazaModel): string {
  if (!isTokenModel(m)) return '按次 / 按张计费，详见下方明细'
  const tiers = Math.max(m.pricing?.intervals?.length ?? 0, m.official_pricing?.intervals?.length ?? 0)
  if (tiers > 1 || (m.time_pricing?.periods?.length ?? 0) > 0) return '基础时段 / 首档价格，详见下方明细'
  if (m.pricing?.input_price == null) return '本站暂未定价'
  return ''
}

const peakNote = computed(() => {
  const g = activeGroup.value
  if (!g?.peak_rate_enabled) return ''
  return `高峰时段 ${g.peak_start}–${g.peak_end} 按 ${g.peak_rate_multiplier}× 计费。`
})
</script>

<style scoped>
.plaza-group-grid {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr));
}

.plaza-tabs {
  scrollbar-width: none;
}

.plaza-tab-label {
  font-size: 16px;
}

.plaza-rate {
  font-size: 18px;
}

.plaza-simple-table {
  min-width: 640px;
}

.plaza-details > summary {
  list-style: none;
}

.plaza-details > summary::-webkit-details-marker {
  display: none;
}

.plaza-details > summary::before {
  content: '▸';
  display: inline-block;
  margin-right: 0.4rem;
  transition: transform 150ms;
}

.plaza-details[open] > summary::before {
  transform: rotate(90deg);
}

.plaza-description {
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.plaza-description :deep(p) {
  @apply mb-2 text-gray-700 last:mb-0 dark:text-dark-200;
}

.plaza-description :deep(a) {
  @apply text-primary-600 underline underline-offset-4 dark:text-primary-300;
}

.plaza-description :deep(ul) {
  @apply mb-2 list-disc pl-5;
}

.plaza-description :deep(li) {
  @apply mb-0.5 text-gray-700 dark:text-dark-200;
}

.plaza-description :deep(code) {
  @apply rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-dark-800;
}
</style>
