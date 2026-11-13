// 使用教程内容：GuideView 渲染与 SEO 预渲染脚本（scripts/qqdao-seo.ts）共用。

export const GUIDE_SITE = 'https://ai.qqdao.com'
export const GUIDE_BASE_URL = `${GUIDE_SITE}/v1`
const site = GUIDE_SITE
const baseUrl = GUIDE_BASE_URL

export type GuideBlock =
  | { kind: 'paragraph' | 'note'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'code'; label: string; lang: string; text: string }
  | { kind: 'table'; label: string; headings: string[]; rows: [string, string][] }
  | { kind: 'links'; items: { to: string; label: string }[] }
  | { kind: 'faq'; question: string; answer: string }

export interface GuideSection { id: string; title: string; summary: string; blocks: GuideBlock[] }

const codexToml = `model_provider = "qqdao"
model = "gpt-6.1-sol"            # 换成你的分组里有的模型 ID

[model_providers.qqdao]
name = "QQ岛"
base_url = "${baseUrl}"
wire_api = "responses"
env_key = "QQDAO_API_KEY"        # 填环境变量的名字，不是密钥本身
requires_openai_auth = false
supports_websockets = false`

export const guideSections: GuideSection[] = [
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
        ['Claude Kiro（新）', 'Claude Code、Claude 系列 · claude-sonnet-5-5'],
        ['OpenAI', 'Codex、GPT 系列 · gpt-6.1-sol'],
        ['OpanAI-企业版', 'Codex、GPT 系列，另含 gpt-4o 等 · gpt-6.1-sol'],
        ['OpenAI-官Key（新）', 'OpenAI 官方 Key 直连，倍率较高 · gpt-6.1-sol'],
        ['国模全家桶', 'GLM、Kimi、DeepSeek · glm-5.3'],
        ['DeepSeek', 'DeepSeek 官方模型 · deepseek-v4-1-flash-261017'],
        ['Gemini', 'Gemini 系列 · gemini-3.8-flash'],
        ['Grok', 'Grok 系列 · grok-4.7']
      ] },
      { kind: 'note', text: '模型 ID 必须和「模型价格」页显示的完全一致。请求了分组里没有的模型会报错，换分组需要换对应的密钥。' },
      { kind: 'note', text: 'UltraFast-8倍速 分组已下架。之前用这个分组创建的密钥无法再调用，请新建密钥并改选 OpenAI 或 OpenAI-官Key 分组。' },
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
        '重启终端或 Codex、Claude Code 等工具即可生效。CC Switch 还会自动查询并显示这把密钥的剩余余额。'
      ] },
      { kind: 'code', label: 'macOS · Homebrew 安装', lang: 'bash', text: 'brew install --cask cc-switch' },
      { kind: 'table', label: '各分组导入到哪个工具', headings: ['分组', '导入后'], rows: [
        ['Claude Kiro', 'Claude Code，导入即可用；默认模型由 Claude Code 决定，可用 /model 切换'],
        ['OpenAI / OpanAI-企业版 / OpenAI-官Key', 'Codex，默认模型 gpt-6.1-sol，导入即可用'],
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
        '选择你用的客户端（如 Codex、Claude Code、Gemini CLI）和操作系统。',
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
      { kind: 'note', text: '适用于 OpenAI、OpanAI-企业版、OpenAI-官Key 分组。Codex 只走 Responses 接口，wire_api 必须是 "responses"；model 填你的分组里有的模型 ID。' }
    ]
  },
  {
    id: 'claude-code', title: 'Claude Code 手动配置', summary: 'Claude Kiro 分组走 Anthropic 原生接口，用于 Claude Code。注意 Base URL 不带 /v1。',
    blocks: [
      { kind: 'paragraph', text: '先在「API 密钥」页用 Claude Kiro 分组创建一把密钥，再任选下面一种方式配置。' },
      { kind: 'code', label: 'macOS / Linux · 终端（写入 ~/.zshrc 或 ~/.bashrc 可长期生效）', lang: 'bash', text: `export ANTHROPIC_BASE_URL="${site}"\nexport ANTHROPIC_AUTH_TOKEN="你的密钥"\nexport CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` },
      { kind: 'code', label: 'Windows · PowerShell（当前窗口生效）', lang: 'powershell', text: `$env:ANTHROPIC_BASE_URL="${site}"\n$env:ANTHROPIC_AUTH_TOKEN="你的密钥"\n$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` },
      { kind: 'paragraph', text: '也可以写进 Claude Code 配置文件：macOS / Linux 为 ~/.claude/settings.json，Windows 为 %USERPROFILE%\\.claude\\settings.json。' },
      { kind: 'code', label: 'Claude Code · settings.json', lang: 'json', text: `{\n  "env": {\n    "ANTHROPIC_BASE_URL": "${site}",\n    "ANTHROPIC_AUTH_TOKEN": "你的密钥",\n    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"\n  }\n}` },
      { kind: 'steps', items: [
        '配置后在项目目录运行 claude 启动。',
        '在 Claude Code 里输入 /model 可切换模型，例如 claude-sonnet-5-5、claude-opus-5-5；可用型号以「模型价格」页 Claude 标签为准。',
        'Opus 单价约为 Sonnet 的 2 倍，日常编码建议先用 Sonnet。'
      ] },
      { kind: 'note', text: 'Claude Kiro 分组只支持 Anthropic Messages 接口（/v1/messages）。ANTHROPIC_BASE_URL 填 https://ai.qqdao.com，不要带 /v1，否则会变成 /v1/v1/messages 报 404。' }
    ]
  },
  {
    id: 'base-url', title: '接口地址速查', summary: '大多数程序只需要填 Base URL，不需要完整接口地址。',
    blocks: [
      { kind: 'code', label: 'Base URL', lang: 'text', text: baseUrl },
      { kind: 'table', label: '接口地址', headings: ['用途', '地址'], rows: [
        ['Base URL（SDK、Codex、大多数客户端）', baseUrl],
        ['Responses（Codex 使用）', `${baseUrl}/responses`],
        ['Chat Completions（OpenAI、国模、DeepSeek、Grok 等分组）', `${baseUrl}/chat/completions`],
        ['Anthropic Messages（Claude Kiro 分组、Claude Code）', `${baseUrl}/messages`],
        ['Gemini 原生接口（Gemini CLI 等）', `${site}/v1beta`]
      ] },
      { kind: 'note', text: `有的客户端会自动在地址后加 /v1，这时只填 ${site}，否则会变成 /v1/v1 而报 404。Claude Code 就属于这种，填 ${site}。` }
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
      { kind: 'faq', question: 'Claude Code 报 404 或连不上？', answer: `确认密钥属于 Claude Kiro 分组，ANTHROPIC_BASE_URL 是 ${site}（不带 /v1），用的是 ANTHROPIC_AUTH_TOKEN 而不是登录密码。` },
      { kind: 'faq', question: '原来用 UltraFast-8倍速 的密钥不能用了？', answer: '该分组已下架。请在「API 密钥」页新建密钥，选择 OpenAI 或 OpenAI-官Key 分组，再替换到客户端里。' },
      { kind: 'faq', question: '登录密码和 API Key 是一回事吗？', answer: '不是。登录密码只用来登录网站，程序调用用的是「API 密钥」页创建的 Key。' },
      { kind: 'faq', question: '复制按钮没反应怎么办？', answer: '浏览器可能没有给剪贴板权限。手动选中代码复制，或用页面顶部的「下载 Markdown」。' }
    ]
  },
  {
    id: 'ai', title: '让 AI 助手帮你配置', summary: '把下面这段发给 AI，真实密钥留在自己电脑上。',
    blocks: [
      { kind: 'paragraph', text: '复制以下提示词，并告诉 AI 你用的客户端和系统；也可以用页面顶部按钮导出整篇教程。' },
      { kind: 'code', label: 'AI 配置提示词', lang: 'text', text: `请帮我把客户端接入 QQ岛 API。\n如果我装了 CC Switch，优先让我在站内「API 密钥」页点「导入到 CCS」。\nBase URL：${baseUrl}\nCodex 使用 Responses 接口（wire_api = "responses"）；Claude Code 使用 Claude Kiro 分组，ANTHROPIC_BASE_URL 填 ${site}（不带 /v1）；其他客户端可用 OpenAI 兼容的 Chat Completions。\n密钥放在环境变量 QQDAO_API_KEY 中，不要让我把密钥发给你。\n模型 ID 我会从 https://ai.qqdao.com/model-plaza 核对，示例：gpt-6.1-sol。\n\n请先问清我用的客户端、版本和操作系统，再给出具体步骤。\n没有我的确认，不要替我执行命令或发送 API 请求。` }
    ]
  }
]

export function buildGuideMarkdown(): string {
  const lines = ['# QQ岛使用指南', '', `站点：${site}`, `Base URL：${baseUrl}`, '', '示例里的「你的密钥」需替换为自己的 API Key；请勿把真实密钥发给 AI。运行示例会产生真实扣费。', '']
  for (const [index, section] of guideSections.entries()) {
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
}
