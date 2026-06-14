import { describe, it, expect } from 'vitest'
import {
  injectAxplayerJs,
  injectDocJs,
  injectHtml,
  detectContentType,
} from '../src/modules/share/axure-injector.js'

describe('axure-injector', () => {
  it('injectHtml', () => {
    const html = '<html><head><title>x</title></head><body></body></html>'
    const out = injectHtml(html, 'vt123')
    expect(out).toContain('vt123')
    expect(out).toContain('XMLHttpRequest.prototype.open')
  })

  it('injectAxplayerJs replaces 3 patterns', () => {
    const js =
      'mainFrame.contentWindow.location.href = linkUrlWithVars;' +
      'mainFrame.contentWindow.location.href = urlToLoad;' +
      'mainFrame.contentWindow.location.href = urlWithVars;'
    const out = injectAxplayerJs(js, 'vt')
    expect(out).not.toBe(js)
    expect(out.match(/viewToken=vt/g)?.length).toBe(3)
  })

  it('injectDocJs replaces 3 patterns', () => {
    const js =
      "targetLocation.href = targetUrl || 'about:blank';" +
      'targetLocation.href = $axure.utils.getReloadPath() + "?" + encodeURI(targetUrl);' +
      'window.location.href = targetUrl;'
    const out = injectDocJs(js, 'vt')
    expect(out.match(/viewToken=vt/g)?.length).toBe(3)
  })

  it('detectContentType', () => {
    expect(detectContentType('a.html')).toContain('text/html')
    expect(detectContentType('a.js')).toContain('javascript')
    expect(detectContentType('a.png')).toBe('image/png')
  })
})
