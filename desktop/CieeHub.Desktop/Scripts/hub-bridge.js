(() => {
  if (window.CieeHubBridge?.version === '0.1.0') return;

  const send = (type, message, data = null) => {
    const payload = { type, message, data, href: location.href, ts: Date.now() };
    try {
      window.chrome?.webview?.postMessage(payload);
    } catch (err) {
      console.warn('[CIEE Hub Desktop] Falha ao enviar mensagem ao host', err, payload);
    }
    return payload;
  };

  const visible = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };

  const probe = () => {
    const href = location.href;
    const host = location.hostname;
    const isKairos = /ciee/i.test(host) && !!document.querySelector('.label-nome, .label-nome-sem-margin, app-curriculum-automatico');
    const isZendesk = /zendesk/i.test(host) || /\/agent\//i.test(location.pathname);
    const hasCvModal = !!Array.from(document.querySelectorAll('app-curriculum-automatico')).find(visible);
    const candidates = Array.from(document.querySelectorAll('.label-nome, .label-nome-sem-margin')).filter(visible).length;

    const result = {
      ok: true,
      title: document.title,
      href,
      host,
      readyState: document.readyState,
      isKairos,
      isZendesk,
      hasCvModal,
      visibleCandidateLabels: candidates
    };

    send('probe', 'Diagnóstico da página concluído.', result);
    return result;
  };

  const observe = () => {
    let timer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const modal = Array.from(document.querySelectorAll('app-curriculum-automatico')).find(visible);
        if (modal) send('kairos', 'Modal de currículo automático detectado.', { textLength: (modal.innerText || '').trim().length });
      }, 250);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'aria-busy'] });
    return observer;
  };

  window.CieeHubBridge = {
    version: '0.1.0',
    send,
    probe,
    visible,
    stop() {
      window.__CIEE_HUB_STOP__ = true;
      window.isRoboCVParado = true;
      send('stop', 'Parada solicitada pelo Hub Desktop.');
    }
  };

  observe();
  send('bridge', 'Ponte WebView2 ↔ página carregada.', { version: window.CieeHubBridge.version });
})();
