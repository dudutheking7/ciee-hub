(() => {
  if (window.__CIEE_DESKTOP_SHIM__) return;
  window.__CIEE_DESKTOP_SHIM__ = true;

  const context = window.__CIEE_DESKTOP_CONTEXT__ || { kind: 'unknown', tabId: null };
  let seq = 1;
  const pending = new Map();
  const listeners = [];
  const makeId = () => `${context.kind}-${context.tabId ?? 'hub'}-${Date.now()}-${seq++}`;

  function post(op, payload) {
    return new Promise((resolve, reject) => {
      const requestId = makeId();
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`Timeout Desktop API: ${op}`));
      }, 30000);
      pending.set(requestId, { resolve, reject, timer });
      window.chrome.webview.postMessage({ bridge:'ciee-desktop', op, requestId, payload, context });
    });
  }

  window.__cieeDesktopResolve = function(requestId, data, error) {
    const p = pending.get(requestId);
    if (!p) return;
    clearTimeout(p.timer); pending.delete(requestId);
    if (error) p.reject(new Error(error)); else p.resolve(data);
  };

  window.__cieeDesktopReceiveMessage = async function(message, sender, requestId) {
    let answered = false;
    const sendResponse = (value) => {
      if (answered) return;
      answered = true;
      window.chrome.webview.postMessage({bridge:'ciee-desktop', op:'runtimeResponse', requestId, payload:value, context});
    };
    for (const fn of [...listeners]) {
      try {
        const ret = fn(message, sender || {}, sendResponse);
        if (ret && typeof ret.then === 'function') ret.then(v => { if (v !== undefined) sendResponse(v); }).catch(() => {});
        else if (ret !== true && ret !== undefined && !answered) sendResponse(ret);
      } catch (e) { console.error('[Desktop runtime listener]', e); }
    }
    if (!answered) setTimeout(() => sendResponse(undefined), 30);
  };

  function callbackify(promise, callback) {
    if (typeof callback === 'function') {
      promise.then(v => callback(v)).catch(err => {
        chrome.runtime.lastError = { message: err.message };
        try { callback(undefined); } finally { setTimeout(() => chrome.runtime.lastError = null, 0); }
      });
    }
    return promise;
  }

  const storageArea = area => ({
    get(keys, cb) { return callbackify(post('storage.get', {area, keys}), cb); },
    set(items, cb) { return callbackify(post('storage.set', {area, items}).then(() => undefined), cb); },
    remove(keys, cb) { return callbackify(post('storage.remove', {area, keys}).then(() => undefined), cb); },
    clear(cb) { return callbackify(post('storage.clear', {area}).then(() => undefined), cb); }
  });

  const runtime = {
    lastError: null,
    getURL(path='') { return `https://app.cieehub.local/${String(path).replace(/^\//,'')}`; },
    onMessage: {
      addListener(fn){ if (typeof fn === 'function' && !listeners.includes(fn)) listeners.push(fn); },
      removeListener(fn){ const i=listeners.indexOf(fn); if(i>=0) listeners.splice(i,1); },
      hasListener(fn){ return listeners.includes(fn); }
    },
    sendMessage(message, cb) { return callbackify(post('runtime.sendMessage', {message}), cb); }
  };

  const tabs = {
    query(queryInfo, cb){ return callbackify(post('tabs.query', queryInfo || {}), cb); },
    create(createProperties, cb){ return callbackify(post('tabs.create', createProperties || {}), cb); },
    update(tabId, updateProperties, cb){
      if (typeof tabId === 'object') { cb = updateProperties; updateProperties = tabId; tabId = null; }
      return callbackify(post('tabs.update', {tabId, updateProperties:updateProperties || {}}), cb);
    },
    get(tabId, cb){ return callbackify(post('tabs.get', {tabId}), cb); },
    sendMessage(tabId, message, cb){ return callbackify(post('tabs.sendMessage', {tabId, message}), cb); }
  };

  const downloads = {
    download(options, cb){
      try {
        const a=document.createElement('a'); a.href=options.url; if(options.filename) a.download=options.filename;
        a.style.display='none'; document.documentElement.appendChild(a); a.click(); a.remove();
        if (cb) cb(1); return Promise.resolve(1);
      } catch(e) { if(cb) cb(undefined); return Promise.reject(e); }
    }
  };

  const debuggerApi = {
    attach(target, version, cb){ if(cb) cb(); return Promise.resolve(); },
    detach(target, cb){ if(cb) cb(); return Promise.resolve(); },
    sendCommand(target, method, params, cb){ return callbackify(post('debugger.sendCommand',{target,method,params}), cb); }
  };

  const existing = window.chrome || {};
  window.chrome = Object.assign(existing, {
    runtime,
    extension: { getURL: runtime.getURL },
    storage: { local:storageArea('local'), sync:storageArea('sync') },
    tabs,
    downloads,
    debugger:debuggerApi
  });

  window.addEventListener('error', e => {
    try { window.chrome.webview.postMessage({bridge:'ciee-desktop',op:'log',payload:{level:'error',message:e.message},context}); } catch {}
  });
  console.log('[CIEE Desktop] Chrome compatibility bridge ativo.', context);
})();
