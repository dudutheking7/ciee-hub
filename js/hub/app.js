// ==========================================
// /js/hub/app.js - (V4.2.1 - Hub PRO: Lotes, Rich Text & Supabase Sniper)
// ==========================================

// Variáveis Globais de Estado
var operador = "";
var ticket_global = "";
var vagas_tratadas_hoje = [];
var isProcessing = false;
var draftTimeout;
var isLimpandoMesa = false;
var filaTrabalho = []; 
var isModoFila = false;
var ocultarConcluidas = false;
var isModoDev = false;

// O CARRINHO DE MÚLTIPLAS VAGAS
var loteBuffer = [];

var cursosEstagio = ["Administração", "Ciências Contábeis", "Comunicação Social", "Direito", "Engenharia Civil", "Engenharia de Produção", "Engenharia Elétrica", "Logística", "Marketing", "Pedagogia", "Recursos Humanos", "Sistemas de Informação", "Tecnologia da Informação"];
var arcosAprendiz = ["Arco Administrativo", "Arco Alimentação", "Arco Atacado Varejo", "Arco Varejo", "Asseio e Conservação", "Auxiliar de Logística", "Auxiliar de Produção", "Indústria da Carne: Múltiplas Ocupações", "Operador de Suporte", "Operador de Telemarketing", "Serviços de Turismo e Hotelaria"];

var catalogo = [
    { nome: "Marcela Veras", cargo: "Supervisão", regiao: "Oeste/Sudoeste", email: "marcelav@cieerj.org.br", ramal: "21 99769-7334" },
    { nome: "Lara Fernandes", cargo: "Apoio Comercial", regiao: "Oeste/Sudoeste", email: "apoio.capital3@cieerj.org.br", ramal: "Ramal: 101222" },
    { nome: "Lorena de Souza", cargo: "Consultor DG", regiao: "Digital Centro", email: "lorenads@cieerj.org.br", ramal: "21 99732-3896" },
    { nome: "Pedro Lucas", cargo: "Consultor DG", regiao: "Digital Zona Sul", email: "pedrols@cieerj.org.br", ramal: "21 99962-2944" },
    { nome: "Grazielle Holanda", cargo: "Estagiário DG", regiao: "Digital", email: "grazielleh@cieerj.org.br", ramal: "21 99962-2944" },
    { nome: "Fabiana Hervaes", cargo: "Consultor", regiao: "Centro", email: "fabianah@cieerj.org.br", ramal: "Carteira 64" },
    { nome: "Pedro Tostes", cargo: "Consultor", regiao: "Zona Norte", email: "pedrof@cieerj.org.br", ramal: "Carteira 66" }
];

document.addEventListener('DOMContentLoaded', () => {
    let savedSig = localStorage.getItem('hub_operador');
    if(savedSig) { document.getElementById('user_signature').value = savedSig; fazerLogin(); }
    if(localStorage.getItem('ciee_dark_theme') === 'true') document.body.classList.add('dark-theme');

    let menuSuperior = document.querySelector('.top-bar-ticket div:last-child');
    if(menuSuperior) {
        menuSuperior.insertAdjacentHTML('afterbegin', `
            <button class="btn-mini" style="background:#dc3545; border: 1px solid #c82333; margin-right:10px;" data-action="abrirSupervisao" title="Alt + M">🛡️ Supervisão</button>
            <button class="btn-mini" style="background:#343a40; border: 1px solid #555; margin-right:10px;" data-action="toggleDarkMode" title="Alt + D">🌙 Modo Escuro</button>
        `);
    } else {
        let fallbackContainer = document.createElement('div');
        fallbackContainer.style.cssText = "position:absolute; top:10px; right:20px; z-index:9999;";
        fallbackContainer.innerHTML = `
            <button class="btn-mini" style="background:#dc3545; border: 1px solid #c82333; color:white; padding:6px; border-radius:4px; margin-right:5px;" data-action="abrirSupervisao" title="Alt + M">🛡️ Supervisão</button>
            <button class="btn-mini" style="background:#343a40; border: 1px solid #555; color:white; padding:6px; border-radius:4px;" data-action="toggleDarkMode" title="Alt + D">🌙 Modo Escuro</button>
        `;
        document.body.appendChild(fallbackContainer);
    }

    if(typeof carregarVagasDoDia === 'function') carregarVagasDoDia();
    if(typeof carregarFila === 'function') carregarFila();
    if(typeof renderizarCatalogo === 'function') renderizarCatalogo();
    if(typeof renderizarLogs === 'function') renderizarLogs();
    if(typeof verificarRascunho === 'function') verificarRascunho();
    renderizarLoteVisual();
});

document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        if(isModoFila) {
            let prox = filaTrabalho.find(i => i.status === 'pendente');
            if(prox) atacarVaga(prox.vaga);
            else showToast("Nenhuma vaga pendente na fila!", "warning");
        } else { showToast("Atalho Alt+Q funciona apenas no Modo Fila.", "info"); }
    }
    if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        let btnEncerrar = document.getElementById('btn_encerrar_global');
        if (btnEncerrar) btnEncerrar.click();
    }
    if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault(); toggleDarkMode();
    }
    if (e.altKey && e.key.toLowerCase() === 'm') { 
        e.preventDefault(); abrirPainelSupervisao(); 
    }
    if (e.altKey && e.key.toLowerCase() === 's') { 
        e.preventDefault(); 
        isModoDev = !isModoDev; 
        showToast(isModoDev ? "🛠️ Shadow Mode (Dev) ATIVADO" : "🛠️ Shadow Mode DESATIVADO", isModoDev ? "warning" : "info"); 
    }
});

// =========================================================================
// 🎯 SNIPER: ABRIR VAGA DIRETO NO PORTAL DE TALENTOS
// =========================================================================
window.abrirVagaPortalTalentos = function(codigoVaga) {
    if (!codigoVaga) return;
    
    // Abre o cofre para pegar o Token que o Espião guardou
    chrome.storage.local.get(['ciee_talentos_token'], async function(result) {
        let bearerToken = result.ciee_talentos_token;
        
        if (!bearerToken) {
            if(typeof showToast === 'function') showToast("⚠️ Abra o Portal de Talentos uma vez para sincronizar seu login!", "error");
            return;
        }

        const SUPABASE_URL = "https://hcfsekhaqfosfjdlxmir.supabase.co/rest/v1/vagas";
        const API_KEY = "sb_publishable_Z6YyY3EfHBNcEZWfCaoM3g_jzndFdsR"; 
        const query = `?select=id&codigo_oportunidade=eq.${codigoVaga}&limit=1`;
        
        try {
            if(typeof showToast === 'function') showToast(`🎯 Mirando na vaga ${codigoVaga}...`, "info");
            
            const response = await fetch(SUPABASE_URL + query, {
                method: 'GET',
                headers: {
                    'apikey': API_KEY,
                    'Authorization': `Bearer ${bearerToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error("Token expirado ou API falhou");

            const data = await response.json();
            
            if (data && data.length > 0) {
                const uuid = data[0].id;
                const linkVaga = `https://talentos.cieerj.org.br/admin/vagas/${uuid}`;
                window.open(linkVaga, '_blank'); 
            } else {
                if(typeof showToast === 'function') showToast(`⚠️ Vaga ${codigoVaga} não encontrada no banco novo.`, "warning");
            }
        } catch (error) {
            console.error(error);
            if(typeof showToast === 'function') showToast("❌ Erro. Tente dar F5 no Portal de Talentos para renovar o login.", "error");
        }
    });
};

document.addEventListener('click', (e) => {
    if(e.target.id === 'btn_add_vaga_lote') { e.preventDefault(); adicionarVagaLote(); return; }
    if(e.target.id === 'btn_gerar_multiplo') { e.preventDefault(); gerarRespostaMultiplaLote(); return; }
    if(e.target.classList.contains('btn-remove-lote')) {
        e.preventDefault();
        let vaga = e.target.getAttribute('data-vaga');
        loteBuffer = loteBuffer.filter(i => i.vaga !== vaga);
        renderizarLoteVisual();
        showToast(`Vaga ${vaga} removida.`, "info");
        return;
    }

    let btn = e.target.closest('[data-action]');
    if (!btn || isProcessing) return; 
    let action = btn.getAttribute('data-action');
    
    try {
        if(action === 'login') fazerLogin();
        else if(action === 'logout') fazerLogout();
        else if(action === 'iniciarIndividual') iniciarIndividual();
        else if(action === 'iniciarFila') iniciarFila();
        else if(action === 'sairModoFila') sairModoFila();
        else if(action === 'encerrar') { isProcessing = true; encerrarDemanda(); }
        else if(action === 'openTab') openTab(btn.getAttribute('data-tab'));
        else if(action === 'openTabLibre') openTabLibre(btn.getAttribute('data-tab'));
        else if(action === 'toggleExtractor') toggleExtractor(btn.getAttribute('data-type'));
        else if(action === 'gerarAbertura') gerarAberturaCompleta();
        else if(action === 'gerarRegistro') gerarRegistroEResposta();
        else if(action === 'gerarAcomp') gerarAcomp();
        else if(action === 'gerarConvocacao') gerarConvocacao();
        else if(action === 'extrairTexto') extrairDoTexto();
        else if(action === 'processarZip') processarZip();
        else if(action === 'copiarTextoFixo') copiarTextoFixo(btn.getAttribute('data-tipo'));
        else if(action === 'copiarEditavel') copiarTextoEditavel(btn.getAttribute('data-target'), btn.getAttribute('data-nome'), btn);
        else if(action === 'copiarUnitario') copiarUnitario(btn.getAttribute('data-target'), btn);
        else if(action === 'exportarCSV') baixarBackupCSV();
        else if(action === 'exportarJSON') exportarBackupJSON();
        else if(action === 'importarJSONBotao') document.getElementById('import_json').click();
        else if(action === 'limparLogs') limparLogs();
        else if(action === 'baixarID_DG') { navigator.clipboard.writeText('1734319').then(()=>showToast('ID DG Copiado!', 'success')); }
        else if(action === 'restaurarRascunho') restaurarRascunho();
        else if(action === 'descartarRascunho') descartarRascunho();
        else if(action === 'toggleLog') toggleLogGroup(btn.getAttribute('data-ticket'), btn);
        else if(action === 'toggleDarkMode') toggleDarkMode();
        else if(action === 'gerarFila') gerarFila();
        else if(action === 'limparFila') limparFila();
        else if(action === 'atacarVaga') atacarVaga(btn.getAttribute('data-vaga'));
        else if(action === 'mudarStatusFila') mudarStatusFila(btn.getAttribute('data-vaga'));
        else if(action === 'removerVagaFila') removerVagaFila(btn.getAttribute('data-vaga'));
        else if(action === 'abrirSupervisao') abrirPainelSupervisao();
        // GATILHO DO SNIPER INSERIDO AQUI
        else if(action === 'abrirPortalTalentos') window.abrirVagaPortalTalentos(btn.getAttribute('data-vaga'));
    } catch(err) { console.error("Erro:", action, err); isProcessing = false; }
});

document.addEventListener('change', (e) => {
    if(e.target.name === 'ab_mod') atualizarInterface();
    if(e.target.id === 'ab_horario_entrada' || e.target.id === 'ab_horario_saida') calcularCargaHoraria();
    if(e.target.id === 'reg_motivo') verificarCamposDinamicosRegistro();
    if(e.target.id === 'acomp_tipo') { if(typeof toggleZipModule === 'function') toggleZipModule(); }
    if(e.target.id === 'conv_tipo') { if(typeof toggleConvocacao === 'function') toggleConvocacao(); }
    if(e.target.id === 'toggle_ocultar_concluidas') { ocultarConcluidas = e.target.checked; renderizarFila(); }
    if(e.target.id === 'excel_upload' || e.target.id === 'pdf_airtable_upload' || e.target.id === 'file_upload') {
        const file = e.target.files[0];
        if (file) {
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.pdf')) carregarPDFAirtableLocal(e);
            else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) lerPlanilha(e);
            else { showToast("Formato não suportado.", "error"); e.target.value = ''; }
        }
    }
    if(e.target.id === 'import_json') importarBackup(e);
});

document.addEventListener('input', (e) => {
    if(e.target.id === 'ab_regiao') checkDG();
    if(e.target.id === 'busca_catalogo') filtrarCatalogo();
    if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') saveDraft();
    
    if(e.target.id === 'acomp_vaga' || e.target.id === 'ab_vaga') renderizarLoteVisual();
});

document.addEventListener('focusout', (e) => {
    if(e.target.id === 'ab_bolsa' || e.target.id === 'ab_vt') formatarMoeda(e.target);
});

document.getElementById('user_signature').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') fazerLogin();
});

// ==========================================
// FUNÇÕES DE LOTE (MÚLTIPLAS VAGAS) - REFINADAS
// ==========================================

function adicionarVagaLote() {
    if(!ticket_global || ticket_global === "Consulta") return showToast("Escaneie um Ticket primeiro no Zendesk!", "error");
    
    let inputEl = document.getElementById('input_vincular_vaga');
    let textoBruto = inputEl.value.trim();
    if(!textoBruto) return showToast("Digite ou cole as vagas.", "warning");
    
    let matches = textoBruto.match(/\d{4,8}/g);
    if (!matches) return showToast("Nenhuma vaga válida encontrada no texto.", "error");
    
    let adicionadas = 0;
    
    matches.forEach(vagaExtra => {
        let itemFila = filaTrabalho.find(i => i.vaga === vagaExtra);
        if(!itemFila) {
            filaTrabalho.push({ vaga: vagaExtra, status: 'pendente', ticket: ticket_global });
        } else {
            itemFila.ticket = ticket_global;
        }
        
        if(!loteBuffer.find(i => i.vaga === vagaExtra)) {
            loteBuffer.push({ vaga: vagaExtra, link: "", senha: "" });
            adicionadas++;
        }
    });

    localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho));
    renderizarFila();
    inputEl.value = "";
    renderizarLoteVisual();
    
    if (adicionadas > 0) {
        showToast(`${adicionadas} vaga(s) vinculada(s) ao Ticket #${ticket_global}`, "success");
    } else {
        showToast("Vaga(s) já vinculada(s) ao lote.", "info");
    }
}

function renderizarLoteVisual() {
    let container = document.getElementById('container_vagas_lote');
    let painel = document.getElementById('painel_vagas_multiplas');
    let btnGerar = document.getElementById('btn_gerar_multiplo');
    let contador = document.getElementById('contador_vagas_lote');
    
    if(!container || !painel) return;
    
    if(ticket_global === "" || ticket_global === "Consulta") {
        painel.style.display = 'none';
        return;
    }
    
    painel.style.display = 'block';

    let vagaMesa = document.getElementById('ab_vaga')?.value || document.getElementById('acomp_vaga')?.value;
    if(vagaMesa && !loteBuffer.find(i => i.vaga === vagaMesa)) {
        loteBuffer.push({ vaga: vagaMesa, link: "", senha: "" });
    }
    
    contador.innerText = loteBuffer.length + " Vaga(s)";
    
    let html = "";
    let todasProntas = true;
    
    if (loteBuffer.length === 0) {
        html = `<span style="font-size: 12px; color: #888; font-style: italic;">Nenhuma vaga no lote. Digite o número acima e clique em Vincular.</span>`;
        todasProntas = false;
    } else {
        loteBuffer.forEach(item => {
            if(item.link && item.senha) {
                html += `<div class="vaga-tag ok" title="Link e Senha prontos">
                            <span class="status-icon">✅</span> ${item.vaga}
                            <button class="btn-remove-lote" data-vaga="${item.vaga}" style="background:transparent; border:none; color:inherit; cursor:pointer; font-weight:bold; margin-left:4px; padding:0;">×</button>
                         </div>`;
            } else {
                html += `<div class="vaga-tag" title="Aguardando Link/Senha do Portal">
                            <span class="status-icon">⏳</span> ${item.vaga}
                            <button class="btn-remove-lote" data-vaga="${item.vaga}" style="background:transparent; border:none; color:inherit; cursor:pointer; font-weight:bold; margin-left:4px; padding:0;">×</button>
                         </div>`;
                todasProntas = false;
            }
        });
    }
    
    container.innerHTML = html;
    
    if(loteBuffer.length > 1 && todasProntas) {
        btnGerar.style.display = 'block';
        document.getElementById('btn_gerar_acomp').style.display = 'none';
    } else {
        btnGerar.style.display = 'none';
        document.getElementById('btn_gerar_acomp').style.display = 'block';
    }
}

function gerarRespostaMultiplaLote() {
    let nomeEmpresa = document.getElementById('acomp_nome').value || "Empresa Parceira";
    let numerosVagas = loteBuffer.map(i => i.vaga).join(', ');
    
    // HTML RICH TEXT EXATAMENTE COMO NO SEU MODELO
    let textoZendeskHTML = `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <p>Olá, ${nomeEmpresa}!</p>
    <p>Informamos que já temos candidatos interessados nas vagas nº <strong>${numerosVagas}</strong> e os currículos estão disponíveis para sua análise.</p>
    <p>🔗 Acesse os perfis por meio dos links abaixo:</p>`;
    
    // LOOP CRIANDO UM BLOCO AZUL PARA CADA VAGA
    loteBuffer.forEach(item => {
        textoZendeskHTML += `
    <div style="background-color: #f4f6f8; border-left: 4px solid #004c99; padding: 15px; margin: 15px 0; border-radius: 4px;">
        <p style="margin: 0 0 5px 0;"><strong>📌 Vaga:</strong> ${item.vaga}</p>
        <p style="margin: 0 0 5px 0;"><strong>🔗 Link:</strong> <a href="${item.link}" style="color: #004c99; text-decoration: none;">${item.link}</a></p>
        <p style="margin: 0;"><strong>🔑 Senha:</strong> <span style="font-family: monospace; background: #e1e5eb; padding: 2px 6px; border-radius: 4px;">${item.senha}</span></p>
    </div>`;
    });
    
    // FECHAMENTO DA ESTRUTURA
    textoZendeskHTML += `
    <p>Para tornar o processo mais ágil e assertivo, os candidatos foram organizados considerando a aderência ao perfil da oportunidade, facilitando a identificação dos perfis mais compatíveis com as vagas.</p>
    
    <ul style="list-style: none; padding-left: 0;">
        <li style="margin-bottom: 5px;">✅ Maior assertividade na seleção;</li>
        <li style="margin-bottom: 5px;">✅ Redução do tempo de triagem;</li>
        <li style="margin-bottom: 5px;">✅ Perfis alinhados aos requisitos da oportunidade;</li>
        <li style="margin-bottom: 5px;">✅ Processo mais eficiente e organizado.</li>
    </ul>

    <p>Ficaremos no aguardo do seu retorno com os candidatos selecionados para as próximas etapas ou com eventuais considerações sobre os perfis apresentados.</p>
    <p>Caso necessite de apoio durante a análise ou tenha qualquer dúvida, nossa equipe permanece à disposição para auxiliá-los.</p>
    <p>Atenciosamente,</p>
</div>`;

    injetarSilencioso(textoZendeskHTML);
    showToast("Lote Múltiplo enviado ao Zendesk com sucesso!", "success");
    
    let logTexto = `Ação: Envio Múltiplo de Currículos via Link (Novo Portal). | Vagas Vinculadas: ${numerosVagas}. | Status: Aguardando retorno da empresa. | Ticket: #${ticket_global} | ${operador}`;
    setValSeguro('out_acomp_log', logTexto);
    if(typeof copiarLogAutomatico === 'function') copiarLogAutomatico(logTexto, "Log Kairós (Lote Múltiplo)");
    
    loteBuffer.forEach(item => {
        let dtRetorno = new Date(); dtRetorno.setDate(dtRetorno.getDate() + 7);
        if(typeof salvarVagaParaSincronia === 'function') salvarVagaParaSincronia(item.vaga, "SEM RETORNO DA EMPRESA/VISITA DO ASSISTENTE", dtRetorno.toISOString().split('T')[0], ticket_global);
    });

    forcarExibicaoCaixas();
    document.getElementById('out_acomp').value = textoZendeskHTML;
}


if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        
        if (message.acao === "getMesaHub") {
            sendResponse({
                bolsa: (document.getElementById('ab_bolsa')||{}).value || "",
                vt: (document.getElementById('ab_vt')||{}).value || "",
                sexo: (document.getElementById('ab_sexo')||{}).value || "Ambos",
                horario_entrada: (document.getElementById('ab_horario_entrada')||{}).value || "",
                horario_saida: (document.getElementById('ab_horario_saida')||{}).value || ""
            });
            return true;
        }

        if (message.acao === "receberDadosZendesk") {
            const dados = message.payload;
            let vagaAndamento = isModoFila ? filaTrabalho.find(i => i.status === 'andamento') : null;

            if (dados.ticket) {
                if (ticket_global !== "" && ticket_global !== dados.ticket) {
                    if(!isModoFila) limparCamposMesa();
                    loteBuffer = [];
                }
                
                ticket_global = dados.ticket; document.getElementById('input_ticket_global').value = dados.ticket; document.getElementById('display_ticket_global').innerText = dados.ticket;
                if (vagaAndamento) { vagaAndamento.ticket = dados.ticket; localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho)); renderizarFila(); atualizarBannerFila(vagaAndamento.vaga, ticket_global); }
                document.getElementById('screen_demanda').classList.remove('active'); document.getElementById('screen_tool').classList.add('active');
            }

            let tipo = detectarTipoEPreencherVaga(dados.assunto || "", dados.textoCorpo || "");
            if (tipo === "ACOMP" || vagaAndamento) openTab('acomps'); else openTab('abertura');

            let vagaFinal = vagaAndamento ? vagaAndamento.vaga : (dados.ab_vaga || "");
            if(vagaFinal) { setValSeguro('ab_vaga', vagaFinal); setValSeguro('acomp_vaga', vagaFinal); setValSeguro('conv_vaga', vagaFinal); setValSeguro('reg_vaga', vagaFinal); }
            if(dados.ab_empresa) { setValSeguro('ab_empresa', dados.ab_empresa); setValSeguro('acomp_nome', dados.ab_empresa); setValSeguro('conv_empresa', dados.ab_empresa); }
            if(dados.ab_curso) { setValSeguro('ab_curso', dados.ab_curso); setValSeguro('acomp_curso', dados.ab_curso); }
            if(dados.ab_qtd_vagas) setValSeguro('ab_qtd_vagas', dados.ab_qtd_vagas);
            if(dados.ab_bolsa) setValSeguro('ab_bolsa', "R$ " + dados.ab_bolsa);
            if(dados.ab_vt) setValSeguro('ab_vt', "R$ " + dados.ab_vt);
            if(dados.ab_email_solic) setValSeguro('ab_email_solic', dados.ab_email_solic);
            if(dados.horario_cru) parseHorarioParaCampos(dados.horario_cru);
            
            renderizarLoteVisual();
            showToast("Dados extraídos com sucesso!", "success"); saveDraft();
        }

        if (message.acao === "receberDadosZendeskIA") {
            const dados = message.payload;
            let vagaAndamento = isModoFila ? filaTrabalho.find(i => i.status === 'andamento') : null;
            
            if (ticket_global !== "" && ticket_global !== dados.ticket) {
                if(!isModoFila) limparCamposMesa();
                loteBuffer = [];
            }
            
            ticket_global = dados.ticket || ""; document.getElementById('input_ticket_global').value = ticket_global; document.getElementById('display_ticket_global').innerText = ticket_global || "Sem Ticket";

            if (vagaAndamento) { vagaAndamento.ticket = dados.ticket; localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho)); renderizarFila(); atualizarBannerFila(vagaAndamento.vaga, ticket_global); }
            
            document.getElementById('screen_demanda').classList.remove('active'); document.getElementById('screen_tool').classList.add('active');

            detectarTipoEPreencherVaga(dados.assunto || "", dados.textoCorpo || "");
            let vagaFinal = vagaAndamento ? vagaAndamento.vaga : (dados.ab_vaga || "");
            if(vagaFinal) { setValSeguro('ab_vaga', vagaFinal); setValSeguro('acomp_vaga', vagaFinal); setValSeguro('conv_vaga', vagaFinal); setValSeguro('reg_vaga', vagaFinal); }
            if(dados.ab_empresa) setValSeguro('ab_empresa', dados.ab_empresa);
            if(dados.ab_curso) setValSeguro('ab_curso', dados.ab_curso);
            if(dados.ab_bolsa) setValSeguro('ab_bolsa', "R$ " + dados.ab_bolsa);
            if(dados.horario_cru) parseHorarioParaCampos(dados.horario_cru);

            let resultadosRegex = { empresa: (document.getElementById('ab_empresa')||{}).value || "", curso: (document.getElementById('ab_curso')||{}).value || "", bolsa: (document.getElementById('ab_bolsa')||{}).value || "" };

            if(typeof auditarComGemini === 'function') auditarComGemini(dados.assunto, dados.textoCorpo, dados.ticket, resultadosRegex);
            renderizarLoteVisual();
        }
        
        if (message.acao === "receberDadosAirtable") {
            trituradorAirtable(message.payload);
            document.getElementById('screen_demanda').classList.remove('active');
            document.getElementById('screen_tool').classList.add('active');
            openTab('abertura');
        }

        if (message.acao === "encaminharLinkHub") {
            setValSeguro('acomp_link', message.payload.link);
            setValSeguro('acomp_senha', message.payload.senha);
            setValSeguro('acomp_tipo', 'envio_curriculos_link'); 
            
            let vagaCapturada = message.payload.vaga; 
            if(vagaCapturada && vagaCapturada !== "Indefinida") {
                let itemLote = loteBuffer.find(i => i.vaga === vagaCapturada);
                if(itemLote) {
                    itemLote.link = message.payload.link;
                    itemLote.senha = message.payload.senha;
                } else {
                    loteBuffer.push({ vaga: vagaCapturada, link: message.payload.link, senha: message.payload.senha });
                }
            } else {
                let vagaMesa = document.getElementById('ab_vaga')?.value || document.getElementById('acomp_vaga')?.value;
                if(vagaMesa) {
                    let itemLote = loteBuffer.find(i => i.vaga === vagaMesa);
                    if(!itemLote) loteBuffer.push({ vaga: vagaMesa, link: message.payload.link, senha: message.payload.senha });
                    else { itemLote.link = message.payload.link; itemLote.senha = message.payload.senha; }
                }
            }
            renderizarLoteVisual();

            document.getElementById('screen_demanda').classList.remove('active');
            document.getElementById('screen_tool').classList.add('active');
            openTab('acomps');
        }

        if (message.acao === "solicitarVagasSincronia") {
            sendResponse({ vagas: JSON.parse(localStorage.getItem('hub_vagas_sinc_sharepoint') || '[]') });
        }
    });
}

// INJEÇÕES SEGURAS (Lógica de Ticket Alvo)
function injetarSilencioso(texto) {
    if (typeof chrome !== 'undefined' && chrome.tabs && ticket_global) {
        chrome.tabs.query({url: "*://*.zendesk.com/*"}, function(tabs) {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {acao: "injetarZendesk", texto: texto, ticket_alvo: ticket_global}); 
            });
        });
    }
}

async function copiarTextoEditavel(elementId, acao, btn) {
    const el = document.getElementById(elementId);
    if(!el || !el.value) return;
    try {
        let text = el.value;
        
        // 1. COPIA PARA A ÁREA DE TRANSFERÊNCIA (O E-mail para o Zendesk)
        if (text.includes('<div') || text.includes('<p>')) {
            const blobHtml = new Blob([text], { type: "text/html" });
            const blobText = new Blob([text.replace(/<[^>]*>?/gm, '')], { type: "text/plain" }); 
            const item = new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText });
            await navigator.clipboard.write([item]);
        } else { await navigator.clipboard.writeText(text); }
        
        let oldText = btn.innerText; btn.innerText = "Copiado! ✓";
        setTimeout(() => btn.innerText = oldText, 2000);
        if (typeof registrarLog === 'function') registrarLog(acao);
        
        // ========================================================
        // 🚀 INJEÇÃO DO PORTAL DE TALENTOS (Extração Visual de Ticket)
        // ========================================================
        let inputLog = document.getElementById('out_acomp_log');
        let textoParaPortal = (inputLog && inputLog.value && inputLog.value.trim() !== "") ? inputLog.value : text.replace(/<[^>]*>?/gm, ''); 
        
        // --- 1. A SUA IDEIA: EXTRAIR O TICKET DIRETO DA TELA ---
        let ticketExtraido = "";
        
        // Tentativa A: Puxar do Banner Azul no topo da tela
        let displayTicket = document.getElementById('display_ticket_global');
        if (displayTicket && displayTicket.innerText && displayTicket.innerText !== "Nenhum") {
            ticketExtraido = displayTicket.innerText.replace(/\D/g, ''); // Arranca tudo que não for número
        }
        
        // Tentativa B: Se o banner falhar, caça a palavra "Ticket: #123" dentro do próprio texto do log
        if (!ticketExtraido || ticketExtraido === "") {
            let matchTicket = textoParaPortal.match(/Ticket:\s*#?(\d+)/i);
            if (matchTicket) ticketExtraido = matchTicket[1];
        }
        
        // Tentativa C: Fallback para a variável global velha de guerra
        if (!ticketExtraido || ticketExtraido === "") {
            ticketExtraido = (typeof ticket_global !== 'undefined') ? ticket_global : "";
        }
        // --------------------------------------------------------

        // 2. DESCOBRE SE É ENVIO OU COBRANÇA
        let selectAcomp = document.getElementById('acomp_tipo');
        let acaoSelecionada = (selectAcomp && selectAcomp.options && selectAcomp.selectedIndex >= 0) ? selectAcomp.options[selectAcomp.selectedIndex].text.toLowerCase() : "";
        
        let isEnvioCurriculo = false;
        if (acaoSelecionada !== "") {
            isEnvioCurriculo = acaoSelecionada.includes("envio") || acaoSelecionada.includes("currículo") || acaoSelecionada.includes("curriculo") || acaoSelecionada.includes("zip");
        } else {
            isEnvioCurriculo = textoParaPortal.toLowerCase().includes("envio");
        }
        
        // 3. SALVA NO COFRE
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({
                'ciee_talentos_sync': {
                    log: textoParaPortal,
                    ticket: ticketExtraido, // Usa o ticket que extraímos visualmente!
                    isEnvio: isEnvioCurriculo
                }
            });
            console.log(`Portal de Talentos: Cofre abastecido! Ticket: ${ticketExtraido} | Envio: ${isEnvioCurriculo}`);
        }
        // ========================================================
        
        // 4. INJETA NO ZENDESK
        if (typeof chrome !== 'undefined' && chrome.tabs && acao.includes("Zendesk")) {
            chrome.tabs.query({url: "*://*.zendesk.com/*"}, function(tabs) {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {acao: "injetarZendesk", texto: text, ticket_alvo: ticketExtraido});
                });
            });
            if (typeof showToast === 'function') showToast("Texto injetado no Zendesk de forma invisível!", "success");
        }
    } catch (err) { console.error(err); if (typeof showToast === 'function') showToast("Erro ao copiar.", "error"); }
}



function iniciarIndividual() {
    const tkInput = document.getElementById('input_ticket_global_ind');
    const tk = tkInput ? tkInput.value.trim() : "";
    ticket_global = tk;
    isModoFila = false;
    loteBuffer = []; 
    document.getElementById('display_ticket_global').innerText = tk || "Sem Ticket";
    document.getElementById('fila_banner_global').classList.remove('active');
    document.getElementById('tab_fila').style.display = 'none';
    document.getElementById('screen_demanda').classList.remove('active');
    document.getElementById('screen_tool').classList.add('active');
    openTab('abertura');
    renderizarLoteVisual();
}

function iniciarFila() {
    isModoFila = true;
    ticket_global = "";
    loteBuffer = []; 
    document.getElementById('display_ticket_global').innerText = "Nenhum";
    document.getElementById('fila_banner_global').classList.add('active');
    document.getElementById('tab_fila').style.display = 'inline-block';
    atualizarBannerFila();
    document.getElementById('screen_demanda').classList.remove('active');
    document.getElementById('screen_tool').classList.add('active');
    openTab('fila');
    renderizarLoteVisual();
}

function sairModoFila() {
    isModoFila = false;
    loteBuffer = [];
    document.getElementById('screen_tool').classList.remove('active');
    document.getElementById('screen_demanda').classList.add('active');
    limparCamposMesa();
    showToast("Você saiu do Modo Fila.", "info");
}

function encerrarDemanda() {
    setTimeout(() => {
        if (isModoFila) {
            let vagaAndamento = filaTrabalho.find(i => i.status === 'andamento');
            if (vagaAndamento && !ticket_global) {
                showToast("⚠️ Anti-Vacilo: Você esqueceu de escanear o Ticket desta vaga!", "error");
                isProcessing = false;
                return;
            }
            if (vagaAndamento) {
                vagaAndamento.status = 'concluido';
                localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho));
                renderizarFila();
                showToast(`Vaga ${vagaAndamento.vaga} concluída na Fila!`, "success");
            }
        }

        ticket_global = "";
        loteBuffer = []; 
        document.getElementById('input_ticket_global').value = "";
        document.getElementById('display_ticket_global').innerText = "Nenhum";
        
        limparCamposMesa();
        renderizarLoteVisual();
        
        if (isModoFila) {
            atualizarBannerFila();
            openTab('fila');
        } else {
            document.getElementById('screen_tool').classList.remove('active');
            document.getElementById('screen_demanda').classList.add('active');
            showToast("Demanda encerrada e mesa limpa com sucesso!", "info");
        }
        isProcessing = false;
    }, 10);
}
// =========================================================================
// 🚀 SINCRONIZADOR GLOBAL DO PORTAL DE TALENTOS (TOTALMENTE AUTOMÁTICO)
// =========================================================================
document.addEventListener('click', (e) => {
    // 1. Procura se o clique foi em algum botão de Ação do Hub
    let btn = e.target.closest('[data-action], #btn_gerar_multiplo');
    
    if (btn) {
        let action = btn.getAttribute('data-action') || btn.id || "";
        
        // 2. A MÁGICA: Se o botão clicado for de GERAR ou PROCESSAR...
        if (action.includes('gerar') || action.includes('processar') || action.includes('injetar') || action === 'btn_gerar_multiplo') {
            
            // 3. Espera 800 milissegundos (Tempo do Hub criar o texto e copiar automático)
            setTimeout(() => {
                let inputLog = document.getElementById('out_acomp_log');
                
                // Se a caixa de Log Interno não estiver vazia, ele inicia o roubo de dados!
                if (inputLog && inputLog.value && inputLog.value.trim() !== "") {
                    let textoPortal = inputLog.value;
                    
                    // Puxa o ticket brilhando no banner azul
                    let tktExtraido = "";
                    let displayTicket = document.getElementById('display_ticket_global');
                    if (displayTicket && displayTicket.innerText && displayTicket.innerText !== "Nenhum") {
                        tktExtraido = displayTicket.innerText.replace(/\D/g, ''); 
                    }
                    if (!tktExtraido) tktExtraido = (typeof ticket_global !== 'undefined') ? ticket_global : "";

                    // Lê o tipo de ação para definir o SLA
                    let selectAcomp = document.getElementById('acomp_tipo');
                    let acaoText = (selectAcomp && selectAcomp.options && selectAcomp.selectedIndex >= 0) ? selectAcomp.options[selectAcomp.selectedIndex].text.toLowerCase() : "";
                    
                    let isEnvio = acaoText.includes("envio") || acaoText.includes("currículo") || acaoText.includes("zip") || textoPortal.toLowerCase().includes("envio");
                    
                    // Tranca tudo no Cofre!
                    if (typeof chrome !== 'undefined' && chrome.storage) {
                        chrome.storage.local.set({
                            'ciee_talentos_sync': { log: textoPortal, ticket: tktExtraido, isEnvio: isEnvio }
                        });
                        console.log(`📡 [AUTOMÁTICO] Cofre abastecido! Ticket: ${tktExtraido} | SLA: ${isEnvio ? 3 : 2} dias.`);
                    }
                }
            }, 800); // Fim do Delay de segurança
        }
    }
});