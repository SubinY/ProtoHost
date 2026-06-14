/** Ported from ShareController.java — keep in sync with Java. */

export function buildHtmlInjection(viewToken: string | null | undefined): string {
  return (
    '<script>(function(){' +
    "var vt='" +
    viewToken +
    "'||new URLSearchParams(location.search).get('viewToken');" +
    'if(!vt)return;' +
    "function addVt(u){if(!u||u.indexOf('viewToken')>=0||/^(https?:|\\/\\/|data:|#|about:)/.test(u))return u;" +
    "return u+(u.indexOf('?')>=0?'&':'?')+'viewToken='+vt;}" +
    'var _open=XMLHttpRequest.prototype.open;' +
    'XMLHttpRequest.prototype.open=function(m,u){return _open.apply(this,[m,addVt(u)].concat([].slice.call(arguments,2)));};' +
    'var _fetch=window.fetch;' +
    "window.fetch=function(u,o){return _fetch.call(this,typeof u==='string'?addVt(u):u,o);};" +
    "try{var ld=Object.getOwnPropertyDescriptor(Location.prototype,'href');" +
    "Object.defineProperty(location,'href',{set:function(u){ld.set.call(this,addVt(u));},get:function(){return ld.get.call(this);}});}catch(e){}" +
    "try{var sd=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'src');" +
    "Object.defineProperty(HTMLIFrameElement.prototype,'src',{set:function(u){sd.set.call(this,addVt(u));},get:function(){return sd.get.call(this);}});}catch(e){}" +
    'window.__addVt=addVt;' +
    '})();</script>'
  )
}

export function injectHtml(html: string, viewToken: string | null | undefined): string {
  const injection = buildHtmlInjection(viewToken)
  return html.replace('</head>', injection + '</head>')
}

export function injectAxplayerJs(js: string, viewToken: string): string {
  const vt = viewToken
  return js
    .replace(
      'mainFrame.contentWindow.location.href = linkUrlWithVars;',
      "mainFrame.contentWindow.location.href = linkUrlWithVars+(linkUrlWithVars.indexOf('?')>=0?'&':'?')+'viewToken=" +
        vt +
        "';",
    )
    .replace(
      'mainFrame.contentWindow.location.href = urlToLoad;',
      "mainFrame.contentWindow.location.href = urlToLoad+(urlToLoad&&urlToLoad!='about:blank'?(urlToLoad.indexOf('?')>=0?'&':'?')+'viewToken=" +
        vt +
        "':'');",
    )
    .replace(
      'mainFrame.contentWindow.location.href = urlWithVars;',
      "mainFrame.contentWindow.location.href = urlWithVars+(urlWithVars.indexOf('?')>=0?'&':'?')+'viewToken=" +
        vt +
        "';",
    )
}

export function injectDocJs(js: string, viewToken: string): string {
  const vt = viewToken
  return js
    .replace(
      "targetLocation.href = targetUrl || 'about:blank';",
      "targetLocation.href = (targetUrl&&targetUrl!='about:blank'?(targetUrl+(targetUrl.indexOf('?')>=0?'&':'?')+'viewToken=" +
        vt +
        "'):'about:blank');",
    )
    .replace(
      'targetLocation.href = $axure.utils.getReloadPath() + "?" + encodeURI(targetUrl);',
      "targetLocation.href = $axure.utils.getReloadPath() + \"?\" + encodeURI(targetUrl) + '&viewToken=" +
        vt +
        "';",
    )
    .replace(
      'window.location.href = targetUrl;',
      "window.location.href = targetUrl+(targetUrl.indexOf('?')>=0?'&':'?')+'viewToken=" + vt + "';",
    )
}

export function detectContentType(filePath: string): string {
  if (filePath.endsWith('.html') || filePath.endsWith('.htm')) return 'text/html; charset=utf-8'
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8'
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8'
  if (filePath.endsWith('.png')) return 'image/png'
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg'
  if (filePath.endsWith('.svg')) return 'image/svg+xml'
  if (filePath.endsWith('.woff2')) return 'font/woff2'
  if (filePath.endsWith('.woff')) return 'font/woff'
  if (filePath.endsWith('.ttf')) return 'font/ttf'
  if (filePath.endsWith('.json')) return 'application/json'
  if (filePath.endsWith('.gif')) return 'image/gif'
  if (filePath.endsWith('.ico')) return 'image/x-icon'
  return 'application/octet-stream'
}
