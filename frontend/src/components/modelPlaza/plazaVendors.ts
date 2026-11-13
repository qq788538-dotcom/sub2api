// 模型价格页按厂商分标签：ChatGPT / Claude / Gemini / Grok / 国产模型。
import type { ModelPlazaGroup } from '@/api/modelPlaza'
import type { GroupPlatform } from '@/types'

export type PlazaVendorKey = 'chatgpt' | 'claude' | 'gemini' | 'grok' | 'domestic' | 'other'

export interface PlazaVendor {
  key: PlazaVendorKey
  label: string
  icon: GroupPlatform
  groups: ModelPlazaGroup[]
}

const VENDORS: { key: PlazaVendorKey; label: string; icon: GroupPlatform }[] = [
  { key: 'chatgpt', label: 'ChatGPT', icon: 'openai' },
  { key: 'claude', label: 'Claude', icon: 'anthropic' },
  { key: 'gemini', label: 'Gemini', icon: 'gemini' },
  { key: 'grok', label: 'Grok', icon: 'grok' as GroupPlatform },
  { key: 'domestic', label: '国产模型', icon: 'deepseek' as GroupPlatform },
  { key: 'other', label: '其他', icon: 'openai' }
]

const OPENAI_MODEL = /^(gpt|codex|o\d|chatgpt|dall-e|text-embedding)/i

/** OpenAI 兼容平台上只提供国产模型（GLM、Kimi 等）的分组归到「国产模型」。 */
export function plazaVendorOf(group: ModelPlazaGroup): PlazaVendorKey {
  switch (group.platform) {
    case 'anthropic':
      return 'claude'
    case 'gemini':
    case 'antigravity':
      return 'gemini'
    case 'grok':
      return 'grok'
    case 'deepseek':
      return 'domestic'
    case 'openai':
      return group.models.some((m) => OPENAI_MODEL.test(m.name)) ? 'chatgpt' : 'domestic'
    default:
      return 'other'
  }
}

/** 只返回有分组的厂商；组内按生效倍率升序、同倍率按名称。 */
export function groupPlazaVendors(
  groups: ModelPlazaGroup[],
  rateOf: (g: ModelPlazaGroup) => number
): PlazaVendor[] {
  return VENDORS.map((v) => ({
    ...v,
    groups: groups
      .filter((g) => plazaVendorOf(g) === v.key)
      .sort((a, b) => rateOf(a) - rateOf(b) || a.name.localeCompare(b.name))
  })).filter((v) => v.groups.length > 0)
}
