// ==========================================
// /js/content/airtable-scraper.js
// ==========================================

function extrairAirtableDireto() {
    showCieeToast("Lendo dados do Airtable...", "info");
    let dadosAirtable = {};
    
    document.querySelectorAll('[data-testid="stackedLabel"], [data-testid="sideBySideLabel"]').forEach(caixa => {
        let labelNode = caixa.querySelector('[data-testid="page-element-label"]');
        if (!labelNode) return;
        let chave = labelNode.innerText.trim();
        let valor = "";
        let input = caixa.querySelector('input:not([type="hidden"])');
        let textarea = caixa.querySelector('textarea');
        let editavel = caixa.querySelector('[contenteditable="true"], [contenteditable="plaintext-only"]');
        let celula = caixa.querySelector('[data-testid="cell-editor"]');

        if (input && input.value) valor = input.value;
        else if (textarea && textarea.value) valor = textarea.value;
        else if (editavel && editavel.innerText) valor = editavel.innerText;
        else if (celula && celula.innerText) valor = celula.innerText;
        
        if (valor) valor = valor.replace(/Format:\s*Number/gi, '');
        if (chave) dadosAirtable[chave] = valor.trim();
    });

    let textoBruto = "";
    document.querySelectorAll('input:not([type="hidden"]), textarea').forEach(el => { 
        if(el.value) textoBruto += "\n" + el.value; 
    });
    textoBruto += "\n" + document.body.innerText;

    if (safeSendMessage("receberDadosAirtable", { dadosEstruturados: dadosAirtable, textoBruto: textoBruto })) {
        showCieeToast("Vaga enviada ao Hub!", "success");
    }
}

// Ouvinte para caso o Hub solicite a extração reversa
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.acao === "extrairAirtable") {
        let dadosAirtable = {};
        
        document.querySelectorAll('[data-testid="stackedLabel"], [data-testid="sideBySideLabel"]').forEach(caixa => {
            let labelNode = caixa.querySelector('[data-testid="page-element-label"]');
            if (!labelNode) return;

            let chave = labelNode.innerText.trim();
            let valor = "";

            let input = caixa.querySelector('input:not([type="hidden"])');
            let textarea = caixa.querySelector('textarea');
            let editavel = caixa.querySelector('[contenteditable="true"], [contenteditable="plaintext-only"]');
            let celula = caixa.querySelector('[data-testid="cell-editor"]');

            if (input && input.value) valor = input.value;
            else if (textarea && textarea.value) valor = textarea.value;
            else if (editavel && editavel.innerText) valor = editavel.innerText;
            else if (celula && celula.innerText) valor = celula.innerText;
            
            if (valor) valor = valor.replace(/Format:\s*Number/gi, '');

            if (chave) dadosAirtable[chave] = valor.trim();
        });

        let textoBruto = "";
        document.querySelectorAll('input:not([type="hidden"]), textarea').forEach(el => {
            if(el.value) textoBruto += "\n" + el.value;
        });
        textoBruto += "\n" + document.body.innerText;

        sendResponse({ dadosEstruturados: dadosAirtable, textoBruto: textoBruto });
    }
});