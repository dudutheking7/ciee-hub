// =========================================================================
// /js/content/mod-menu.js - CIEE Hub PRO V2.0 (Eventos Corrigidos + Botão Stop)
// =========================================================================

// --- SISTEMA KEEP-ALIVE (Anti-Deslogamento) ---
setInterval(() => {
    const url = window.location.href;
    if (url.includes('ciee.org.br') || url.includes('zendesk.com')) {
        fetch(url, { method: 'HEAD', cache: 'no-cache' }).catch(() => {});
    }
}, 600000);

// --- SISTEMA DE TOAST BLINDADO ---
window.showCieeToast = function(msg, type = 'success') {
    let container = document.getElementById('ciee-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'ciee-toast-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; gap: 10px; pointer-events: none; max-width: 320px; overflow: hidden; box-sizing: border-box;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    let bg = type === 'success' ? 'rgba(16, 185, 129, 0.95)' : (type === 'error' ? 'rgba(239, 68, 68, 0.95)' : (type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(59, 130, 246, 0.95)'));
    
    toast.style.cssText = `background: ${bg}; color: #fff; padding: 12px 16px; border-radius: 8px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 13px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.2); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); transform: translateX(120%); transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); pointer-events: auto; word-break: break-word;`;
    toast.innerText = msg;
    
    container.appendChild(toast);
    
    setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 10);
    setTimeout(() => { 
        toast.style.transform = 'translateX(120%)'; 
        setTimeout(() => toast.remove(), 300); 
    }, 4000);
};

window.safeSendMessage = function(acaoStr, payloadData) {
    try {
        chrome.runtime.sendMessage({ acao: acaoStr, payload: payloadData });
        return true;
    } catch (e) {
        if (e.message.includes("Extension context invalidated")) {
            window.showCieeToast("⚠️ Extensão atualizada! Atualize esta página (F5) para continuar.", "error");
        } else {
            window.showCieeToast("Erro de conexão com o Hub.", "error");
            console.error(e);
        }
        return false;
    }
};

window.toggleAntiLag = function() {
    let styleId = 'ciee-anti-lag-style';
    let target = document.getElementById(styleId);
    if(target) {
        target.remove(); 
        window.showCieeToast("⚡ Anti-Lag DESATIVADO", "warning"); 
        return false;
    } else {
        let style = document.createElement('style'); style.id = styleId;
        style.innerHTML = `* { transition-duration: 0.001s !important; animation-duration: 0.001s !important; scroll-behavior: auto !important; }`;
        document.head.appendChild(style); 
        window.showCieeToast("⚡ Anti-Lag ATIVADO", "success"); 
        return true;
    }
};

// --- ATALHO PARA OCULTAR/MOSTRAR O MENU (Alt + H) ---
window.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'h') {
        const host = document.getElementById('ciee-mod-menu-host');
        if (host) {
            if (host.style.display === 'none') {
                host.style.display = 'block';
                window.showCieeToast("🤖 Mod Menu Ativado", "info");
            } else {
                host.style.display = 'none';
                window.showCieeToast("🤖 Mod Menu Oculto (Alt+H para voltar)", "warning");
            }
        }
    }
});

// --- MENU V2.0 (SHADOW DOM + TABS + GLASSMORPHISM + OPTIONS) ---
window.injectKairosModMenu = function() {
    const url = window.location.href;
    const isZendesk = url.includes('zendesk.com');
    const isAirtable = url.includes('airtable.com');
    
    // Talentos isolado do CIEE principal
    const isTalentos = url.includes('talentos.cieerj.org.br');
    const isCiee = (url.includes('ciee.org.br') || url.includes('cieerj.org.br') || url.includes('kairos')) && !isTalentos;
    const isSharepoint = false; // Temporariamente desligado

    if (!isZendesk && !isCiee && !isSharepoint && !isAirtable && !isTalentos) return;
    if (!document.body || window.innerWidth < 300) return;
    if (document.getElementById('ciee-mod-menu-host')) return;

    // Conecta com o Banco de Dados do Chrome para ler as opções do usuário
    chrome.storage.sync.get({
        menuScale: 100,
        botoesAtivos: {
            etapa: true, inj_padrao: true, log: true, cv: true, csv: true, antilag: true
        }
    }, function(configs) {
        
        if (document.getElementById('ciee-mod-menu-host')) return;

        const host = document.createElement('div');
        host.id = 'ciee-mod-menu-host';
        
        const scaleValue = configs.menuScale / 100;
        host.style.cssText = `position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; width: 260px; transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); pointer-events: none; transform: scale(${scaleValue}); transform-origin: bottom right;`;
        document.body.appendChild(host);

        const shadow = host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            * { box-sizing: border-box; font-family: 'Segoe UI', system-ui, sans-serif; }
            .panel { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); overflow: hidden; pointer-events: auto; display: flex; flex-direction: column; }
            .header { color: #fff; font-size: 13px; font-weight: 600; padding: 12px 16px; cursor: grab; background: rgba(0,0,0,0.25); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
            .header:active { cursor: grabbing; }
            .toggle-btn { cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: rgba(255,255,255,0.05); transition: 0.2s; }
            .toggle-btn:hover { background: rgba(255,255,255,0.15); }
            .body-container { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
            .tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 6px; }
            .tab { flex: 1; text-align: center; padding: 6px 0; color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; border-bottom: 2px solid transparent; }
            .tab:hover { color: #fff; background: rgba(255,255,255,0.05); }
            .tab.active { color: #fff; border-bottom: 2px solid #3b82f6; }
            .tab-content { display: none; flex-direction: column; gap: 8px; }
            .tab-content.active { display: flex; }
            .btn { width: 100%; text-align: left; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; color: #fff; transition: all 0.2s ease; outline: none; }
            .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); filter: brightness(1.2); }
            .btn:active { transform: translateY(0); }
            .btn-green { background: rgba(40, 167, 69, 0.2); border: 1px solid rgba(40, 167, 69, 0.5); }
            .btn-orange { background: rgba(253, 126, 20, 0.2); border: 1px solid rgba(253, 126, 20, 0.5); }
            .btn-blue { background: rgba(0, 123, 255, 0.2); border: 1px solid rgba(0, 123, 255, 0.5); }
            .btn-pink { background: rgba(232, 62, 140, 0.2); border: 1px solid rgba(232, 62, 140, 0.5); }
            .btn-purple { background: rgba(111, 66, 193, 0.2); border: 1px solid rgba(111, 66, 193, 0.5); }
            .btn-cyan { background: rgba(23, 162, 184, 0.2); border: 1px solid rgba(23, 162, 184, 0.5); }
            .btn-gray { background: rgba(108, 117, 125, 0.2); border: 1px solid rgba(108, 117, 125, 0.5); }
            /* Nova classe pro Botão Stop */
            .btn-red { background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); }
            
            .empty-msg { color: rgba(255,255,255,0.5); font-size: 11px; text-align: center; padding: 10px 0; font-style: italic; }
        `;
        shadow.appendChild(style);

        const panel = document.createElement('div');
        panel.className = 'panel';

        // 🛡️ A CORREÇÃO DO EVENT BUBBLING DO PORTAL DE TALENTOS:
        // Impede que qualquer clique dentro do menu vaze para o site que está atrás dele.
        ['mousedown', 'pointerdown', 'mouseup', 'pointerup', 'click'].forEach(evt => {
            panel.addEventListener(evt, e => e.stopPropagation());
        });

        const header = document.createElement('div');
        header.className = 'header';
        header.innerHTML = `<span>🤖 Hub PRO</span><div class="toggle-btn" id="toggle">➖</div>`;
        panel.appendChild(header);

        const bodyContainer = document.createElement('div');
        bodyContainer.className = 'body-container';

        const createBtn = (text, theme, onClickAction) => {
            const btn = document.createElement('button');
            btn.className = `btn btn-${theme}`;
            btn.innerText = text;
            if(onClickAction) {
                btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); onClickAction(btn); };
            }
            return btn;
        };

        if (isCiee) {
            const tabsDiv = document.createElement('div');
            tabsDiv.className = 'tabs';
            tabsDiv.innerHTML = `
                <div class="tab active" data-target="tab-acoes">🚀 Ações</div>
                <div class="tab" data-target="tab-dados">🗃️ Dados</div>
                <div class="tab" data-target="tab-apoio">⚙️ Apoio</div>
            `;
            bodyContainer.appendChild(tabsDiv);

            // Aba 1: Ações
            const tabAcoes = document.createElement('div');
            tabAcoes.className = 'tab-content active';
            tabAcoes.id = 'tab-acoes';
            if (configs.botoesAtivos.etapa) tabAcoes.appendChild(createBtn('⚙️ Criar Etapa Completa', 'orange', typeof window.preencherEtapaUnificadaKairos === 'function' ? window.preencherEtapaUnificadaKairos : () => {}));
		if (configs.botoesAtivos.abertura_ia !== false) 
                tabAcoes.appendChild(createBtn('🚀 Preencher Vaga (IA)', 'blue', typeof window.executarRoboAberturaVaga === 'function' ? window.executarRoboAberturaVaga : () => {}));
           
            if (configs.botoesAtivos.inj_padrao) tabAcoes.appendChild(createBtn('📞 Injetar Contato (Padrão)', 'purple', typeof window.injetarContatoVagaPadrao === 'function' ? window.injetarContatoVagaPadrao : () => {}));
            if (configs.botoesAtivos.log) tabAcoes.appendChild(createBtn('📝 Colar Log (+7 Dias)', 'green', typeof window.injetarLogKairos === 'function' ? window.injetarLogKairos : () => {}));
            if (tabAcoes.children.length === 0) tabAcoes.innerHTML = '<div class="empty-msg">Nenhuma função ativa</div>';
            bodyContainer.appendChild(tabAcoes);


            // Aba 2: Dados
            const tabDados = document.createElement('div');
            tabDados.className = 'tab-content';
            tabDados.id = 'tab-dados';
            
            // Lógica dos Botões do Robô de CV (Iniciar e Parar)
            if (configs.botoesAtivos.cv) {
                tabDados.appendChild(createBtn('🤖 Iniciar Robô CVs', 'blue', typeof window.baixarCurriculosKairos === 'function' ? window.baixarCurriculosKairos : () => {}));
                
                tabDados.appendChild(createBtn('🛑 Parar Robô CVs', 'red', () => { 
                    window.isRoboCVParado = true; // Injeta a flag global de parada
                    if (typeof window.pararRoboCurriculos === 'function') {
                        window.pararRoboCurriculos(); 
                    }
                    window.showCieeToast("Sinal de parada enviado ao robô!", "warning");
                }));
            }

            if (configs.botoesAtivos.csv) tabDados.appendChild(createBtn('☎️ Extrair Contatos (CSV)', 'pink', typeof window.extrairContatosKairos === 'function' ? window.extrairContatosKairos : () => {}));
            if (tabDados.children.length === 0) tabDados.innerHTML = '<div class="empty-msg">Nenhuma função ativa</div>';
            bodyContainer.appendChild(tabDados);

            // Aba 3: Apoio
            const tabApoio = document.createElement('div');
            tabApoio.className = 'tab-content';
            tabApoio.id = 'tab-apoio';
            
            if (configs.botoesAtivos.antilag) {
                if (!document.getElementById('ciee-anti-lag-style')) {
                    let styleAl = document.createElement('style'); styleAl.id = 'ciee-anti-lag-style';
                    styleAl.innerHTML = `* { transition-duration: 0.001s !important; animation-duration: 0.001s !important; scroll-behavior: auto !important; }`;
                    document.head.appendChild(styleAl);
                }
                tabApoio.appendChild(createBtn('⚡ Anti-Lag: ON', 'cyan', (btn) => { 
                    let isOn = window.toggleAntiLag(); 
                    btn.innerText = isOn ? '⚡ Anti-Lag: ON' : '⚡ Anti-Lag: OFF'; 
                    btn.className = isOn ? 'btn btn-cyan' : 'btn btn-gray';
                }));
            }
            if (tabApoio.children.length === 0) tabApoio.innerHTML = '<div class="empty-msg">Nenhuma função ativa</div>';
            bodyContainer.appendChild(tabApoio);

            const tabs = tabsDiv.querySelectorAll('.tab');
            const contents = bodyContainer.querySelectorAll('.tab-content');
            tabs.forEach(tab => {
                tab.onclick = (e) => {
                    e.stopPropagation();
                    tabs.forEach(t => t.classList.remove('active'));
                    contents.forEach(c => c.classList.remove('active'));
                    tab.classList.add('active');
                    shadow.getElementById(tab.getAttribute('data-target')).classList.add('active');
                };
            });

        } else if (isTalentos) {
            bodyContainer.appendChild(createBtn('🔗 Capturar Link/Senha', 'purple', typeof capturarLinkTalentos === 'function' ? capturarLinkTalentos : () => {}));
        } else if (isSharepoint) {
            bodyContainer.appendChild(createBtn('🪄 Sniper de SharePoint', 'green', typeof sincronizarFechamentoSharePoint === 'function' ? sincronizarFechamentoSharePoint : () => {}));
        } else if (isAirtable) {
            bodyContainer.appendChild(createBtn('🟣 Escanear Vaga', 'purple', typeof extrairAirtableDireto === 'function' ? extrairAirtableDireto : () => {}));
        } else if (isZendesk) {
            bodyContainer.appendChild(createBtn('🎯 Escanear Ticket', 'green', typeof extrairZendeskDireto === 'function' ? extrairZendeskDireto : () => {}));
            bodyContainer.appendChild(createBtn('🤖 Escanear com IA (Beta)', 'blue', typeof extrairZendeskComIA === 'function' ? extrairZendeskComIA : () => {}));
        }

        panel.appendChild(bodyContainer);
        shadow.appendChild(panel);

        let isMinimized = false;
        const toggleBtn = shadow.getElementById('toggle');
        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            isMinimized = !isMinimized;
            bodyContainer.style.display = isMinimized ? 'none' : 'flex';
            toggleBtn.innerText = isMinimized ? '➕' : '➖';
            host.style.width = isMinimized ? '140px' : '260px';
        };

        let isDragging = false; 
        let currentX = 0, currentY = 0, initialX = 0, initialY = 0; 
        let xOffset = 0, yOffset = 0;
        
        header.onmousedown = function(e) { 
            e.stopPropagation();
            if(e.target === toggleBtn) return; 
            initialX = e.clientX - xOffset; 
            initialY = e.clientY - yOffset; 
            isDragging = true; 
            header.style.cursor = 'grabbing';
        };
        
        window.addEventListener('mouseup', () => { 
            if (isDragging) { 
                initialX = currentX; 
                initialY = currentY; 
                isDragging = false; 
                header.style.cursor = 'grab';
            } 
        }, true);
        
        window.addEventListener('mousemove', (e) => {
            if (isDragging) { 
                e.preventDefault(); 
                currentX = e.clientX - initialX; 
                currentY = e.clientY - initialY; 
                xOffset = currentX; 
                yOffset = currentY; 
                host.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(${scaleValue})`; 
            }
        }, true);
    });
};

setInterval(window.injectKairosModMenu, 2000);