// =========================================================================
// ARQUIVO: /js/content/talentos-automations.js
// MÓDULO: Automações para o Portal de Talentos (Radix UI)
// =========================================================================

// --- 1. BYPASS DE PREENCHIMENTO DO REACT ---
window.setReactInputValue = function(input, value) {
    if (!input) return false;
    input.focus();
    let lastValue = input.value; 
    input.value = value;
    let tracker = input._valueTracker; 
    if (tracker) tracker.setValue(lastValue);
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    input.blur();
    return true;
};

// --- 2. CALCULADORA DE SLA (DIAS ÚTEIS) ---
window.calcularSLA = function(diasUteis) {
    let count = 0;
    let d = new Date();
    while (count < diasUteis) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

window.obterDataHoje = function() {
    let d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// --- 3. MOTOR DE CLIQUES DO RADIX UI ---
window.preencherRadixSelect = async function(buttonId, textoOpcao) {
    const btn = document.getElementById(buttonId);
    if (!btn) return false;
    
    btn.click(); // Abre a cortina
    await new Promise(r => setTimeout(r, 200)); 
    
    const options = Array.from(document.querySelectorAll('[role="option"]'));
    if (options.length === 0) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
        return false;
    }
    
    const alvo = options.find(el => el.innerText.trim().toLowerCase().includes(textoOpcao.toLowerCase()));
    
    if (alvo) {
        alvo.click();
        await new Promise(r => setTimeout(r, 200));
        return true;
    }
    
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    return false;
};

// --- 4. ORQUESTRADOR DE INJEÇÃO ---
window.executarInjecaoPortal = async function(dados) {
    const modalAberto = document.querySelector('[role="dialog"]');

    if (modalAberto && document.getElementById('checkpoint-status')) {
        // PREENCHE CHECKPOINT
        window.setReactInputValue(document.getElementById('checkpoint-data'), window.obterDataHoje());
        await window.preencherRadixSelect('checkpoint-status', dados.status);
        await window.preencherRadixSelect('checkpoint-classificacao', dados.classificacao);
        window.setReactInputValue(document.getElementById('checkpoint-retornar-em'), window.calcularSLA(dados.dias_sla));
        window.setReactInputValue(document.getElementById('checkpoint-ticket'), dados.ticket);
        window.setReactInputValue(document.getElementById('checkpoint-observacao'), dados.log);
        
    } else if (document.getElementById('followup-categoria')) {
        // PREENCHE FOLLOW-UP
        await window.preencherRadixSelect('followup-categoria', dados.categoria);
        window.setReactInputValue(document.getElementById('followup-descricao'), dados.log);
    }
};

// --- 5. COMUNICAÇÃO COM O HUB ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.acao === "injetarPortalTalentos") {
        window.executarInjecaoPortal(request.dados)
            .then(() => sendResponse({ sucesso: true }))
            .catch(err => {
                console.error("Erro no Portal de Talentos:", err);
                sendResponse({ sucesso: false });
            });
        return true; // Mantém a porta aberta para a resposta assíncrona
    }
});