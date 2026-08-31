// =========================================================================
// ARQUIVO: /js/content/zendesk-injector.js
// MÓDULO: Extração de Dados e Injeção de Textos no Zendesk (FIX SPA)
// =========================================================================

// --- 1. FUNÇÕES DE EXTRAÇÃO E LEITURA (OS "OLHOS" DO ROBÔ) ---

window.extrairDadosZendeskCompleto = function() {
    const text = document.querySelector('.zd-comment')?.innerText || window.getSelection().toString() || document.body.innerText || "";
    const urlMatch = window.location.href.match(/\/tickets\/(\d+)/);
    
    let assuntoTicket = "";
    const subjectInput = document.querySelector('input[data-test-id="omni-header-subject"]') || 
                         document.querySelector('input[data-test-id="ticket-pane-subject"]') || 
                         document.querySelector('.ticket-pane-subject');
                         
    if (subjectInput) {
        assuntoTicket = subjectInput.value || subjectInput.innerText || "";
    } else { 
        const titleMatch = document.title.match(/^(.*?)\s*-\s*Ticket/i); 
        if (titleMatch) assuntoTicket = titleMatch[1].trim(); 
    }

    return {
        ticket: urlMatch ? urlMatch[1] : "",
        assunto: assuntoTicket,
        textoCorpo: text
    };
};

window.extrairZendeskDireto = function() {
    const payload = window.extrairDadosZendeskCompleto();
    if (window.safeSendMessage("receberDadosZendesk", payload)) {
        window.showCieeToast("Ticket enviado ao Hub!", "success");
    }
};

window.extrairZendeskComIA = function() {
    const payload = window.extrairDadosZendeskCompleto();
    window.showCieeToast("🧠 Enviando para o Gemini (Shadow Mode)...", "info");
    if (window.safeSendMessage("receberDadosZendeskIA", payload)) {
        window.showCieeToast("Análise de Inteligência Artificial iniciada no Hub!", "success");
    }
};

// --- 2. A PONTE INVISÍVEL (ESCUTA DE EVENTOS) ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.acao === "extrairZendesk") {
        const payload = window.extrairDadosZendeskCompleto();
        sendResponse(payload);
    }

    if (request.acao === "injetarZendesk") {
        console.log("[CIEE Hub] Recebendo ordem de injeção para o Zendesk...");

        // 🛡️ A NOVA TRAVA DE SEGURANÇA SPA (Lê o ticket fisicamente na tela)
        const ticketNaTela = window.extrairDadosZendeskCompleto().ticket;
        
        // Se o Hub exigiu um ticket específico e ele não bate com o da tela, ignora silenciosamente.
        if (request.ticket_alvo && ticketNaTela && request.ticket_alvo !== ticketNaTela) {
            console.log(`[CIEE Hub] Aba ignorada: O alvo era #${request.ticket_alvo}, mas esta aba é #${ticketNaTela}`);
            return true;
        }

        let editores = Array.from(document.querySelectorAll('div[data-test-id="omni-composer-rich-text-editor"], div.ck-content[contenteditable="true"], .zd-comment, div[contenteditable="true"]')).filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });
        
        if (editores.length > 0) { 
            let zendeskEditor = editores[editores.length - 1]; 
            
            zendeskEditor.focus(); 
            
            let isHTML = request.texto.includes('<div') || request.texto.includes('<p>');
            let plainText = isHTML ? request.texto.replace(/<[^>]+>/g, '') : request.texto;
            let formattedHTML = isHTML ? request.texto : request.texto.replace(/\n/g, '<br>');

            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/html', formattedHTML);
            dataTransfer.setData('text/plain', plainText);
            
            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true
            });
            
            zendeskEditor.dispatchEvent(pasteEvent);

            setTimeout(() => {
                if (zendeskEditor.innerText.trim().length < 2) {
                    console.log("[CIEE Hub] Fallback de injeção ativado...");
                    
                    let sel = window.getSelection();
                    let range = document.createRange();
                    range.selectNodeContents(zendeskEditor);
                    range.collapse(false); 
                    sel.removeAllRanges();
                    sel.addRange(range);
                    
                    document.execCommand('insertHTML', false, formattedHTML);
                    
                    zendeskEditor.dispatchEvent(new Event('input', { bubbles: true, composed: true })); 
                    zendeskEditor.dispatchEvent(new Event('change', { bubbles: true, composed: true })); 
                }
            }, 100);

            sendResponse({sucesso: true}); 
        } else { 
            console.warn("[CIEE Hub] Caixa de texto do Zendesk não encontrada ou oculta.");
            sendResponse({sucesso: false, erro: "Caixa do Zendesk não encontrada."}); 
        }
    }
    
    return true; 
});