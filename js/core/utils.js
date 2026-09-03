// ==========================================
// /js/core/utils.js
// ==========================================

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if(!container) return; 
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { 
        toast.classList.add('fade-out'); 
        setTimeout(() => toast.remove(), 300); 
    }, type === 'error' ? 4000 : 3000);
}

function setValSeguro(id, valor) {
    const el = document.getElementById(id);
    if(el) {
        el.value = valor;
        if (typeof isLimpandoMesa !== 'undefined' && !isLimpandoMesa) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}

function copiarLogAutomatico(texto, nomeDoLog) {
    if (!texto || texto === "") return;
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ 'ciee_ultimo_log': texto });
    }
    navigator.clipboard.writeText(texto)
        .then(() => showToast(`✅ ${nomeDoLog} copiado!`, "success"))
        .catch(() => {});
}

function formatarMoeda(campo) {
    let valor = campo.value.trim();
    if(valor && !valor.toUpperCase().includes("R$") && /\d/.test(valor)) { 
        campo.value = "R$ " + valor; 
        if (typeof saveDraft === 'function') saveDraft(); 
    }
}

function copiarUnitario(id, btn) {
    let elem = document.getElementById(id);
    if(elem && elem.value) {
        navigator.clipboard.writeText(elem.value);
        let oldTxt = btn.innerText; 
        btn.innerText = "✓";
        setTimeout(() => btn.innerText = oldTxt, 1000);
    }
}

function getSaudacao() { 
    return new Date().getHours() < 12 ? 'bom dia' : 'boa tarde'; 
}