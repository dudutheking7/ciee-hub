// ==========================================
// /js/content/sharepoint-sniper.js
// ==========================================

async function sincronizarFechamentoSharePoint() {
    showCieeToast("Iniciando Sniper no SharePoint...", "info");
    
    chrome.runtime.sendMessage({acao: "solicitarVagasSincronia"}, async (response) => {
        if(!response || !response.vagas || response.vagas.length === 0) {
            return showCieeToast("Nenhuma vaga pendente de sincronia no seu Hub.", "warning");
        }

        // Cria o Painel de Auditoria Visual
        let audit = document.createElement('div');
        audit.style.cssText = 'position: fixed; top: 20px; left: 20px; z-index: 2147483647; background: #fff; border: 2px solid #004c99; padding: 15px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); font-family: sans-serif; font-size: 12px; width: 300px; max-height: 80vh; overflow-y: auto; pointer-events: none;';
        audit.innerHTML = '<h4 style="margin:0 0 10px 0; color:#004c99; border-bottom:1px solid #ccc; padding-bottom:5px;">📊 Auditoria SharePoint (V4.0)</h4>';
        document.body.appendChild(audit);
        
        for(let item of response.vagas) {
            let logLine = document.createElement('div');
            logLine.style.marginBottom = '8px';
            logLine.innerHTML = `🔎 Buscando Vaga <strong>${item.vaga}</strong>...`;
            audit.appendChild(logLine);
            
            // Procura a barra de pesquisa nativa do SharePoint
            let searchBox = document.querySelector('input[placeholder*="Pesquisar"], input[aria-label*="Search"], input[aria-label*="Pesquisar"]');
            
            if(searchBox) {
                setReactInputValue(searchBox, item.vaga);
                searchBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                
                // Aguarda o SharePoint fazer o filtro da tabela (Delay seguro)
                await new Promise(r => setTimeout(r, 3500)); 
                logLine.innerHTML = `✅ Filtro aplicado para Vaga <strong>${item.vaga}</strong>.<br><span style="color:#28a745">➜ Atualize a grade e pule para a próxima.</span>`;
            } else {
                logLine.innerHTML = `❌ Erro: Barra de Pesquisa do SharePoint não encontrada.`;
            }
        }
        
        let finalLog = document.createElement('div');
        finalLog.innerHTML = `<br><strong>Sincronização Finalizada.</strong>`;
        audit.appendChild(finalLog);
        
        // Remove a janela após 15 segundos
        setTimeout(() => {
            audit.style.transition = "opacity 1s";
            audit.style.opacity = "0";
            setTimeout(() => audit.remove(), 1000);
        }, 15000);
    });
}