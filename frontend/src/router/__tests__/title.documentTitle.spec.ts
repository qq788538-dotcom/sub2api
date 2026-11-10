import { describe, expect, it } from 'vitest'
import { resolveRouteDocumentTitle } from '@/router/title'
import { QQDAO_SEO_PAGES } from '@/qqdaoSeo'

describe('resolveRouteDocumentTitle documentTitle', () => {
  it('uses documentTitle verbatim for SEO pages', () => {
    const title = resolveRouteDocumentTitle(
      { name: 'Guide', params: {}, meta: { title: 'User Guide', documentTitle: QQDAO_SEO_PAGES.guide.title } },
      'QQ岛'
    )
    expect(title).toBe(QQDAO_SEO_PAGES.guide.title)
  })

  it('keeps the normal title + site name without documentTitle', () => {
    const title = resolveRouteDocumentTitle({ name: 'Keys', params: {}, meta: { title: 'API Keys' } }, 'QQ岛')
    expect(title).not.toBe('API Keys')
    expect(title).toContain('QQ岛')
  })
})
