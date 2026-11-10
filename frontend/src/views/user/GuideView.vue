<template>
  <component :is="shell">
    <article class="qq-guide" aria-labelledby="qq-guide-title" lang="zh-CN">
      <a class="qq-guide__skip" href="#qqdao-account" @click="jumpTo($event, 'account')">跳到教程正文</a>

      <header class="qq-guide__intro">
        <p class="qq-guide__eyebrow">QQ岛 · 使用指南</p>
        <h1 id="qq-guide-title">从注册到发出第一个请求</h1>
        <p class="qq-guide__lead">注册并兑换余额，创建 API Key 时选好分组，然后用配套软件 CC Switch 一键导入，Codex、Gemini CLI 等工具直接就能用。不想装软件，也可以用「使用密钥」生成配置手动填写。</p>
        <div class="qq-guide__actions">
          <button class="qq-guide__button qq-guide__button--primary" type="button" @click="copyText(markdown, '完整教程')">复制完整 MD 给 AI</button>
          <button class="qq-guide__button" type="button" @click="downloadMarkdown">下载 Markdown</button>
          <a class="qq-guide__button" href="#qqdao-ccswitch" @click="jumpTo($event, 'ccswitch')">一键导入 CC Switch <span aria-hidden="true">↓</span></a>
        </div>
        <p class="qq-guide__caption">复制和下载的内容不含你的账户信息和密钥。请不要把真实密钥发给 AI 或任何人。</p>
      </header>

      <div class="qq-guide__layout">
        <nav class="qq-guide__toc" aria-label="使用教程目录">
          <p class="qq-guide__toc-title">按需要快速跳转</p>
          <ol>
            <li v-for="(section, index) in sections" :key="section.id">
              <a :href="`#qqdao-${section.id}`" @click="jumpTo($event, section.id)">
                <span class="qq-guide__number">{{ String(index + 1).padStart(2, '0') }}</span>{{ section.title }}
              </a>
            </li>
          </ol>
          <RouterLink class="qq-guide__price-link" to="/model-plaza">查看模型与价格 <span aria-hidden="true">↗</span></RouterLink>
        </nav>

        <div class="qq-guide__chapters">
          <section v-for="(section, index) in sections" :key="section.id" class="qq-guide__card" :aria-labelledby="`qqdao-${section.id}`">
            <header class="qq-guide__card-heading">
              <h2 :id="`qqdao-${section.id}`" tabindex="-1">{{ String(index + 1).padStart(2, '0') }} · {{ section.title }}</h2>
              <p>{{ section.summary }}</p>
            </header>
            <div class="qq-guide__body">
              <template v-for="(block, blockIndex) in section.blocks" :key="blockIndex">
                <p v-if="block.kind === 'paragraph'">{{ block.text }}</p>
                <aside v-else-if="block.kind === 'note'" class="qq-guide__note">{{ block.text }}</aside>
                <ol v-else-if="block.kind === 'steps'" class="qq-guide__steps">
                  <li v-for="step in block.items" :key="step">{{ step }}</li>
                </ol>
                <div v-else-if="block.kind === 'code'" class="qq-guide__code">
                  <div class="qq-guide__code-heading">
                    <span>{{ block.label }}</span>
                    <button type="button" :aria-label="`复制${block.label}`" @click="copyText(block.text, block.label)">复制</button>
                  </div>
                  <pre tabindex="0" :aria-label="block.label"><code>{{ block.text }}</code></pre>
                </div>
                <div v-else-if="block.kind === 'table'" class="qq-guide__table-wrap" role="region" :aria-label="block.label" tabindex="0">
                  <table>
                    <caption>{{ block.label }}</caption>
                    <thead><tr><th v-for="heading in block.headings" :key="heading" scope="col">{{ heading }}</th></tr></thead>
                    <tbody><tr v-for="row in block.rows" :key="row[0]"><th scope="row">{{ row[0] }}</th><td>{{ row[1] }}</td></tr></tbody>
                  </table>
                </div>
                <div v-else-if="block.kind === 'links'" class="qq-guide__links">
                  <template v-for="link in block.items" :key="link.to">
                    <a v-if="link.to.startsWith('http')" :href="link.to" target="_blank" rel="noopener noreferrer">{{ link.label }} <span aria-hidden="true">↗</span></a>
                    <RouterLink v-else :to="link.to">{{ link.label }} <span aria-hidden="true">↗</span></RouterLink>
                  </template>
                </div>
                <details v-else-if="block.kind === 'faq'" class="qq-guide__faq">
                  <summary>{{ block.question }}</summary>
                  <p>{{ block.answer }}</p>
                </details>
              </template>
            </div>
          </section>
          <footer class="qq-guide__footer">分组、模型和价格会随上游调整，以「模型价格」页当前展示为准。</footer>
        </div>
      </div>
      <p class="qq-guide__status" role="status" aria-live="polite" aria-atomic="true">{{ status }}</p>
    </article>
  </component>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import PlazaNavBar from '@/components/modelPlaza/PlazaNavBar.vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { buildGuideMarkdown, guideSections } from './guideContent'

// 未登录访客也能看教程：已登录套后台布局，未登录用模型广场同款公开导航条。
const PublicShell = defineComponent({
  name: 'GuidePublicShell',
  setup(_, { slots }) {
    return () => h('div', { class: 'min-h-screen bg-gray-50 dark:bg-dark-950' }, [
      h(PlazaNavBar, { loginRedirect: '/guide' }),
      h('main', { class: 'mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8' }, slots.default?.())
    ])
  }
})

const appStore = useAppStore()
const authStore = useAuthStore()
const shell = computed(() => (authStore.isAuthenticated ? AppLayout : PublicShell))
onMounted(() => { void appStore.fetchPublicSettings() })

const status = ref('')
let statusTimer: ReturnType<typeof setTimeout> | undefined
const pendingDownloads = new Map<string, ReturnType<typeof setTimeout>>()

const sections = guideSections
const markdown = computed(buildGuideMarkdown)

function announce(message: string) {
  clearTimeout(statusTimer)
  status.value = message
  statusTimer = setTimeout(() => { status.value = '' }, 8000)
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    announce(`已复制${label}。`)
  } catch {
    announce('复制失败，请手动选中代码复制，或下载 Markdown。')
  }
}

function downloadMarkdown() {
  const url = URL.createObjectURL(new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'qqdao-guide.md'
  document.body.appendChild(link)
  link.click()
  link.remove()
  pendingDownloads.set(url, setTimeout(() => {
    URL.revokeObjectURL(url)
    pendingDownloads.delete(url)
  }, 1000))
  announce('已发起 Markdown 下载，请查看浏览器下载记录。')
}

function jumpTo(event: MouseEvent, id: string) {
  const heading = document.getElementById(`qqdao-${id}`)
  if (!heading) return
  event.preventDefault()
  heading.focus({ preventScroll: true })
  heading.scrollIntoView({ block: 'start', behavior: 'auto' })
}

onBeforeUnmount(() => {
  clearTimeout(statusTimer)
  for (const [url, timer] of pendingDownloads) {
    clearTimeout(timer)
    URL.revokeObjectURL(url)
  }
})
</script>

<style scoped>
.qq-guide {
  --guide-bg: #fff;
  --guide-text: #17243b;
  --guide-muted: #53627a;
  --guide-border: #dfe6ef;
  --guide-blue: #245bce;
  --guide-tint: #f0f6ff;
  --guide-code: #f7f9fc;
  position: relative;
  max-width: 1440px;
  margin: 0 auto;
  padding: clamp(18px, 3vw, 42px);
  border: 1px solid var(--guide-border);
  border-radius: 20px;
  background: var(--guide-bg);
  color: var(--guide-text);
  font-size: 15px;
  line-height: 1.85;
  overflow-wrap: anywhere;
  color-scheme: light;
}
.dark .qq-guide {
  --guide-bg: #111b2d;
  --guide-text: #edf3ff;
  --guide-muted: #b0bed2;
  --guide-border: #33445d;
  --guide-blue: #91baff;
  --guide-tint: #172b49;
  --guide-code: #0c1524;
  color-scheme: dark;
}
.qq-guide *, .qq-guide *::before, .qq-guide *::after { box-sizing: border-box; }
.qq-guide h1, .qq-guide h2, .qq-guide p, .qq-guide ol { margin: 0; }
.qq-guide a { color: var(--guide-blue); text-underline-offset: 4px; }
.qq-guide button { font: inherit; cursor: pointer; }
.qq-guide :is(a, button, summary, pre, [tabindex]):focus-visible { outline: 3px solid var(--guide-blue); outline-offset: 4px; }
.qq-guide__skip { position: absolute; top: 8px; left: 12px; z-index: 2; padding: 8px 14px; background: var(--guide-bg); transform: translateY(-180%); clip-path: inset(100%); }
.qq-guide__skip:focus { transform: none; clip-path: none; }
.qq-guide__intro { padding: clamp(22px, 3vw, 38px); border: 1px solid var(--guide-border); border-radius: 14px; }
.qq-guide__eyebrow { color: var(--guide-blue); letter-spacing: .18em; font-size: 13px; font-weight: 700; }
.qq-guide h1 { margin-top: 12px; font-size: clamp(25px, 2.3vw, 34px); line-height: 1.4; font-weight: 750; letter-spacing: -.03em; }
.qq-guide__lead { max-width: 850px; margin-top: 16px !important; color: var(--guide-muted); font-size: 16px; }
.qq-guide__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
.qq-guide__button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 10px 18px; border: 1px solid var(--guide-border); border-radius: 9px; background: var(--guide-bg); color: var(--guide-text) !important; text-decoration: none; font-size: 14px; font-weight: 600; }
.qq-guide__button:hover { background: var(--guide-tint); border-color: var(--guide-blue); }
.qq-guide__button--primary { background: #245bce; border-color: #245bce; color: #fff !important; }
.qq-guide__button--primary:hover { background: #1948aa; border-color: #1948aa; }
.qq-guide__caption { margin-top: 16px !important; color: var(--guide-muted); font-size: 13px; }
.qq-guide__layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 30px; align-items: start; margin-top: 30px; }
.qq-guide__toc { position: sticky; top: 96px; max-height: calc(100dvh - 120px); overflow-y: auto; padding: 4px 5px 8px; }
.qq-guide__toc-title { margin-bottom: 14px !important; color: var(--guide-muted); font-size: 13px; font-weight: 600; }
.qq-guide__toc ol { list-style: none; padding: 0; }
.qq-guide__toc li + li { margin-top: 3px; }
.qq-guide__toc li a { display: flex; align-items: baseline; gap: 10px; min-height: 44px; padding: 9px 8px; border-radius: 7px; color: var(--guide-muted); text-decoration: none; font-size: 14px; line-height: 1.7; }
.qq-guide__toc li a:hover { color: var(--guide-blue); background: var(--guide-tint); }
.qq-guide__number { flex-shrink: 0; white-space: nowrap; color: var(--guide-blue); font-variant-numeric: tabular-nums; font-size: 12px; }
.qq-guide__price-link { display: inline-block; margin: 18px 8px 0; font-size: 13px; }
.qq-guide__chapters { min-width: 0; }
.qq-guide__card { border: 1px solid var(--guide-border); border-radius: 13px; background: var(--guide-bg); }
.qq-guide__card + .qq-guide__card { margin-top: 22px; }
.qq-guide__card-heading { padding: 23px 28px; border-bottom: 1px solid var(--guide-border); }
.qq-guide h2 { font-size: 20px; line-height: 1.5; font-weight: 700; scroll-margin-top: 105px; }
.qq-guide__card-heading p { margin-top: 8px; color: var(--guide-muted); }
.qq-guide__body { display: grid; gap: 20px; padding: 26px 28px; }
.qq-guide__body > p, .qq-guide__steps { color: var(--guide-muted); }
.qq-guide__steps { padding-left: 24px; list-style: decimal; }
.qq-guide__steps li { padding-left: 6px; }
.qq-guide__steps li + li { margin-top: 12px; }
.qq-guide__steps li::marker { color: var(--guide-blue); font-weight: 600; }
.qq-guide__note { padding: 14px 17px; border-left: 3px solid var(--guide-blue); border-radius: 0 7px 7px 0; background: var(--guide-tint); font-size: 14px; }
.qq-guide__code { min-width: 0; border: 1px solid var(--guide-border); border-radius: 9px; overflow: hidden; background: var(--guide-code); }
.qq-guide__code-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 14px; border-bottom: 1px solid var(--guide-border); color: var(--guide-muted); font-size: 12px; }
.qq-guide__code-heading button { flex-shrink: 0; min-height: 36px; min-width: 48px; border: 1px solid var(--guide-border); border-radius: 6px; background: var(--guide-bg); color: var(--guide-blue); }
.qq-guide__code pre { margin: 0; padding: 18px; max-width: 100%; overflow-x: auto; white-space: pre; line-height: 1.75; font-size: 13px; tab-size: 2; }
.qq-guide__code code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.qq-guide__links { display: flex; flex-wrap: wrap; gap: 12px 24px; }
.qq-guide__links a { min-height: 32px; font-weight: 600; text-decoration: underline; }
.qq-guide__table-wrap { min-width: 0; overflow-x: auto; }
.qq-guide table { width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; }
.qq-guide caption { margin-bottom: 10px; text-align: left; color: var(--guide-muted); font-size: 13px; }
.qq-guide th, .qq-guide td { padding: 12px; border-bottom: 1px solid var(--guide-border); vertical-align: top; }
.qq-guide thead { background: var(--guide-code); }
.qq-guide tbody th { width: 31%; font-weight: 500; }
.qq-guide td { color: var(--guide-muted); }
.qq-guide__faq { border-bottom: 1px solid var(--guide-border); padding-bottom: 14px; }
.qq-guide__faq summary { padding: 5px 0; cursor: pointer; font-weight: 600; }
.qq-guide__faq p { margin-top: 10px; color: var(--guide-muted); }
.qq-guide__footer { margin-top: 25px; color: var(--guide-muted); font-size: 12px; }
.qq-guide__status:empty { display: none; }
.qq-guide__status { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 60; width: max-content; max-width: calc(100vw - 32px); padding: 12px 20px; border: 1px solid var(--guide-border); border-radius: 10px; background: var(--guide-bg); color: var(--guide-text); box-shadow: 0 8px 28px #0002; font-size: 14px; }
@media (max-width: 1100px) {
  .qq-guide__layout { grid-template-columns: minmax(0, 1fr); gap: 22px; }
  .qq-guide__toc { position: static; max-height: none; overflow: visible; padding: 16px; border: 1px solid var(--guide-border); border-radius: 10px; background: var(--guide-code); }
  .qq-guide__toc ol { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 12px; }
  .qq-guide__price-link { margin-top: 10px; }
}
@media (max-width: 600px) {
  .qq-guide { padding: 14px; border-radius: 12px; font-size: 14px; }
  .qq-guide__intro { padding: 22px 17px; }
  .qq-guide__lead { font-size: 15px; }
  .qq-guide__actions { gap: 10px; margin-top: 22px; }
  .qq-guide__button { width: 100%; }
  .qq-guide__toc ol { grid-template-columns: minmax(0, 1fr); }
  .qq-guide__card-heading { padding: 20px 17px; }
  .qq-guide__body { padding: 20px 17px; gap: 18px; }
  .qq-guide h2 { font-size: 18px; }
  .qq-guide__code pre { padding: 14px; font-size: 12px; }
  .qq-guide th, .qq-guide td { padding: 10px 7px; }
}
</style>
