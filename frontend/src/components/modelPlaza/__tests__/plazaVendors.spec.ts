import { describe, expect, it } from 'vitest'
import type { ModelPlazaGroup } from '@/api/modelPlaza'
import { groupPlazaVendors, plazaVendorOf } from '../plazaVendors'

function group(id: number, name: string, platform: string, rate: number, models: string[]): ModelPlazaGroup {
  return {
    id,
    name,
    platform,
    rate_multiplier: rate,
    models: models.map((m) => ({ name: m, platform, pricing: null, official_pricing: null }))
  } as unknown as ModelPlazaGroup
}

describe('plazaVendors', () => {
  it('按平台和模型归类厂商', () => {
    expect(plazaVendorOf(group(1, 'OpenAI', 'openai', 0.2, ['gpt-6.1-sol']))).toBe('chatgpt')
    expect(plazaVendorOf(group(2, '国模全家桶', 'openai', 0.15, ['GLM-5.2', 'kimi-k3']))).toBe('domestic')
    expect(plazaVendorOf(group(3, 'Claude Kiro', 'anthropic', 0.2, ['claude-sonnet-5-5']))).toBe('claude')
    expect(plazaVendorOf(group(4, 'DeepSeek', 'deepseek', 0.5, ['deepseek-v4']))).toBe('domestic')
    expect(plazaVendorOf(group(5, 'Grok', 'grok', 0.2, ['grok-4.7']))).toBe('grok')
  })

  it('只返回有分组的厂商，组内按倍率升序', () => {
    const vendors = groupPlazaVendors(
      [
        group(20, 'OpenAI-官Key', 'openai', 0.9, ['gpt-6.1-sol']),
        group(2, 'OpenAI', 'openai', 0.2, ['gpt-6.1-sol']),
        group(21, 'Claude Kiro', 'anthropic', 0.2, ['claude-opus-5-5'])
      ],
      (g) => g.rate_multiplier
    )
    expect(vendors.map((v) => v.key)).toEqual(['chatgpt', 'claude'])
    expect(vendors[0].groups.map((g) => g.id)).toEqual([2, 20])
  })
})
