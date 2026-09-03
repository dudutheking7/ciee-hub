// --- FUNÇÃO AUXILIAR DE INJEÇÃO COMPATÍVEL COM REACT/ANGULAR ---
function setReactInputValue(input, value) {
    if (!input) return;
    input.focus();
    input.value = ""; // Limpa a máscara primeiro
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    
    let lastValue = input.value;
    input.value = value;
    let tracker = input._valueTracker;
    if (tracker) tracker.setValue(lastValue);
    
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    input.blur();
}

function simularDigiteMascarado(input, valor) {
    if (!input) return;
    input.focus();
    input.value = valor;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    input.blur();
}

// =======================================
// ETAPA 2.1 - PREENCHER TEXTOS INICIAIS
// =======================================
function preencherEtapaKairos() {
    const tituloExato = "UPLOAD DE CURRÍCULO";
    const descricaoExata = `Olá, candidato!

Encontramos uma vaga perfeita que corresponde ao seu perfil!

Basta se candidatar e ler com atenção as informações sobre o processo seletivo.

Fique ligado nesta dica: Atualize o seu cadastro com o máximo de informações possíveis, como conhecimentos de informática, idiomas etc. Assim a empresa visualizará o seu currículo mais completo e você terá mais chances de ser aprovado.

Boa sorte! :)`;

    const tituloInput = document.querySelector('input[name*="nome"], input[id*="etapa-titulo"], input[id*="titulo"]');
    if (tituloInput) setReactInputValue(tituloInput, tituloExato);

    const tipoSelect = document.querySelector('select[name*="tipo"], select[id*="tipo"]');
    if (tipoSelect) setReactInputValue(tipoSelect, "1");

    const descTextarea = document.querySelector('textarea[name*="descricao"], textarea[id*="descricao"], textarea');
    if (descTextarea) setReactInputValue(descTextarea, descricaoExata);

    alert("CIEE Mod Menu: Textos da Etapa (Passo 1) preenchidos!");
}

// =======================================
// ETAPA 2.2 - MARCAR TODOS OS ARQUIVOS E AVANÇAR
// =======================================
function preencherArquivosKairos() {
    let checkBoxes = document.querySelectorAll('input[type="checkbox"]');
    if (checkBoxes.length === 0) return alert("CIEE Mod Menu: Nenhuma caixa de seleção de arquivo encontrada nesta tela.");
    
    checkBoxes.forEach(chk => {
        if (!chk.checked) chk.click();
    });

    const botoes = Array.from(document.querySelectorAll('button'));
    const btnProximo = botoes.find(b => b.innerText.toLowerCase().includes('próximo') || b.innerText.toLowerCase().includes('avançar'));
    
    if(btnProximo) {
        btnProximo.click();
    } else {
        alert("CIEE Mod Menu: Arquivos marcados, mas o botão 'Próximo' não foi encontrado. Clique manualmente.");
    }
}

// =======================================
// ETAPA 2.3 - PREENCHER PRAZOS (+7 DIAS E 00:00 - 23:59)
// =======================================
function preencherPrazosKairos() {
    let dToday = new Date();
    let dEnd = new Date(); dEnd.setDate(dEnd.getDate() + 7);
    
    let dtBR_Today = `${String(dToday.getDate()).padStart(2, '0')}/${String(dToday.getMonth() + 1).padStart(2, '0')}/${dToday.getFullYear()}`;
    let dtBR_End = `${String(dEnd.getDate()).padStart(2, '0')}/${String(dEnd.getMonth() + 1).padStart(2, '0')}/${dEnd.getFullYear()}`;
    let dtISO_Today = `${dToday.getFullYear()}-${String(dToday.getMonth() + 1).padStart(2, '0')}-${String(dToday.getDate()).padStart(2, '0')}`;
    let dtISO_End = `${dEnd.getFullYear()}-${String(dEnd.getMonth() + 1).padStart(2, '0')}-${String(dEnd.getDate()).padStart(2, '0')}`;

    let dateInputs = document.querySelectorAll('input[type="date"], input[placeholder*="dd/mm"], input[name*="data"]');
    if(dateInputs.length >= 2) {
        setReactInputValue(dateInputs[0], dateInputs[0].type === 'date' ? dtISO_Today : dtBR_Today);
        setReactInputValue(dateInputs[1], dateInputs[1].type === 'date' ? dtISO_End : dtBR_End);
    }

    let timeInputs = document.querySelectorAll('input[type="time"], input[placeholder*="00:00"], input[placeholder*="hh:mm"], input[placeholder*="HH:mm"], input[id*="hora"]');
    if(timeInputs.length >= 2) {
        simularDigiteMascarado(timeInputs[0], "00:00");
        simularDigiteMascarado(timeInputs[1], "23:59");
        alert("CIEE Mod Menu: Prazos e Horários Injetados!");
    } else {
        alert("CIEE Mod Menu: Datas preenchidas, mas as caixas de horário não foram detetadas corretamente.");
    }
}

// =======================================
// BAIXAR CURRÍCULOS (BUSCA PELO TEXTO VISÍVEL)
// =======================================
function baixarCurriculosKairos() {
    // Procura por elementos que contêm o texto explícito do botão do Kairós
    const elementos = Array.from(document.querySelectorAll('a, button, span'));
    const botoesDownload = elementos.filter(el => {
        const txt = (el.innerText || el.title || '').toLowerCase();
        return txt.includes('acessar currículo do estudante') || txt.includes('acessar currículo') || txt.includes('download');
    });

    if (botoesDownload.length === 0) return alert("CIEE Mod Menu: Nenhum botão de 'Acessar currículo do Estudante' encontrado na tela atual.");
    
    let delay = 0; let contagem = 0;
    botoesDownload.forEach((btn) => {
        setTimeout(() => { btn.click(); }, delay);
        delay += 1500; // Tempo um pouco maior para o Kairós processar a abertura dos links
        contagem++;
    });
    alert(`CIEE Mod Menu: A clicar para abrir ${contagem} currículos. Aguarde...`);
}

// =======================================
// INJETAR LOG E AGENDAR CONTATO (+7 DIAS / +5 MINUTOS / MOTIVO)
// =======================================
function injetarLogKairos(textoLog) {
    if(!textoLog || textoLog === "undefined") return alert("Não há log salvo. Gere um Registro ou Acomp no Hub primeiro.");

    let textareaEncontrada = false;
    const textareas = Array.from(document.querySelectorAll('textarea')).filter(txt => txt.offsetParent !== null);
    if(textareas.length > 0) {
        setReactInputValue(textareas[0], textoLog);
        textareaEncontrada = true;
    }

    let d = new Date(); d.setDate(d.getDate() + 7);
    let dateStrISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let dateStrBR = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    let t = new Date(); t.setMinutes(t.getMinutes() + 5);
    let timeStr = t.toTimeString().substring(0, 5); 

    // Preenchimento de Data
    document.querySelectorAll('input[type="date"], input[name*="data"], input[id*="data"], input[class*="date"], input[placeholder*="dd/mm"]').forEach(inp => {
        setReactInputValue(inp, inp.type === 'date' ? dateStrISO : dateStrBR);
    });

    // Preenchimento de Hora com a Simulação de Máscara
    const inputsHorario = document.querySelectorAll('input[type="time"], input[name*="hora"], input[id*="hora"], input[placeholder*="00:00"], input[placeholder*="hh:mm"]');
    if (inputsHorario.length > 0) {
        inputsHorario.forEach(inp => simularDigiteMascarado(inp, timeStr));
    } else {
        const modal = document.querySelector('div[class*="modal"], app-agendar-contato');
        if (modal) {
            const inputsModal = Array.from(modal.querySelectorAll('input')).filter(i => i.type !== 'checkbox' && i.type !== 'radio');
            if (inputsModal.length >= 2) simularDigiteMascarado(inputsModal[1], timeStr);
        }
    }

    // Marca Checkbox "Ligar na Data"
    document.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        let label = chk.nextElementSibling || chk.parentElement;
        let text = label ? label.innerText.toLowerCase() : "";
        if(text.includes('ligar') || text.includes('agendar') || chk.name.toLowerCase().includes('ligar')) {
            if(!chk.checked) chk.click();
        }
    });

    // Procura o Select de "Motivo do Agendamento" para marcar "Ligar na data"
    let selects = document.querySelectorAll('select');
    selects.forEach(sel => {
        Array.from(sel.options).forEach(opt => {
            if (opt.text.toLowerCase().includes('ligar na data') || opt.text.toLowerCase().includes('ligar')) {
                setReactInputValue(sel, opt.value);
            }
        });
    });

    if(textareaEncontrada) {
        alert("CIEE Mod Menu: Log colado! Ação agendada para 7 dias à frente às " + timeStr + ".");
    } else {
        alert("CIEE Mod Menu: Nenhuma caixa de texto de Log encontrada.");
    }
}

// --- DOM INJECTION (CIEE MOD MENU) ---
function injectKairosModMenu() {
    const url = window.location.href;
    if (url.includes('zendesk.com') || (!url.includes('ciee.org.br') && !url.includes('kairos')) || !document.body) return;
    if (document.getElementById('ciee-mod-menu')) return;

    const panel = document.createElement('div');
    panel.id = 'ciee-mod-menu';
    panel.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; background: #004c99; border-radius: 8px; box-shadow: 0 6px 16px rgba(0,0,0,0.5); font-family: sans-serif; user-select: none; touch-action: none; width: 230px; transition: width 0.3s ease;';

    const header = document.createElement('div');
    header.style.cssText = 'color: white; font-size: 13px; font-weight: bold; text-align: center; padding: 10px; cursor: grab; background: rgba(0,0,0,0.2); border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center;';
    
    const titleText = document.createElement('span'); titleText.innerText = '🤖 CIEE Mod Menu';
    const toggleBtn = document.createElement('span'); toggleBtn.innerText = '➖';
    toggleBtn.style.cssText = 'cursor: pointer; padding: 0 5px; font-size: 14px;';
    
    header.appendChild(titleText); header.appendChild(toggleBtn); panel.appendChild(header);

    const body = document.createElement('div');
    body.style.cssText = 'padding: 12px; display: flex; flex-direction: column; gap: 8px;';
    
    const createBtn = (text, color, onClickAction) => {
        const btn = document.createElement('button'); btn.innerText = text;
        btn.style.cssText = `background: ${color}; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; width: 100%; transition: 0.2s; text-align: left;`;
        btn.onmouseover = () => btn.style.filter = "brightness(0.9)"; btn.onmouseout = () => btn.style.filter = "brightness(1)";
        btn.onclick = (e) => { e.preventDefault(); onClickAction(); };
        return btn;
    };

    body.appendChild(createBtn('📝 1. Colar Log (+7 Dias)', '#28a745', () => {
        chrome.storage.local.get('ciee_ultimo_log', (data) => injetarLogKairos(data.ciee_ultimo_log));
    }));
    body.appendChild(createBtn('⚙️ 2.1 Etapa: Criar', '#fd7e14', preencherEtapaKairos));
    body.appendChild(createBtn('📂 2.2 Etapa: Arquivos', '#e67300', preencherArquivosKairos));
    body.appendChild(createBtn('⏳ 2.3 Etapa: Prazos', '#cc6600', preencherPrazosKairos));
    body.appendChild(createBtn('📥 3. Baixar Currículos', '#6f42c1', baixarCurriculosKairos));

    panel.appendChild(body);
    document.body.appendChild(panel);

    let isMinimized = false;
    toggleBtn.onclick = () => {
        isMinimized = !isMinimized;
        body.style.display = isMinimized ? 'none' : 'flex';
        toggleBtn.innerText = isMinimized ? '➕' : '➖';
        panel.style.width = isMinimized ? '150px' : '230px';
    };

    let isDragging = false;
    let currentX = 0, currentY = 0, initialX = 0, initialY = 0;
    let xOffset = 0, yOffset = 0;

    header.onmousedown = function(e) {
        if(e.target === toggleBtn) return;
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        isDragging = true;
        header.style.cursor = 'grabbing';
    };

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            header.style.cursor = 'grab';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            panel.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
    });
}

setInterval(injectKairosModMenu, 2000);

// --- RECEPÇÃO DE DADOS E INJEÇÃO ZENDESK ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.acao === "extrairZendesk") {
        const text = document.querySelector('.zd-comment')?.innerText || window.getSelection().toString() || "";
        const urlMatch = window.location.href.match(/\/tickets\/(\d+)/); let assuntoTicket = "";
        const subjectInput = document.querySelector('input[data-test-id="omni-header-subject"]') || document.querySelector('input[data-test-id="ticket-pane-subject"]') || document.querySelector('.ticket-pane-subject');
        if (subjectInput) assuntoTicket = subjectInput.value || subjectInput.innerText || "";
        else { const titleMatch = document.title.match(/^(.*?)\s*-\s*Ticket/i); if (titleMatch) assuntoTicket = titleMatch[1].trim(); }
        
        sendResponse({
            ticket: urlMatch ? urlMatch[1] : "", assunto: assuntoTicket, ab_empresa: text.match(/Empresa:\s*(.+)/i)?.[1]?.trim() || "", ab_qtd_vagas: text.match(/N° de Vagas:\s*(\d+)/i)?.[1]?.trim() || "", ab_curso: text.match(/Curso:\s*(.+)/i)?.[1]?.trim() || "", ab_bolsa: text.match(/Valor bolsa auxilio:\s*R\$\s*([\d\.,]+)/i)?.[1]?.trim() || "", ab_vt: text.match(/Valor do auxílio transporte:\s*R\$\s*([\d\.,]+)/i)?.[1]?.trim() || "", ab_email_solic: text.match(/E-mail:\s*([^\s]+)/i)?.[1]?.trim() || "", horario_cru: text.match(/Horário de Estágio:\s*(.+)/i)?.[1]?.trim() || ""
        });
    }

    if (request.acao === "injetarZendesk") {
        const zendeskEditor = document.querySelector('div[data-test-id="omni-composer-rich-text-editor"]') || document.querySelector('.ck-content') || document.querySelector('.zd-comment') || document.querySelector('div[contenteditable="true"]');
        
        if (zendeskEditor) { 
            zendeskEditor.focus();
            document.execCommand('insertText', false, request.texto);
            if (!zendeskEditor.innerHTML.includes(request.texto.substring(0, 10))) {
                zendeskEditor.innerHTML = request.texto.replace(/\n/g, '<br>');
            }
            zendeskEditor.dispatchEvent(new Event('input', { bubbles: true, composed: true })); 
            sendResponse({sucesso: true}); 
        } else {
            sendResponse({sucesso: false, erro: "Caixa do Zendesk não encontrada."});
        }
    }
});