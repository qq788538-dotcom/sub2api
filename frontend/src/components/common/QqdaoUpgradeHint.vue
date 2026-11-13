<template>
  <!-- QQ岛：前端由 Caddy 单独发布，后台一键升级/回滚只换后端程序，会造成前后端版本不一致，因此改为提示脚本升级。 -->
  <div class="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-300">
    <p class="font-medium">{{ mode === 'rollback' ? '本站已关闭后台回滚' : '本站已关闭后台一键升级' }}</p>
    <p>
      QQ岛的前端是定制版，需要和后端一起升级。请先把上游版本合并进 qqdao 分支并上传新前端，再在服务器执行：
    </p>
    <div class="flex items-center gap-2">
      <code class="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 font-mono text-[11px] text-gray-800 dark:bg-dark-800 dark:text-dark-100">{{ command }}</code>
      <button
        type="button"
        class="shrink-0 rounded px-2 py-1 text-blue-600 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40"
        @click="copy"
      >
        {{ copied ? '已复制' : '复制' }}
      </button>
    </div>
    <p class="text-blue-600/80 dark:text-blue-400/80">完整流程见 qqdao 分支根目录的 QQDAO.md。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  /** 目标后端版本（不带 v），升级时为最新版本。 */
  version?: string
  mode?: 'update' | 'rollback'
}>()

const command = computed(() =>
  props.mode === 'rollback'
    ? '/data/sub2api/qqdao-upgrade.sh rollback'
    : `/data/sub2api/qqdao-upgrade.sh ${props.version || '<版本>'} <前端发布号>`
)

const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(command.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    copied.value = false
  }
}
</script>
