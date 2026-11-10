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

type Block =
  | { kind: 'paragraph' | 'note'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'code'; label: string; lang: string; text: string }
  | { kind: 'table'; label: string; headings: string[]; rows: [string, string][] }
  | { kind: 'links'; items: { to: string; label: string }[] }
  | { kind: 'faq'; question: string; answer: string }

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

const site = 'https://ai.qqdao.com'
const baseUrl = `${site}/v1`
const status = ref('')
let statusTimer: ReturnType<typeof setTimeout> | undefined
const pendingDownloads = new Map<string, ReturnType<typeof setTimeout>>()

const codexToml = `model_provider = "qqdao"
model = "gpt-6.1-sol"            # 换成你的分组里有的模型 ID

[model_providers.qqdao]
name = "QQ岛"
base_url = "${baseUrl}"
wire_api = "responses"
env_key = "QQDAO_API_KEY"        # 填环境变量的名字，不是密钥本身
requires_openai_auth = false
supports_websockets = false`

const sections: { id: string; title: string; summary: string; blocks: Block[] }[] = [
  {
    id: 'account', title: '注册账号并兑换余额', summary: '调用按量扣余额，新账户余额为 0，需要先兑换。',
    blocks: [
      { kind: 'steps', items: [
        '注册并登录 QQ岛。',
        '本站暂未开通在线支付，余额通过兑换码充值：打开「兑换」页，输入兑换码，余额立即到账。',
        '在仪表盘确认余额已增加；兑换失败时先核对兑换码是否已被使用，不要反复提交。'
      ] },
      { kind: 'links', items: [{ to: '/register', label: '注册账号' }, { to: '/redeem', label: '打开兑换页' }] }
    ]
  },
  {
    id: 'keys', title: '创建 API Key 并选择分组', summary: '分组决定这把密钥能用哪些模型，以及按什么倍率计费。',
    blocks: [
      { kind: 'steps', items: [
        '进入「API 密钥」，点击创建，按用途选择分组。',
        '创建后妥善保存密钥。它相当于账户密码，泄露后别人可以直接消耗你的余额。',
        '一个分组不够用时，可以为不同用途分别创建密钥。'
      ] },
      { kind: 'table', label: '当前分组与示例模型 ID（完整清单和价格见「模型价格」页）', headings: ['分组', '适合用途 · 示例模型 ID'], rows: [
        ['OpenAI', 'Codex、GPT 系列 · gpt-6.1-sol'],
        ['OpanAI-企业版', 'Codex、GPT 系列，另含 gpt-4o 等 · gpt-6.1-sol'],
        ['UltraFast-8倍速', '响应更快的 GPT 系列 · gpt-6.1-sol'],
        ['国模全家桶', 'GLM、Kimi、DeepSeek · glm-5.3'],
        ['DeepSeek', 'DeepSeek 官方模型 · deepseek-v4-1-flash-261017'],
        ['Gemini', 'Gemini 系列 · gemini-3.8-flash'],
        ['Grok', 'Grok 系列 · grok-4.7']
      ] },
      { kind: 'note', text: '模型 ID 必须和「模型价格」页显示的完全一致。请求了分组里没有的模型会报错，换分组需要换对应的密钥。' },
      { kind: 'links', items: [{ to: '/keys', label: '打开 API 密钥' }, { to: '/model-plaza', label: '查看模型与价格' }] }
    ]
  },
  {
    id: 'ccswitch', title: '一键导入 CC Switch（推荐）', summary: 'CC Switch 是本站配套的免费桌面软件，装好后点一下就能把密钥导入 Codex 等工具。',
    blocks: [
      { kind: 'steps', items: [
        '安装 CC Switch（Windows、macOS、Linux 都有）。macOS 可用 Homebrew 安装，其他系统到官方 Releases 页下载安装包。装好后先打开一次。',
        '在本站「API 密钥」列表中，点击密钥旁的「导入到 CCS」。浏览器询问是否打开 CC Switch 时，选择允许。',
        'CC Switch 会弹出导入确认，确认后会多出一个名为「QQ岛」的供应商。在对应工具页面选中它，点「启用」。',
        '重启终端或 Codex 等工具即可生效。CC Switch 还会自动查询并显示这把密钥的剩余余额。'
      ] },
      { kind: 'code', label: 'macOS · Homebrew 安装', lang: 'bash', text: 'brew install --cask cc-switch' },
      { kind: 'table', label: '各分组导入到哪个工具', headings: ['分组', '导入后'], rows: [
        ['OpenAI / OpanAI-企业版 / UltraFast-8倍速', 'Codex，默认模型 gpt-6.1-sol，导入即可用'],
        ['国模全家桶', 'Codex，自动选用分组里的模型；想换模型可在 CC Switch 中修改'],
        ['Gemini', 'Gemini CLI'],
        ['Grok', 'Grok Build，默认模型 grok-4.5，导入即可用'],
        ['DeepSeek', '暂不推荐导入，请按下文用 Chat Completions 接入']
      ] },
      { kind: 'note', text: '点「导入到 CCS」后没反应，或提示未安装：确认 CC Switch 已安装并至少打开过一次，再刷新本页重试。导入链接里带有真实密钥，不要转发给别人。' },
      { kind: 'links', items: [{ to: 'https://github.com/farion1231/cc-switch/releases/latest', label: '下载 CC Switch' }, { to: '/keys', label: '打开 API 密钥' }] }
    ]
  },
  {
    id: 'quick', title: '不装软件：使用密钥生成配置', summary: '不想装 CC Switch，可以让站内按你的密钥和分组生成配置文件，手动粘贴。',
    blocks: [
      { kind: 'steps', items: [
        '在「API 密钥」列表中，点击密钥旁的「使用密钥」。',
        '选择你用的客户端（如 Codex、Gemini CLI）和操作系统。',
        '按弹窗提示，把生成的内容复制到对应文件或终端，保存后重启客户端。'
      ] },
      { kind: 'note', text: '弹窗生成的内容里带着你的真实密钥，不要截图发群或提交到 Git 仓库。' }
    ]
  },
  {
    id: 'codex', title: 'Codex 手动配置', summary: '本站大部分调用来自 Codex。Codex 桌面版和命令行共用同一份配置。',
    blocks: [
      { kind: 'paragraph', text: '第一步，把密钥设为环境变量（Windows 设置后需重新打开终端和 Codex）：' },
      { kind: 'code', label: 'macOS / Linux · 写入 ~/.zshrc 或 ~/.bashrc', lang: 'bash', text: 'export QQDAO_API_KEY="你的密钥"' },
      { kind: 'code', label: 'Windows · PowerShell', lang: 'powershell', text: 'setx QQDAO_API_KEY "你的密钥"' },
      { kind: 'paragraph', text: '第二步，编辑 Codex 配置文件：macOS / Linux 为 ~/.codex/config.toml，Windows 为 %USERPROFILE%\\.codex\\config.toml。' },
      { kind: 'code', label: 'Codex · config.toml', lang: 'toml', text: codexToml },
      { kind: 'note', text: '适用于 OpenAI、OpanAI-企业版、UltraFast-8倍速分组。Codex 只走 Responses 接口，wire_api 必须是 "responses"；model 填你的分组里有的模型 ID。' }
    ]
  },
  {
    id: 'base-url', title: '接口地址速查', summary: '大多数程序只需要填 Base URL，不需要完整接口地址。',
    blocks: [
      { kind: 'code', label: 'Base URL', lang: 'text', text: baseUrl },
      { kind: 'table', label: '接口地址', headings: ['用途', '地址'], rows: [
        ['Base URL（SDK、Codex、大多数客户端）', baseUrl],
        ['Responses（Codex 使用）', `${baseUrl}/responses`],
        ['Chat Completions（各分组通用）', `${baseUrl}/chat/completions`],
        ['Gemini 原生接口（Gemini CLI 等）', `${site}/v1beta`]
      ] },
      { kind: 'note', text: `有的客户端会自动在地址后加 /v1，这时只填 ${site}，否则会变成 /v1/v1 而报 404。` }
    ]
  },
  {
    id: 'python', title: 'Python 调用示例', summary: '用官方 openai 包，改 base_url 即可。',
    blocks: [
      { kind: 'paragraph', text: '先 pip install openai，并按上一节设置好 QQDAO_API_KEY 环境变量。' },
      { kind: 'code', label: 'Python · OpenAI SDK', lang: 'python', text: `import os\nfrom openai import OpenAI\n\nclient = OpenAI(\n    api_key=os.environ["QQDAO_API_KEY"],\n    base_url="${baseUrl}",\n)\n\nresponse = client.chat.completions.create(\n    model="gpt-6.1-sol",  # 换成你的分组里有的模型 ID\n    messages=[{"role": "user", "content": "你好"}],\n)\nprint(response.choices[0].message.content)` },
      { kind: 'note', text: '每次运行都会产生真实调用并扣余额。' }
    ]
  },
  {
    id: 'curl', title: '用 curl 排查问题', summary: '客户端报错时，用 curl 判断是密钥问题还是客户端配置问题。',
    blocks: [
      { kind: 'code', label: 'curl · Chat Completions', lang: 'bash', text: `curl ${baseUrl}/chat/completions \\\n  -H "Authorization: Bearer $QQDAO_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model": "gpt-6.1-sol", "messages": [{"role": "user", "content": "你好"}]}'` },
      { kind: 'table', label: '常见错误', headings: ['错误', '先检查'], rows: [
        ['401', '密钥是否填错、已删除或已停用；环境变量是否在当前终端生效。'],
        ['403 / 余额不足', '到仪表盘查看余额，不足时去「兑换」页充值。'],
        ['404', 'Base URL 是否多了或少了 /v1；模型 ID 是否在你的分组里。'],
        ['429', '请求太频繁或上游限流，稍等再试，不要连续重试。'],
        ['5xx / 超时', '记下时间和错误信息，稍后重试；持续出现请联系站长。']
      ] }
    ]
  },
  {
    id: 'usage', title: '查看用量与扣费', summary: '每次调用都有记录，可以按时间和模型核对。',
    blocks: [
      { kind: 'steps', items: [
        '打开「使用记录」，按时间、密钥或模型筛选。',
        '每条记录显示模型、Token 用量和实际扣费。',
        '单价按「模型价格」页的分组价格计算；对账单有疑问时，带上调用时间联系站长。'
      ] },
      { kind: 'links', items: [{ to: '/usage', label: '打开使用记录' }, { to: '/model-plaza', label: '查看模型价格' }] }
    ]
  },
  {
    id: 'faq', title: '常见问题', summary: '最容易填错的几处。',
    blocks: [
      { kind: 'faq', question: 'Base URL 要不要带 /v1？', answer: `一般带：${baseUrl}。只有客户端会自动补 /v1 时才填 ${site}。` },
      { kind: 'faq', question: '点「导入到 CCS」没反应？', answer: '先安装 CC Switch 并打开一次，让系统登记它的打开方式；浏览器弹出「是否打开 CC Switch」时要选允许。仍不行就改用「使用密钥」手动配置。' },
      { kind: 'faq', question: '余额怎么充值？', answer: '本站暂未开通在线支付，使用兑换码充值：打开「兑换」页输入兑换码即可。' },
      { kind: 'faq', question: 'Codex 提示找不到模型或 404？', answer: '检查 config.toml 里的 model 是否在你的密钥分组中，wire_api 是否为 "responses"，base_url 是否为 https://ai.qqdao.com/v1。' },
      { kind: 'faq', question: '登录密码和 API Key 是一回事吗？', answer: '不是。登录密码只用来登录网站，程序调用用的是「API 密钥」页创建的 Key。' },
      { kind: 'faq', question: '复制按钮没反应怎么办？', answer: '浏览器可能没有给剪贴板权限。手动选中代码复制，或用页面顶部的「下载 Markdown」。' }
    ]
  },
  {
    id: 'ai', title: '让 AI 助手帮你配置', summary: '把下面这段发给 AI，真实密钥留在自己电脑上。',
    blocks: [
      { kind: 'paragraph', text: '复制以下提示词，并告诉 AI 你用的客户端和系统；也可以用页面顶部按钮导出整篇教程。' },
      { kind: 'code', label: 'AI 配置提示词', lang: 'text', text: `请帮我把客户端接入 QQ岛 API。\n如果我装了 CC Switch，优先让我在站内「API 密钥」页点「导入到 CCS」。\nBase URL：${baseUrl}\nCodex 使用 Responses 接口（wire_api = "responses"），其他客户端可用 OpenAI 兼容的 Chat Completions。\n密钥放在环境变量 QQDAO_API_KEY 中，不要让我把密钥发给你。\n模型 ID 我会从 https://ai.qqdao.com/model-plaza 核对，示例：gpt-6.1-sol。\n\n请先问清我用的客户端、版本和操作系统，再给出具体步骤。\n没有我的确认，不要替我执行命令或发送 API 请求。` }
    ]
  }
]

const markdown = computed(() => {
  const lines = ['# QQ岛使用指南', '', `站点：${site}`, `Base URL：${baseUrl}`, '', '示例里的「你的密钥」需替换为自己的 API Key；请勿把真实密钥发给 AI。运行示例会产生真实扣费。', '']
  for (const [index, section] of sections.entries()) {
    lines.push(`## ${String(index + 1).padStart(2, '0')} · ${section.title}`, '', section.summary, '')
    for (const block of section.blocks) {
      switch (block.kind) {
        case 'paragraph': lines.push(block.text); break
        case 'note': lines.push(`> ${block.text}`); break
        case 'steps': lines.push(...block.items.map((item, i) => `${i + 1}. ${item}`)); break
        case 'code': lines.push(`### ${block.label}`, '', '```' + block.lang, block.text, '```'); break
        case 'table': lines.push(`### ${block.label}`, '', `| ${block.headings.join(' | ')} |`, '| --- | --- |', ...block.rows.map(row => `| ${row.join(' | ')} |`)); break
        case 'links': lines.push(...block.items.map(link => `[${link.label}](${link.to.startsWith('http') ? link.to : site + link.to})`)); break
        case 'faq': lines.push(`### ${block.question}`, '', block.answer); break
      }
      lines.push('')
    }
  }
  return lines.join('\n')
})

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
