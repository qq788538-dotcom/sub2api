import { describe, expect, it } from 'vitest'
import { buildCcSwitchImportDeeplink, pickCcSwitchModel } from '@/utils/ccswitchImport'

const base = {
  baseUrl: 'https://example.com',
  clientType: 'claude' as const,
  providerName: 'Site',
  apiKey: 'sk-test',
  usageScript: 'x'
}

function decodedCodexConfig(link: string): string {
  const raw = new URL(link).searchParams.get('config') || ''
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)).config
}

describe('pickCcSwitchModel', () => {
  it('keeps the default when the group serves it', () => {
    expect(pickCcSwitchModel('gpt-6.1-sol', ['gpt-5.6', 'gpt-6.1-sol'])).toBe('gpt-6.1-sol')
  })
  it('falls back to the first group model when the default is missing', () => {
    expect(pickCcSwitchModel('gpt-6.1-sol', ['glm-5.3', 'kimi-k3'])).toBe('glm-5.3')
  })
  it('keeps the default without group data', () => {
    expect(pickCcSwitchModel('gpt-6.1-sol', undefined)).toBe('gpt-6.1-sol')
    expect(pickCcSwitchModel('gpt-6.1-sol', [])).toBe('gpt-6.1-sol')
  })
  it('never invents a model for platforms without a default', () => {
    expect(pickCcSwitchModel(undefined, ['glm-5.3'])).toBeUndefined()
  })
})

describe('buildCcSwitchImportDeeplink with group models', () => {
  it('uses a group model in both the model param and the embedded Codex config', () => {
    const link = buildCcSwitchImportDeeplink({ ...base, platform: 'openai', groupModels: ['glm-5.3', 'kimi-k3'] })
    expect(new URL(link).searchParams.get('model')).toBe('glm-5.3')
    expect(decodedCodexConfig(link)).toContain('model = "glm-5.3"')
  })
  it('replaces the Grok default when the group lacks it', () => {
    const link = buildCcSwitchImportDeeplink({ ...base, platform: 'grok', groupModels: ['grok-4.7'] })
    expect(new URL(link).searchParams.get('model')).toBe('grok-4.7')
  })
  it('is unchanged for an OpenAI group that serves the default', () => {
    const link = buildCcSwitchImportDeeplink({ ...base, platform: 'openai', groupModels: ['gpt-6.1-sol'] })
    expect(new URL(link).searchParams.get('model')).toBe('gpt-6.1-sol')
  })
})
