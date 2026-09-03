// ==========================================
// CIEE TASK MINER (Rastreador Unificado Global - CORRIGIDO)
// ==========================================

function getSiteName() {
    let host = window.location.hostname;
    if (host.includes('ciee.org.br')) return 'Kairós';
    if (host.includes('zendesk.com')) return 'Zendesk';
    if (host.includes('localhost') || host === '') return 'CIEE Hub';
    return host || 'Hub/Extensão';
}

function registrarAcaoGlobal(tipo, detalhes) {
    const logEntry = {
        hora: new Date().toLocaleTimeString('pt-BR'),
        origem: getSiteName(),
        tela: window.location.pathname,
        acao: tipo,
        alvo: detalhes
    };

    // Puxa o caderno global, anota e guarda de novo
    chrome.storage.local.get({ 'ciee_global_miner': [] }, (res) => {
        let logs = res.ciee_global_miner;
        logs.push(logEntry);
        chrome.storage.local.set({ 'ciee_global_miner': logs });
    });
}

// 1. Rastrear Cliques (Onde o mouse vai)
document.addEventListener('click', (e) => {
    let el = e.target;
    if (el.tagName === 'BODY' || el.tagName === 'HTML' || (el.tagName === 'DIV' && !el.className && !el.id)) return;

    let info = el.tagName;
    if (el.id) info += ` (ID: ${el.id})`;
    else if (el.className && typeof el.className === 'string') info += ` (Class: ${el.className.split(' ')[0]})`;
    
    if (el.innerText && el.innerText.length < 40) info += ` -> Texto: "${el.innerText.trim()}"`;
    else if (el.value) info += ` -> Valor: "${el.value}"`;

    registrarAcaoGlobal("CLIQUE", info);
}, true);

// 2. Rastrear Digitação (O que você preenche nos campos)
document.addEventListener('change', (e) => {
    let el = e.target;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        let identificador = el.id ? `ID: ${el.id}` : (el.name ? `Name: ${el.name}` : el.tagName);
        registrarAcaoGlobal("PREENCHEU", `${identificador} => Digitou/Marcou: "${el.value}"`);
    }
}, true);

// Variável de trava para evitar múltiplos downloads se a página tiver Iframes
let isExporting = false;

// 3. Atalhos Secretos (Exportar e Limpar)
document.addEventListener('keydown', (e) => {
    
    // ==========================================
    // EXPORTAR E LIMPAR: Ctrl + Shift + Y
    // ==========================================
    if (e.ctrlKey && e.shiftKey && e.key === 'Y') {
        e.preventDefault();
        if (isExporting) return;
        isExporting = true;
        
        chrome.storage.local.get({ 'ciee_global_miner': [] }, (res) => {
            let logs = res.ciee_global_miner;
            if (logs.length === 0) {
                isExporting = false;
                return alert("Nenhuma ação registrada ainda.");
            }

            let relatorio = "=== MAPEAMENTO GLOBAL DE TAREFAS (Zendesk -> Hub -> Kairós) ===\n\n";
            logs.forEach((log, index) => {
                relatorio += `${index + 1}. [${log.hora}] Site: ${log.origem} | Tela: ${log.tela}\n   -> ${log.acao}: ${log.alvo}\n\n`;
            });

            const blob = new Blob([relatorio], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Mapeamento_E2E_${new Date().getTime()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // MÁGICA DA LIMPEZA GARANTIDA (Com Callback)
            chrome.storage.local.set({ 'ciee_global_miner': [] }, () => {
                alert("✅ Mapeamento Global exportado com sucesso! Os logs foram zerados para a próxima gravação.");
                setTimeout(() => { isExporting = false; }, 1000); // Libera a trava
            });
        });
    }

    // ==========================================
    // APENAS LIMPAR O CACHE SILENCIOSAMENTE: Ctrl + Shift + X
    // ==========================================
    if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        chrome.storage.local.set({ 'ciee_global_miner': [] }, () => {
            alert("🧹 Memória do Rastreador ZERADA! Pode começar o novo teste limpo.");
        });
    }
});