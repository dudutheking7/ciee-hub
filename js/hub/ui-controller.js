// =========================================================================
// /js/hub/ui-controller.js - CIEE Hub PRO V2.0 (Glassmorphism & Anti-Bug)
// =========================================================================

// --- ESTILOS DO MODO ESCURO (GLASSMORPHISM) ---
const darkCss = `
body.dark-theme { 
    --bg-color: #0f172a; 
    --text-color: #f8fafc; 
    background-color: #0f172a; 
    color: #f8fafc; 
}
body.dark-theme .container, 
body.dark-theme .card-contato, 
body.dark-theme .dash-card, 
body.dark-theme .panel-padrao, 
body.dark-theme .robot-box { 
    background: rgba(30, 41, 59, 0.7); 
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1); 
    color: #f8fafc; 
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
}
body.dark-theme input, 
body.dark-theme select, 
body.dark-theme textarea { 
    background: rgba(15, 23, 42, 0.8); 
    color: #f8fafc; 
    border: 1px solid rgba(255, 255, 255, 0.2); 
}
body.dark-theme input:focus, 
body.dark-theme select:focus, 
body.dark-theme textarea:focus {
    border-color: #3b82f6;
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
body.dark-theme .door-card { background: rgba(30, 41, 59, 0.7); }
body.dark-theme .door-card.fila { background: rgba(20, 83, 45, 0.4); border-color: rgba(34, 197, 94, 0.3); }
body.dark-theme .data-table th { background: rgba(15, 23, 42, 0.9); color: #cbd5e1; border-bottom: 1px solid rgba(255,255,255,0.1); }
body.dark-theme .data-table td { border-bottom: 1px solid rgba(255,255,255,0.05); }
body.dark-theme h2, 
body.dark-theme h3 { color: #60a5fa; }
body.dark-theme .panel-complexo, 
body.dark-theme .panel-supervisor, 
body.dark-theme .panel-solicitante { background: rgba(15, 23, 42, 0.6); border-color: rgba(255, 255, 255, 0.1); }
body.dark-theme .output-box { background-color: rgba(0, 0, 0, 0.3); border: 1px inset rgba(255,255,255,0.1); color: #e2e8f0; }
`;

let style = document.createElement('style'); 
style.innerHTML = darkCss; 
document.head.appendChild(style);

function toggleDarkMode() {
    document.body.classList.toggle('dark-theme');
    let isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('ciee_dark_theme', isDark);
    if(typeof showToast === 'function') {
        showToast(isDark ? "🌙 Modo Escuro Ativado" : "☀️ Modo Claro Ativado", "info");
    }
}

function openTabLibre(tab) {
    ticket_global = "Consulta"; 
    const dt = document.getElementById('display_ticket_global'); 
    if(dt) dt.innerText = "Consulta";
    document.getElementById('screen_demanda').classList.remove('active');
    document.getElementById('screen_tool').classList.add('active');
    openTab(tab);
}

function openTab(tab) {
    document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(e => e.classList.remove('active'));
    const t = document.getElementById(tab); if(t) t.classList.add('active');
    const tt = document.getElementById('tab_' + tab); if(tt) tt.classList.add('active');
    
    if(tab === 'convocacao') {
        const abReg = document.getElementById('ab_regiao');
        if(abReg && abReg.value && typeof setValSeguro === 'function') {
            setValSeguro('conv_regiao', abReg.value.toUpperCase()); 
        }
    }
}

function limparCamposMesa() {
    if(typeof isLimpandoMesa !== 'undefined') isLimpandoMesa = true;
    if(typeof draftTimeout !== 'undefined') clearTimeout(draftTimeout); 
    
    const camposLimpar = [
        'ab_vaga_digital', 'ab_vaga', 'ab_empresa', 'ab_curso', 'ab_bolsa', 'ab_vt', 'ab_horario_entrada', 'ab_horario_saida', 
        'ab_carga', 'ab_periodo', 'ab_sexo', 'ab_qtd_vagas', 'ab_beneficios', 'ab_contato', 'ab_nome_solic', 'ab_email_solic', 
        'ab_ddd_solic', 'ab_tel_solic', 'ab_super_nome', 'ab_super_cargo', 'ab_super_cpf', 'ab_super_email', 'ab_super_ddd', 
        'ab_super_tel', 'ab_etapa', 'out_assunto', 'out_follow_abertura', 'out_resp_abertura', 'out_dg_texto1', 'out_dg_texto2', 
        'out_registro', 'out_resposta_cliente', 'reg_candidato_aprovado', 'texto_upload', 'conv_vaga', 'conv_regiao', 'conv_empresa', 
        'conv_mod', 'conv_data', 'conv_hora', 'conv_end', 'conv_contato', 'conv_saldo', 'conv_curso', 'out_conv_assunto', 'out_conv_texto', 
        'out_acomp', 'out_acomp_log', 'acomp_nome', 'acomp_curso', 'acomp_vaga', 'acomp_link', 'acomp_senha', 'reg_vaga'
    ];
    
    camposLimpar.forEach(id => {
        let el = document.getElementById(id);
        if(el) el.value = "";
    });
    
    document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    let radioPadrao = document.querySelector('input[name="ab_mod"][value="OE"]');
    if(radioPadrao) radioPadrao.checked = true;
    
    if(typeof atualizarInterface === 'function') atualizarInterface();
    
    let containerIA = document.getElementById('painel-ia-gemini');
    if (containerIA) containerIA.remove();

    localStorage.removeItem('hub_draft'); 
    if(typeof isLimpandoMesa !== 'undefined') isLimpandoMesa = false;
}

function carregarVagasDoDia() { 
    if(typeof vagas_tratadas_hoje !== 'undefined') {
        vagas_tratadas_hoje = JSON.parse(localStorage.getItem('hub_vagas_sinc_sharepoint') || '[]'); 
    }
}

function salvarVagaParaSincronia(vagaNum, statusTxt, retornoData, ticketNum) {
    if(typeof vagas_tratadas_hoje !== 'undefined') {
        vagas_tratadas_hoje = vagas_tratadas_hoje.filter(item => item.vaga !== vagaNum); 
        vagas_tratadas_hoje.push({ vaga: vagaNum, status: statusTxt, retorno: retornoData, ticket: ticketNum });
        localStorage.setItem('hub_vagas_sinc_sharepoint', JSON.stringify(vagas_tratadas_hoje));
    }
}

function saveDraft() {
    if(typeof operador === 'undefined' || !operador || (typeof isLimpandoMesa !== 'undefined' && isLimpandoMesa)) return; 
    if(typeof draftTimeout !== 'undefined') clearTimeout(draftTimeout);
    
    window.draftTimeout = setTimeout(() => {
        let inputs = document.querySelectorAll('input:not([type="file"]), select, textarea');
        let data = {};
        inputs.forEach(el => { if (el.id) data[el.id] = (el.type === 'radio' || el.type === 'checkbox') ? el.checked : el.value; });
        localStorage.setItem('hub_draft', JSON.stringify(data));
    }, 800);
}

function verificarRascunho() {
    let data = localStorage.getItem('hub_draft');
    const banner = document.getElementById('draft-banner');
    if (data && data !== "{}" && banner) banner.style.display = 'flex';
}

function restaurarRascunho() {
    let data = JSON.parse(localStorage.getItem('hub_draft') || '{}');
    for (let id in data) {
        let el = document.getElementById(id);
        if (el) { el.type === 'radio' || el.type === 'checkbox' ? el.checked = data[id] : el.value = data[id]; }
    }
    const banner = document.getElementById('draft-banner');
    if(banner) banner.style.display = 'none';
    if(typeof atualizarInterface === 'function') atualizarInterface(); 
    if(typeof checkDG === 'function') checkDG();
    if(typeof showToast === 'function') showToast('Rascunho restaurado!', 'success');
}

function descartarRascunho() { 
    localStorage.removeItem('hub_draft'); 
    const banner = document.getElementById('draft-banner'); 
    if(banner) banner.style.display = 'none'; 
}

function renderizarCatalogo(filtro = "") {
    if(typeof catalogo === 'undefined') return;
    let f = filtro.toLowerCase();
    const resultados = catalogo.filter(c => c.nome.toLowerCase().includes(f) || c.regiao.toLowerCase().includes(f) || c.cargo.toLowerCase().includes(f));
    const lista = document.getElementById('lista_contatos');
    if(!lista) return;
    
    lista.innerHTML = resultados.map(c => `
        <div class="card-contato" style="padding: 12px; margin-bottom: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(30, 41, 59, 0.4);">
            <div class="contato-info">
                <h4 style="margin: 0 0 5px 0; color: var(--text-color);">${c.nome} <span style="font-size: 11px; font-weight:normal; color:#888;">(${c.cargo})</span></h4>
                <p style="margin: 2px 0; font-size: 13px;">📍 ${c.regiao} | 📱 ${c.ramal}</p>
                <p style="margin: 2px 0; font-size: 13px; color:#3b82f6;">📧 ${c.email}</p>
            </div>
        </div>`).join('');
}

function filtrarCatalogo() { 
    const b = document.getElementById('busca_catalogo'); 
    if(b) renderizarCatalogo(b.value); 
}

function fazerLogin() {
    const sigInput = document.getElementById('user_signature');
    if(!sigInput) return;
    const sig = sigInput.value.trim();
    if(!sig && typeof showToast === 'function') return showToast("Insira sua assinatura Zendesk!", "error");
    
    if(typeof operador !== 'undefined') operador = sig;
    localStorage.setItem('hub_operador', sig);
    
    if(typeof setValSeguro === 'function') setValSeguro('display_signature', sig);
    const ds = document.getElementById('display_signature'); if(ds) ds.innerText = sig;
    
    document.getElementById('screen_login').classList.remove('active');
    document.getElementById('screen_demanda').classList.add('active');
    
    if(typeof atualizarInterface === 'function') atualizarInterface(); 
    renderizarCatalogo(); 
    if(typeof renderizarLogs === 'function') renderizarLogs(); 
    verificarRascunho();
}

function fazerLogout() {
    localStorage.removeItem('hub_operador');
    if(typeof operador !== 'undefined') operador = ""; 
    if(typeof setValSeguro === 'function') setValSeguro('user_signature', '');
    
    document.getElementById('screen_tool').classList.remove('active');
    document.getElementById('screen_demanda').classList.remove('active');
    document.getElementById('screen_login').classList.add('active');
    if(typeof showToast === 'function') showToast("Você foi desconectado.", "info");
}

function iniciarIndividual() {
    const tkInput = document.getElementById('input_ticket_global_ind');
    const tk = tkInput ? tkInput.value.trim() : "";
    if(typeof ticket_global !== 'undefined') ticket_global = tk;
    if(typeof isModoFila !== 'undefined') isModoFila = false;
    
    const dTitle = document.getElementById('display_ticket_global');
    if(dTitle) dTitle.innerText = tk || "Sem Ticket";
    
    const banner = document.getElementById('fila_banner_global');
    if(banner) banner.classList.remove('active');
    
    const tabFila = document.getElementById('tab_fila');
    if(tabFila) tabFila.style.display = 'none';
    
    document.getElementById('screen_demanda').classList.remove('active');
    document.getElementById('screen_tool').classList.add('active');
    openTab('abertura');
}

function calcularCargaHoraria() {
    const entEl = document.getElementById('ab_horario_entrada');
    const saiEl = document.getElementById('ab_horario_saida');
    if(!entEl || !saiEl) return;
    
    const ent = entEl.value; const sai = saiEl.value;
    if(ent && sai) {
        let diff = (new Date("1970-01-01T" + sai + ":00") - new Date("1970-01-01T" + ent + ":00")) / 3600000; 
        if(diff < 0) diff += 24; 
        if(diff > 6 && typeof showToast === 'function') showToast(`Atenção: Carga calculada é de ${diff}h. Verifique o limite de 6h/dia.`, "warning");
        
        let hours = Math.floor(diff);
        let minutes = Math.round((diff - hours) * 60);
        if(typeof setValSeguro === 'function') {
            setValSeguro('ab_carga', hours + "h" + (minutes > 0 ? String(minutes).padStart(2, '0') : "") + "/dia");
        }
    }
}

function parseHorarioParaCampos(horarioStr) {
    if(!horarioStr) return;
    let m = horarioStr.match(/(\d{1,2})[:h]?(\d{2})?\s*(?:às|as|a|-|até)\s*(\d{1,2})[:h]?(\d{2})?/i);
    if(m && typeof setValSeguro === 'function') {
        setValSeguro('ab_horario_entrada', `${m[1].padStart(2, '0')}:${m[2] || '00'}`);
        setValSeguro('ab_horario_saida', `${m[3].padStart(2, '0')}:${m[4] || '00'}`);
        calcularCargaHoraria();
    } else if (typeof setValSeguro === 'function') {
        setValSeguro('ab_carga', horarioStr);
    }
}

function atualizarInterface() {
    let elMod = document.querySelector('input[name="ab_mod"]:checked');
    if(!elMod) return;
    
    const mod = elMod.value;
    const datalist = document.getElementById('lista_cursos');
    
    if(datalist) {
        datalist.innerHTML = ''; 
        if(typeof setValSeguro === 'function') setValSeguro('ab_curso', ''); 
        let lista = (mod === 'OE') ? (typeof cursosEstagio !== 'undefined' ? cursosEstagio : []) : (typeof arcosAprendiz !== 'undefined' ? arcosAprendiz : []);
        lista.forEach(item => { 
            let option = document.createElement('option'); 
            option.value = item; 
            datalist.appendChild(option); 
        });
    }
    const lb = document.getElementById('label_bolsa');
    if(lb) lb.innerText = mod === 'OA' ? "Salário (R$)" : "Bolsa Auxílio (R$)";
}

function checkDG() {
    const regEl = document.getElementById('ab_regiao');
    if(!regEl) return;
    const reg = regEl.value.toUpperCase();
    
    if(reg === 'DG' || reg === 'DIGITAL') {
        const da = document.getElementById('dg_alert'); if(da) da.classList.add('active');
        if(typeof setValSeguro === 'function') {
            setValSeguro('ab_nome_solic', "CIEE Rio");
            setValSeguro('ab_email_solic', "nao.notificar@cieerj.org.br");
            setValSeguro('ab_setor_solic', "RH (Operacional Capital)");
            setValSeguro('ab_ddd_solic', "21");
            setValSeguro('ab_tel_solic', "00000-0000");
        }
        const w1 = document.getElementById('wrapper_resp_normal'); if(w1) w1.style.display = 'none';
        const w2 = document.getElementById('wrapper_dg_textos'); if(w2) w2.style.display = 'flex';
        const w3 = document.getElementById('div_etapa_normal'); if(w3) w3.style.visibility = 'hidden';
    } else {
        const da = document.getElementById('dg_alert'); if(da) da.classList.remove('active');
        if(typeof setValSeguro === 'function') setValSeguro('ab_setor_solic', "RH (Operacional Capital)");
        
        const w1 = document.getElementById('wrapper_resp_normal'); if(w1) w1.style.display = 'block';
        const w2 = document.getElementById('wrapper_dg_textos'); if(w2) w2.style.display = 'none';
        const w3 = document.getElementById('div_etapa_normal'); if(w3) w3.style.visibility = 'visible';
    }
}

function toggleExtractor(type) {
    document.querySelectorAll('.extractor-tab').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.extractor-view').forEach(e => e.classList.remove('active'));
    const tt = document.querySelector(`.extractor-tab[data-type="${type}"]`); if(tt) tt.classList.add('active');
    const et = document.getElementById('ext_' + type); if(et) et.classList.add('active');
}

function copiarTextoFixo(tipo) {
    let textoFinal = tipo === 'analise' ? 
        "Olá, candidato!\n\nEncontramos uma vaga perfeita que corresponde ao seu perfil!\n\nBasta se candidatar e ler com atenção as informações sobre o processo seletivo.\n\nFique ligado nesta dica: Atualize o seu cadastro com o máximo de informações possíveis, como conhecimentos de informática, idiomas etc. Assim a empresa visualizará o seu currículo mais completo e você terá mais chances de ser aprovado.\n\nBoa sorte! :)" : 
        "Olá, candidato!\n\nLembre-se! Você tem uma entrevista presencial. Acesse seu cadastro e veja as informações da empresa e local.\n\nAh! Se você não puder ir, pedimos que avise com antecedência para evitar possíveis bloqueios em seu cadastro, hein? Nos chame no WhatsApp (21)3535-4545, na opção 3 - Quero minha vaga e informe o motivo de sua desistência.\n\nAgradecemos a sua atenção 😊";
    navigator.clipboard.writeText(textoFinal).then(() => {
        if(typeof showToast === 'function') showToast('Texto padrão copiado!', 'success');
    });
}

async function copiarTextoEditavel(elementId, acao, btn) {
    const el = document.getElementById(elementId);
    if(!el || !el.value) return;
    try {
        let text = el.value;
        if (text.includes('<div') || text.includes('<p>')) {
            const blobHtml = new Blob([text], { type: "text/html" });
            const blobText = new Blob([text.replace(/<[^>]*>?/gm, '')], { type: "text/plain" }); 
            const item = new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText });
            await navigator.clipboard.write([item]);
        } else { await navigator.clipboard.writeText(text); }
        
        let oldText = btn.innerText; btn.innerText = "Copiado! ✓";
        setTimeout(() => btn.innerText = oldText, 2000);
        
        if(typeof registrarLog === 'function') registrarLog(acao);
        
        if (typeof chrome !== 'undefined' && chrome.tabs && acao.includes("Zendesk")) {
            chrome.tabs.query({url: "*://*.zendesk.com/*"}, function(tabs) {
                tabs.forEach(tab => {
                    if (typeof ticket_global !== 'undefined') {
                        if (!ticket_global || tab.url.includes(ticket_global)) { 
                            chrome.tabs.sendMessage(tab.id, {acao: "injetarZendesk", texto: text}); 
                        }
                    }
                });
            });
            if(typeof showToast === 'function') showToast("Texto injetado no Zendesk de forma invisível!", "success");
        }
    } catch (err) { 
        console.error(err); 
        if(typeof showToast === 'function') showToast("Erro ao copiar.", "error"); 
    }
}

function registrarLog(acao) {
    let vaga = (document.getElementById('ab_vaga')||{}).value || (document.getElementById('reg_vaga')||{}).value || (document.getElementById('acomp_vaga')||{}).value || (document.getElementById('conv_vaga')||{}).value || "-";
    let empresa = (document.getElementById('ab_empresa')||{}).value || (document.getElementById('reg_contato')||{}).value || (document.getElementById('acomp_nome')||{}).value || (document.getElementById('conv_empresa')||{}).value || "-";
    let logs = JSON.parse(localStorage.getItem('ciee_logs') || '[]');
    let t_global = typeof ticket_global !== 'undefined' ? ticket_global : "";
    
    logs.unshift({ hora: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}), ticket: t_global, acao: acao, vaga: vaga, empresa: empresa });
    localStorage.setItem('ciee_logs', JSON.stringify(logs)); 
    
    if(typeof renderizarLogs === 'function') renderizarLogs();
    if (typeof enviarParaNuvem === 'function') enviarParaNuvem(acao, vaga, empresa);
}

function atualizarContadoresRelatorio(logs) {
    const ticketsUnicos = new Set(logs.map(l => l.ticket)).size;
    let aberturas = 0, envios = 0, acomps = 0, alteracoes = 0, cancelados = 0;

    logs.forEach(l => {
        let txt = (l.acao || l.categoria || l.detalhe || "").toLowerCase();
        if (txt.includes('abertura')) aberturas++;
        else if (txt.includes('envio')) envios++;
        else if (txt.includes('alteração') || txt.includes('perfil') || txt.includes('bolsa')) alteracoes++;
        else if (txt.includes('encerra') || txt.includes('cancela')) cancelados++;
        else if (txt.includes('acomp') || txt.includes('registro') || txt.includes('cobranca') || txt.includes('cobrança')) acomps++;
    });

    const setTxt = (id, val) => { let el = document.getElementById(id); if(el) el.innerText = val; };
    setTxt('dash_total', ticketsUnicos); setTxt('dash_aberturas', aberturas);
    setTxt('dash_envios', envios); setTxt('dash_acomps', acomps);
    setTxt('dash_alt', alteracoes); setTxt('dash_canc', cancelados);
}

function renderizarLogs() {
    const logs = JSON.parse(localStorage.getItem('ciee_logs') || '[]');
    atualizarContadoresRelatorio(logs);
    const tb = document.getElementById('tabela_logs'); if(!tb) return;

    if (logs.length === 0) { tb.innerHTML = "<tr><td colspan='5' style='text-align:center; padding: 20px;'>Nenhum histórico encontrado.</td></tr>"; return; }

    const gruposMap = new Map();
    logs.forEach(l => { if (!gruposMap.has(l.ticket)) gruposMap.set(l.ticket, []); gruposMap.get(l.ticket).push(l); });

    let html = '';
    gruposMap.forEach((listaLogs, ticketStr) => {
        const logInicial = listaLogs[listaLogs.length - 1];
        const logsSubsequentes = listaLogs.slice(0, -1);
        let nomeAcaoInit = logInicial.acao || logInicial.categoria || logInicial.detalhe || "Ação não especificada"; 
        let corInit = nomeAcaoInit.includes('Abertura') ? 'bg-abertura' : (nomeAcaoInit.includes('Convocação') ? 'bg-cr' : 'bg-acomp');
        let qtdOutros = logsSubsequentes.length;
        let iconExpanded = qtdOutros > 0 ? `<button data-action="toggleLog" data-ticket="${ticketStr}" style="border:none; background:rgba(255,255,255,0.1); color:var(--text-color); font-size:11px; font-weight:bold; cursor:pointer; padding:4px 8px; border-radius:4px; margin-left:10px; transition:0.2s;" title="Ver atualizações desta vaga">➕ Histórico (${qtdOutros})</button>` : '';

        html += `
        <tr style="background-color: transparent; border-bottom: ${qtdOutros > 0 ? 'none' : '1px solid var(--border-color)'};">
            <td>${logInicial.hora}</td>
            <td><strong style="font-size: 1.1em;">#${logInicial.ticket}</strong> ${iconExpanded}</td>
            <td><span class="badge ${corInit}">${nomeAcaoInit}</span></td>
            <td>${logInicial.vaga || "-"} <br><span style="font-size:10px; opacity:0.7;">${logInicial.empresa || "-"}</span></td>
            <td>-</td>
        </tr>`;

        if (qtdOutros > 0) {
            logsSubsequentes.forEach((lSub, index) => {
                let nomeAcaoSub = lSub.acao || lSub.categoria || lSub.detalhe || "Ação"; 
                let corSub = nomeAcaoSub.includes('Abertura') ? 'bg-abertura' : (nomeAcaoSub.includes('Convocação') ? 'bg-cr' : 'bg-acomp');
                let isLast = index === logsSubsequentes.length - 1; 

                html += `
                <tr class="log-child-group-${ticketStr}" style="display: none; background-color: rgba(0,0,0,0.1); border-bottom: ${isLast ? '1px solid var(--border-color)' : 'none'};">
                    <td style="padding-left: 20px; opacity: 0.6;">↳ ${lSub.hora}</td>
                    <td style="opacity: 0.5; font-style: italic; font-size: 11px;">Atualização</td>
                    <td><span class="badge ${corSub}" style="opacity:0.85;">${nomeAcaoSub}</span></td>
                    <td style="opacity: 0.6;">-</td>
                    <td style="opacity: 0.6;">-</td>
                </tr>`;
            });
        }
    });
    tb.innerHTML = html;
}

function toggleLogGroup(ticket, btn) {
    const rows = document.querySelectorAll(`.log-child-group-${ticket}`);
    let isHidden = false;
    rows.forEach(r => {
        if (r.style.display === 'none' || r.style.display === '') { r.style.display = 'table-row'; isHidden = false; } 
        else { r.style.display = 'none'; isHidden = true; }
    });
    btn.innerHTML = isHidden ? `➕ Histórico (${rows.length})` : `➖ Ocultar`;
    btn.style.background = isHidden ? 'rgba(255,255,255,0.1)' : 'rgba(59, 130, 246, 0.3)';
}

function baixarBackupCSV() {
    let logs = JSON.parse(localStorage.getItem('ciee_logs') || '[]'); 
    if(logs.length===0 && typeof showToast === 'function') return showToast("Vazio.", "error");
    let csv = "Hora;Ticket;Ação;Vaga;Empresa\n" + logs.map(l => `${l.hora};${l.ticket};${l.acao || l.categoria || ""};${l.vaga || ""};${l.empresa || ""}`).join("\n");
    
    if(typeof saveAs !== 'undefined') {
        saveAs(new Blob(["\ufeff", csv], {type: "text/csv;charset=utf-8"}), `Export_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`);
    }
    localStorage.removeItem('ciee_logs'); renderizarLogs();
}

function exportarBackupJSON() {
    let data = localStorage.getItem('ciee_logs'); 
    if((!data || data==='[]') && typeof showToast === 'function') return showToast("Vazio.", "error");
    if(typeof saveAs !== 'undefined') {
        saveAs(new Blob([data], {type: "application/json;charset=utf-8"}), `Backup_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.json`);
    }
}

function importarBackup(e) {
    const reader = new FileReader(); 
    reader.onload = (e) => { 
        try { 
            localStorage.setItem('ciee_logs', e.target.result); 
            renderizarLogs(); 
            if(typeof showToast === 'function') showToast("Restaurado!", "success"); 
        } catch(err) {
            if(typeof showToast === 'function') showToast("Erro ao importar", "error");
        } 
    }; 
    if(e.target.files[0]) reader.readAsText(e.target.files[0]);
}

function limparLogs() { 
    if(confirm("Apagar histórico?")) { 
        localStorage.removeItem('ciee_logs'); 
        renderizarLogs(); 
        if(typeof showToast === 'function') showToast("Histórico limpo.", "info");
    } 
}

function abrirPainelSupervisao() {
    let user = prompt("Usuário de Supervisão:");
    if (!user) return;
    let pass = prompt("Senha:");
    if (user === "supervisor_rj" && pass === "CieeRio2026") {
        renderizarDashboardSupervisao();
    } else {
        if(typeof showToast === 'function') showToast("Acesso Negado. Credenciais inválidas.", "error");
    }
}

function renderizarDashboardSupervisao() {
    // Esconde as telas de trás para evitar vazamento
    document.getElementById('screen_tool').classList.remove('active');
    document.getElementById('screen_demanda').classList.remove('active');
    
    let painel = document.getElementById('screen_supervisao');
    if (!painel) {
        painel = document.createElement('div');
        painel.id = 'screen_supervisao';
        
        // Overlay em Tela Cheia absoluto (Z-Index Máximo)
        painel.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 99999; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(15px); overflow-y: auto; padding: 40px 20px;';
        
        // NOTA DE SEGURANÇA: Remoção do onclick="fecharSupervisao()" e uso de id="btn_fechar_supervisao"
        painel.innerHTML = `
            <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 50px;">
                <!-- Cabeçalho -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 30px; background: rgba(30,41,59,0.8); padding: 20px 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                    <h2 style="color:#60a5fa; margin:0; font-size: 24px; font-weight: 600;">🛡️ Centro de Comando (Supervisão)</h2>
                    <button id="btn_fechar_supervisao" class="action-btn" style="width:auto; background:#ef4444; color:white; border:none; padding: 10px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);">⬅️ Voltar à Mesa</button>
                </div>
                
                <!-- 1. Tabela de Resumo -->
                <h3 style="color: #f8fafc; margin-bottom: 15px; font-weight: 600;">📊 Produtividade da Equipe (Hoje)</h3>
                <div style="background: rgba(30, 41, 59, 0.7); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); padding: 20px; margin-bottom: 40px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                    <table style="width: 100%; text-align: left; border-collapse: collapse;">
                        <thead style="background:rgba(15, 23, 42, 0.8); color:#cbd5e1;">
                            <tr>
                                <th style="padding:16px; border-bottom:1px solid rgba(255,255,255,0.1);">Operador</th>
                                <th style="padding:16px; border-bottom:1px solid rgba(255,255,255,0.1);">Ações Registradas</th>
                                <th style="padding:16px; border-bottom:1px solid rgba(255,255,255,0.1);">Último Alvo (Vaga)</th>
                                <th style="padding:16px; border-bottom:1px solid rgba(255,255,255,0.1);">Última Interação Realizada</th>
                            </tr>
                        </thead>
                        <tbody id="tbody_supervisao_resumo">
                            <tr><td colspan="4" style="padding:20px; text-align:center; color: #cbd5e1;">Sincronizando Resumo...</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- 2. Tabela de Logs Detalhados -->
                <h3 style="color: #f8fafc; margin-bottom: 15px; font-weight: 600;">⏱️ Log Operacional em Tempo Real</h3>
                <div style="background: rgba(30, 41, 59, 0.7); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); padding: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-height: 500px; overflow-y: auto;">
                    <table style="width: 100%; text-align: left; border-collapse: collapse;">
                        <thead style="background:rgba(15, 23, 42, 0.95); color:#cbd5e1; position: sticky; top: -20px; z-index: 10;">
                            <tr>
                                <th style="padding:16px; border-bottom:1px solid rgba(255,255,255,0.1);">Data/Hora</th>
                                <th style="padding:16px; border-bottom:1px solid rgba(255,255,255,0.1);">Operador</th>
                                <th style="padding:16px; border-bottom:1px solid rgba(255,255,255,0.1);">Ticket</th>
                                <th style="padding:16px; border-bottom:1px solid rgba(255,255,255,0.1);">Ação / Evento</th>
                                <th style="padding:16px; border-bottom:1px solid rgba(255,255,255,0.1);">Cód. Vaga</th>
                            </tr>
                        </thead>
                        <tbody id="tbody_supervisao_logs">
                            <tr><td colspan="5" style="padding:20px; text-align:center; color: #cbd5e1;">Buscando rastros na nuvem...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(painel);
        
        // Tratamento da CSP: Ouve o evento de clique pelo AddEventListener
        document.getElementById('btn_fechar_supervisao').addEventListener('click', fecharSupervisao);
        
    } else {
        painel.style.display = 'block';
    }

    // Buscando dados no Firebase
    if (typeof db !== 'undefined') {
        db.ref('logs_operacionais').once('value', snapshot => {
            let dados = snapshot.val();
            let tbodyResumo = document.getElementById('tbody_supervisao_resumo');
            let tbodyLogs = document.getElementById('tbody_supervisao_logs');
            
            if (!dados) { 
                tbodyResumo.innerHTML = "<tr><td colspan='4' style='padding:15px; text-align:center;'>Equipe ainda não iniciou os trabalhos.</td></tr>"; 
                tbodyLogs.innerHTML = "<tr><td colspan='5' style='padding:15px; text-align:center;'>Nenhum registro encontrado.</td></tr>"; 
                return; 
            }
            
            let stats = {};
            let todosLogs = [];

            // Separa os dados para os dois painéis
            Object.keys(dados).forEach(key => {
                let log = dados[key];
                todosLogs.push(log);

                if (!stats[log.operador]) stats[log.operador] = { count: 0, lastVaga: '-', lastAcao: '-', lastTime: 0 };
                stats[log.operador].count++;
                
                let time = new Date(log.dataHora).getTime();
                if (time > stats[log.operador].lastTime) {
                    stats[log.operador].lastTime = time;
                    stats[log.operador].lastVaga = log.vaga || '-';
                    stats[log.operador].lastAcao = log.acao || '-';
                }
            });

            // 1. Renderiza o Resumo (Ordenado por quem produziu mais)
            let htmlResumo = "";
            let sortedOps = Object.keys(stats).sort((a, b) => stats[b].count - stats[a].count);
            sortedOps.forEach(op => {
                let dataFormatada = new Date(stats[op].lastTime).toLocaleTimeString('pt-BR');
                htmlResumo += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">
                    <td style="padding:16px; font-weight:bold; color:#60a5fa; font-size: 14px;">${op}</td>
                    <td style="padding:16px;"><span style="background:rgba(34, 197, 94, 0.2); border:1px solid rgba(34, 197, 94, 0.5); color:#4ade80; padding:6px 16px; border-radius:12px; font-size:13px; font-weight: bold;">${stats[op].count}</span></td>
                    <td style="padding:16px; color:#f8fafc;">${stats[op].lastVaga}</td>
                    <td style="padding:16px; font-size:13px; color:rgba(255,255,255,0.7);"><b>${stats[op].lastAcao}</b> (às ${dataFormatada})</td>
                </tr>`;
            });
            tbodyResumo.innerHTML = htmlResumo;

            // 2. Renderiza os Logs Detalhados (Mais recentes primeiro - Top 100)
            todosLogs.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
            let htmlLogs = "";
            let recentLogs = todosLogs.slice(0, 100);
            
            recentLogs.forEach(log => {
                let timeStr = new Date(log.dataHora).toLocaleTimeString('pt-BR');
                let dateStr = new Date(log.dataHora).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
                
                // Sistema de Cores (Badges) baseado na Ação
                let acaoLower = (log.acao || "").toLowerCase();
                let colorBadge = "rgba(59, 130, 246, 0.2)"; let borderBadge = "rgba(59, 130, 246, 0.5)"; let textBadge = "#60a5fa"; // Azul
                
                if (acaoLower.includes('abertura')) {
                    colorBadge = "rgba(34, 197, 94, 0.2)"; borderBadge = "rgba(34, 197, 94, 0.5)"; textBadge = "#4ade80"; // Verde
                } else if (acaoLower.includes('convoca')) {
                    colorBadge = "rgba(249, 115, 22, 0.2)"; borderBadge = "rgba(249, 115, 22, 0.5)"; textBadge = "#fb923c"; // Laranja
                } else if (acaoLower.includes('acomp') || acaoLower.includes('registro')) {
                    colorBadge = "rgba(168, 85, 247, 0.2)"; borderBadge = "rgba(168, 85, 247, 0.5)"; textBadge = "#c084fc"; // Roxo
                }

                htmlLogs += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: 0.2s;">
                    <td style="padding:14px; color:rgba(255,255,255,0.6); font-size: 13px;">${dateStr} às <b>${timeStr}</b></td>
                    <td style="padding:14px; font-weight:bold; color:#e2e8f0; font-size: 13px;">${log.operador}</td>
                    <td style="padding:14px; color:#94a3b8; font-size: 13px; font-family: monospace;">#${log.ticket || '-'}</td>
                    <td style="padding:14px;"><span style="background:${colorBadge}; border:1px solid ${borderBadge}; color:${textBadge}; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:bold; letter-spacing: 0.5px; text-transform: uppercase;">${log.acao}</span></td>
                    <td style="padding:14px; color:#cbd5e1; font-size: 13px; font-weight: 600;">${log.vaga || '-'}</td>
                </tr>`;
            });
            tbodyLogs.innerHTML = htmlLogs;

            if(typeof showToast === 'function') showToast("Sincronização Concluída!", "success");
        });
    }
}

function fecharSupervisao() {
    let painel = document.getElementById('screen_supervisao');
    if(painel) painel.style.display = 'none'; 
    let demanda = document.getElementById('screen_demanda');
    if(demanda) demanda.classList.add('active');
}
// --- COMMAND CENTER (Ctrl+K) ---
const hubCommands = [
    { icon: '👤', title: 'Abrir mesa individual', hint: 'Fluxo de ticket único', run: () => iniciarIndividual() },
    { icon: '🏭', title: 'Entrar no modo fila', hint: 'Linha de montagem', run: () => iniciarFila() },
    { icon: '📥', title: 'Ver fila de trabalho', hint: 'Acompanhar pendências', run: () => openTabLibre('fila') },
    { icon: '📝', title: 'Abertura de vaga', hint: 'Formulário principal', run: () => openTabLibre('abertura') },
    { icon: '🤖', title: 'Abertura IA', hint: 'Assistente beta', run: () => openTabLibre('abertura_ia') },
    { icon: '⚡', title: 'Super Acomps', hint: 'Acompanhamentos rápidos', run: () => openTabLibre('acomps') },
    { icon: '📣', title: 'Convocação', hint: 'Gerar solicitação', run: () => openTabLibre('convocacao') },
    { icon: '👥', title: 'Catálogo', hint: 'Contatos e regiões', run: () => openTabLibre('catalogo') },
    { icon: '📊', title: 'Relatórios e logs', hint: 'Métricas do dia', run: () => openTabLibre('relatorios') },
    { icon: '🌙', title: 'Alternar modo escuro', hint: 'Tema visual', run: () => toggleDarkMode() },
    { icon: '🧹', title: 'Encerrar e limpar mesa', hint: 'Finalizar atendimento', run: () => document.getElementById('btn_encerrar_global')?.click() }
];

function openCommandPalette() {
    const palette = document.getElementById('command_palette');
    const search = document.getElementById('command_search');
    if (!palette || !search) return;
    palette.classList.add('active');
    palette.setAttribute('aria-hidden', 'false');
    renderCommandResults('');
    setTimeout(() => search.focus(), 30);
}

function closeCommandPalette() {
    const palette = document.getElementById('command_palette');
    if (!palette) return;
    palette.classList.remove('active');
    palette.setAttribute('aria-hidden', 'true');
}

function renderCommandResults(query = '') {
    const list = document.getElementById('command_results');
    if (!list) return;
    const normalized = query.trim().toLowerCase();
    const results = hubCommands.filter(cmd => `${cmd.title} ${cmd.hint}`.toLowerCase().includes(normalized));
    list.innerHTML = results.map((cmd, index) => `
        <button class="command-item ${index === 0 ? 'is-highlighted' : ''}" data-command-index="${hubCommands.indexOf(cmd)}">
            <span class="quick-action-icon">${cmd.icon}</span>
            <span><strong>${cmd.title}</strong><br><small>${cmd.hint}</small></span>
            ${index === 0 ? '<span class="command-kbd">Enter</span>' : ''}
        </button>
    `).join('') || '<div class="command-item">Nenhuma ação encontrada.</div>';
}

document.addEventListener('keydown', (event) => {
    const isCommandShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    if (isCommandShortcut) {
        event.preventDefault();
        openCommandPalette();
        return;
    }
    if (event.key === 'Escape') closeCommandPalette();
    if (event.key === 'Enter' && document.activeElement?.id === 'command_search') {
        const first = document.querySelector('.command-item[data-command-index]');
        if (first) first.click();
    }
});

document.addEventListener('input', (event) => {
    if (event.target?.id === 'command_search') renderCommandResults(event.target.value);
});

document.addEventListener('click', (event) => {
    if (event.target?.id === 'command_palette') closeCommandPalette();
    const opener = event.target.closest('[data-action="openCommandPalette"]');
    if (opener) {
        event.preventDefault();
        openCommandPalette();
        return;
    }
    const commandButton = event.target.closest('[data-command-index]');
    if (!commandButton) return;
    const command = hubCommands[Number(commandButton.dataset.commandIndex)];
    if (!command) return;
    closeCommandPalette();
    command.run();
});

function atualizarHomeDashboard() {
    const filaAtual = typeof filaTrabalho !== 'undefined' ? filaTrabalho : window.filaTrabalho;
    const filaPendente = Array.isArray(filaAtual) ? filaAtual.filter(item => item.status === 'pendente').length : 0;
    const ticket = document.getElementById('display_ticket_global')?.innerText || 'Nenhum';
    const draft = localStorage.getItem('hub_draft');
    const ticketCard = document.getElementById('home_dash_ticket');
    const filaCard = document.getElementById('home_dash_fila');
    const draftCard = document.getElementById('home_dash_draft');
    if (ticketCard) ticketCard.innerText = ticket && ticket !== 'Nenhum' ? `#${ticket}` : '#';
    if (filaCard) filaCard.innerText = String(filaPendente);
    if (draftCard) draftCard.innerText = draft && draft !== '{}' ? 'Sim' : 'Auto';
}

document.addEventListener('DOMContentLoaded', atualizarHomeDashboard);
setInterval(atualizarHomeDashboard, 2500);
