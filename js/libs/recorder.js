// ==========================================
// CIEE TASK MINER (Rastreador Unificado Global)
// ==========================================

function registrarAcaoGlobal(tipo, detalhes) {
    const logEntry = {
        hora: new Date().toLocaleTimeString('pt-BR'),
        origem: window.location.hostname.replace('web.ciee.org.br', 'Kairós').replace('cieerj.zendesk.com', 'Zendesk').replace('localhost', 'Hub').replace('', 'Hub Web'),
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
    if (el.tagName === 'BODY' || el.tagName === 'HTML' || el.tagName === 'DIV' && !el.className) return;

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

// 3. Atalho Secreto para Exportar (Ctrl + Shift + Y)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'Y') {
        e.preventDefault();
        
        chrome.storage.local.get({ 'ciee_global_miner': [] }, (res) => {
            let logs = res.ciee_global_miner;
            if (logs.length === 0) return alert("Nenhuma ação registrada ainda.");

            let relatorio = "=== MAPEAMENTO GLOBAL DE TAREFAS (Zendesk -> Hub -> Kairós) ===\n\n";
            logs.forEach((log, index) => {
                let siteFormatado = log.origem.includes('extension') ? 'CIEE Hub' : log.origem;
                relatorio += `${index + 1}. [${log.hora}] Site: ${siteFormatado} | Tela: ${log.tela}\n   -> ${log.acao}: ${log.alvo}\n\n`;
            });

            const blob = new Blob([relatorio], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Mapeamento_E2E_${new Date().getTime()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Limpa o caderno após exportar
            chrome.storage.local.set({ 'ciee_global_miner': [] });
            alert("✅ Mapeamento Global exportado com sucesso! Os logs foram zerados.");
        });
    }
});