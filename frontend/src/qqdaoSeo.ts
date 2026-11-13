// QQ岛公开页 SEO 元信息：路由的 documentTitle 与 scripts/qqdao-seo.ts 预渲染共用，保持一致。
// 不要在这里 import 其他模块：预渲染脚本直接用 Node 运行此文件。

export interface QqdaoSeoPage {
  path: string
  title: string
  description: string
}

export const QQDAO_SEO_PAGES = {
  home: {
    path: '/',
    title: 'QQ岛 - AI API 中转站｜一个入口接入 Claude、GPT、Codex、Gemini、Grok、DeepSeek',
    description:
      'QQ岛 是 OpenAI 兼容的 AI API 中转服务：一个 API Key 接入 Claude、GPT、Codex、Gemini、Grok、DeepSeek、GLM、Kimi 等模型，按量计费，支持 CC Switch 一键导入 Codex 和 Claude Code。'
  },
  guide: {
    path: '/guide',
    title: '使用教程 - QQ岛｜CC Switch 一键导入、Codex 与 Claude Code 配置、API 接入示例',
    description:
      'QQ岛 API 接入教程：注册与兑换余额、选择分组与模型、CC Switch 一键导入、Codex config.toml 配置、Claude Code 配置、Base URL 速查、Python 与 curl 调用示例和常见错误排查。'
  },
  modelPlaza: {
    path: '/model-plaza',
    title: '模型价格 - QQ岛｜Claude、GPT、Gemini、Grok、DeepSeek、GLM、Kimi API 价格',
    // 描述在预渲染时按实时模型清单补全
    description: 'QQ岛 各分组可用模型与价格，按每百万 Token 计价，分组倍率公开透明。'
  }
} satisfies Record<string, QqdaoSeoPage>
