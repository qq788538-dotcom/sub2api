// QQ岛 SEO 预渲染：在 vite build 之后运行，为公开页面生成带完整 <head> 与正文的静态 HTML。
//
//   node scripts/qqdao-seo.ts <distDir> [siteUrl]
//
// 产物（均写入 distDir，由 Caddy 按路由提供）：
//   seo/home.html、seo/guide.html、seo/model-plaza.html  公开页预渲染；Vue 挂载后接管 #app
//   index.html  其余页面的入口：改为站点标题、QQ岛图标，并加 noindex
//   robots.txt、sitemap.xml、favicon.svg
//
// 首页正文、站点图标和模型清单在构建时从线上公开接口读取，数据变动后需要重新构建。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { guideSections, type GuideBlock } from '../src/views/user/guideContent.ts'
import { QQDAO_SEO_PAGES } from '../src/qqdaoSeo.ts'

const distDir = process.argv[2]
const site = (process.argv[3] || 'https://ai.qqdao.com').replace(/\/+$/, '')
if (!distDir) {
  console.error('usage: node scripts/qqdao-seo.ts <distDir> [siteUrl]')
  process.exit(1)
}

const SITE_NAME = 'QQ岛'

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function getJson<T>(path: string, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(`${site}${path}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000)
      })
      if (!response.ok) throw new Error(`${path} -> HTTP ${response.status}`)
      const body = (await response.json()) as { data?: T }
      if (!body.data) throw new Error(`${path} -> missing data`)
      return body.data
    } catch (error) {
      if (attempt >= attempts) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }
}

interface PublicSettings { home_content?: string; site_logo?: string }
interface PlazaGroup { name: string; description?: string; platform: string; rate_multiplier: number; models?: { name: string }[] }

const [settings, plaza] = await Promise.all([
  getJson<PublicSettings>('/api/v1/settings/public'),
  getJson<{ description?: string; groups?: PlazaGroup[] }>('/api/v1/model-plaza')
])

// ---- favicon：站点 Logo 为 SVG data URL 时落成独立文件 ----
let faviconHref = ''
const logo = settings.site_logo || ''
const svgPrefix = 'data:image/svg+xml;base64,'
if (logo.startsWith(svgPrefix)) {
  writeFileSync(join(distDir, 'favicon.svg'), Buffer.from(logo.slice(svgPrefix.length), 'base64'))
  faviconHref = '/favicon.svg'
}

const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf8')

interface PageMeta { path: string; title: string; description: string; jsonLd?: object }

function headFor(meta: PageMeta): string {
  const url = `${site}${meta.path}`
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="zh_CN" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta name="twitter:card" content="summary" />`
  ]
  if (meta.jsonLd) {
    // JSON 里的 "<" 转义，避免提前闭合 script
    tags.push(`<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`)
  }
  return tags.join('\n    ')
}

function withFavicon(html: string): string {
  if (!faviconHref) return html
  return html.replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="${faviconHref}" />`)
}

function renderPage(meta: PageMeta, bodyHtml: string): string {
  let html = withFavicon(indexHtml)
  html = html.replace(/<title>[^<]*<\/title>/, headFor(meta))
  if (!html.includes('<div id="app"></div>')) throw new Error('index.html 中找不到空的 <div id="app"></div>')
  return html.replace('<div id="app"></div>', `<div id="app">${bodyHtml}</div>`)
}

// 预渲染正文只在 JS 加载前短暂可见，给一个朴素可读的排版。
const PRERENDER_STYLE = `<style>.qq-seo{max-width:960px;margin:0 auto;padding:24px 16px;font:15px/1.8 system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#17243b}.qq-seo pre{overflow-x:auto;background:#f5f7fa;padding:12px;border-radius:8px}.qq-seo table{border-collapse:collapse}.qq-seo th,.qq-seo td{border:1px solid #dfe6ef;padding:6px 10px;text-align:left}</style>`

function renderBlock(block: GuideBlock): string {
  switch (block.kind) {
    case 'paragraph': return `<p>${esc(block.text)}</p>`
    case 'note': return `<blockquote>${esc(block.text)}</blockquote>`
    case 'steps': return `<ol>${block.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ol>`
    case 'code': return `<p><strong>${esc(block.label)}</strong></p><pre><code>${esc(block.text)}</code></pre>`
    case 'table':
      return `<table><caption>${esc(block.label)}</caption><thead><tr>${block.headings.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${block.rows
        .map((row) => `<tr><th>${esc(row[0])}</th><td>${esc(row[1])}</td></tr>`)
        .join('')}</tbody></table>`
    case 'links':
      return `<p>${block.items
        .map((link) => `<a href="${esc(link.to)}"${link.to.startsWith('http') ? ' rel="noopener"' : ''}>${esc(link.label)}</a>`)
        .join(' · ')}</p>`
    case 'faq': return `<h3>${esc(block.question)}</h3><p>${esc(block.answer)}</p>`
  }
}

const pages: { file: string; meta: PageMeta; body: string }[] = []

// ---- 首页 ----
const homeMeta: PageMeta = {
  ...QQDAO_SEO_PAGES.home,
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', name: SITE_NAME, url: `${site}/`, inLanguage: 'zh-CN' },
      { '@type': 'Organization', name: SITE_NAME, url: `${site}/`, ...(faviconHref ? { logo: `${site}${faviconHref}` } : {}) }
    ]
  }
}
const homeContent = (settings.home_content || '').trim()
const homeIsUrl = /^https?:\/\//.test(homeContent)
pages.push({
  file: 'home.html',
  meta: homeMeta,
  body: homeContent && !homeIsUrl
    ? homeContent
    : `${PRERENDER_STYLE}<main class="qq-seo"><h1>${SITE_NAME}</h1><p>${esc(homeMeta.description)}</p><p><a href="/guide">使用教程</a> · <a href="/model-plaza">模型价格</a> · <a href="/register">注册</a></p></main>`
})

// ---- 使用教程 ----
const guideBody = [
  PRERENDER_STYLE,
  '<main class="qq-seo"><h1>QQ岛使用指南：从注册到发出第一个请求</h1>',
  '<nav><ol>',
  ...guideSections.map((section) => `<li><a href="#qqdao-${esc(section.id)}">${esc(section.title)}</a></li>`),
  '</ol></nav>',
  ...guideSections.map(
    (section, index) =>
      `<section><h2 id="qqdao-${esc(section.id)}">${String(index + 1).padStart(2, '0')} · ${esc(section.title)}</h2><p>${esc(section.summary)}</p>${section.blocks
        .map(renderBlock)
        .join('')}</section>`
  ),
  '</main>'
].join('')
pages.push({
  file: 'guide.html',
  meta: QQDAO_SEO_PAGES.guide,
  body: guideBody
})

// ---- 模型价格 ----
const groups = plaza.groups || []
const modelNames = [...new Set(groups.flatMap((g) => (g.models || []).map((m) => m.name)))]
const plazaBody = [
  PRERENDER_STYLE,
  '<main class="qq-seo"><h1>QQ岛模型价格</h1>',
  `<p>${esc((plaza.description || '').split('\n')[0] || '按分组查看可用模型与价格。')}</p>`,
  '<p>以下为构建时的模型清单快照，实时价格与可用状态以页面加载后的数据为准。</p>',
  ...groups.map(
    (g) =>
      `<section><h2>${esc(g.name)}</h2>${g.description ? `<p>${esc(g.description)}</p>` : ''}<p>计费倍率 ${esc(String(g.rate_multiplier))}×，共 ${(g.models || []).length} 个模型</p><ul>${(g.models || [])
        .map((m) => `<li>${esc(m.name)}</li>`)
        .join('')}</ul></section>`
  ),
  '<p><a href="/guide">查看接入教程</a> · <a href="/register">注册使用</a></p></main>'
].join('')
pages.push({
  file: 'model-plaza.html',
  meta: {
    ...QQDAO_SEO_PAGES.modelPlaza,
    description: `QQ岛 各分组可用模型与价格：${modelNames.slice(0, 12).join('、')} 等，按每百万 Token 计价，分组倍率公开透明。`
  },
  body: plazaBody
})

mkdirSync(join(distDir, 'seo'), { recursive: true })
for (const page of pages) {
  writeFileSync(join(distDir, 'seo', page.file), renderPage(page.meta, page.body))
}

// ---- 其余页面入口：站点标题 + noindex ----
writeFileSync(
  join(distDir, 'index.html'),
  withFavicon(indexHtml).replace(/<title>[^<]*<\/title>/, `<title>${SITE_NAME}</title>\n    <meta name="robots" content="noindex" />`)
)

// ---- robots.txt / sitemap.xml ----
const publicPaths = ['/', '/guide', '/model-plaza']
writeFileSync(
  join(distDir, 'robots.txt'),
  [
    // 私有页面靠 index.html 的 noindex 排除；这里不能 Disallow，否则爬虫看不到 noindex。
    'User-agent: *',
    'Disallow: /api/',
    'Disallow: /v1/',
    'Disallow: /admin',
    '',
    `Sitemap: ${site}/sitemap.xml`,
    ''
  ].join('\n')
)
const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  join(distDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicPaths
    .map((p) => `  <url><loc>${site}${p}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`
)

console.log(`SEO: ${pages.length} 个预渲染页，favicon=${faviconHref || '无'}，模型 ${modelNames.length} 个`)
