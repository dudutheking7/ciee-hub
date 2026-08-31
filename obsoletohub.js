// ==========================================
// CIEE HUB V4.0 - PERFORMANCE, NUVEM E IA
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyAkKI_-dltw1ewgfKnow3ycfdz5yVYWFQE",
    authDomain: "cieeproject-br.firebaseapp.com",
    databaseURL: "https://cieeproject-br-default-rtdb.firebaseio.com",
    projectId: "cieeproject-br",
    storageBucket: "cieeproject-br.firebasestorage.app",
    messagingSenderId: "893492782084",
    appId: "1:893492782084:web:d9372f4161dcfe65750151"
};

try {
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.error("Firebase já inicializado ou erro na carga dos scripts.");
}
const db = firebase.database();

let operador = "";
let ticket_global = "";
let vagas_tratadas_hoje = [];
let isProcessing = false;
let draftTimeout;
let isLimpandoMesa = false;
let filaTrabalho = []; 
let isModoFila = false;
let ocultarConcluidas = false;
let isModoDev = false;

const cursosEstagio = ["Administração", "Ciências Contábeis", "Comunicação Social", "Direito", "Engenharia Civil", "Engenharia de Produção", "Engenharia Elétrica", "Logística", "Marketing", "Pedagogia", "Recursos Humanos", "Sistemas de Informação", "Tecnologia da Informação"];
const arcosAprendiz = ["Arco Administrativo", "Arco Alimentação", "Arco Atacado Varejo", "Arco Varejo", "Asseio e Conservação", "Auxiliar de Logística", "Auxiliar de Produção", "Indústria da Carne: Múltiplas Ocupações", "Operador de Suporte", "Operador de Telemarketing", "Serviços de Turismo e Hotelaria"];

const catalogo = [
    { nome: "Marcela Veras", cargo: "Supervisão", regiao: "Oeste/Sudoeste", email: "marcelav@cieerj.org.br", ramal: "21 99769-7334" },
    { nome: "Lara Fernandes", cargo: "Apoio Comercial", regiao: "Oeste/Sudoeste", email: "apoio.capital3@cieerj.org.br", ramal: "Ramal: 101222" },
    { nome: "Lorena de Souza", cargo: "Consultor DG", regiao: "Digital Centro", email: "lorenads@cieerj.org.br", ramal: "21 99732-3896" },
    { nome: "Pedro Lucas", cargo: "Consultor DG", regiao: "Digital Zona Sul", email: "pedrols@cieerj.org.br", ramal: "21 99962-2944" },
    { nome: "Grazielle Holanda", cargo: "Estagiário DG", regiao: "Digital", email: "grazielleh@cieerj.org.br", ramal: "21 99962-2944" },
    { nome: "Fabiana Hervaes", cargo: "Consultor", regiao: "Centro", email: "fabianah@cieerj.org.br", ramal: "Carteira 64" },
    { nome: "Pedro Tostes", cargo: "Consultor", regiao: "Zona Norte", email: "pedrof@cieerj.org.br", ramal: "Carteira 66" }
];

// ==========================================
// FUNÇÕES DE EXTRAÇÃO, SUPERVISÃO E NUVEM (ESCOPO GLOBAL)
// ==========================================

function enviarParaNuvem(acao, vaga, empresa) {
    if (!db || !operador) return;
    let pacote = {
        operador: operador,
        ticket: ticket_global || "-",
        vaga: vaga || "-",
        empresa: empresa || "-",
        acao: acao,
        dataHora: new Date().toISOString()
    };
    db.ref('logs_operacionais').push(pacote).catch(e => console.error("Erro ao sincronizar com Firebase", e));
}

function enviarParaTreinamento(ticket, corpoEmail, analiseRegex, analiseIA) {
    if (!db) return;
    let pacoteFalha = {
        ticket: ticket,
        dataHora: new Date().toISOString(),
        textoOriginal: corpoEmail,
        resultadoRegex: analiseRegex,
        resultadoIA: analiseIA
    };
    db.ref('treinamento_regex').push(pacoteFalha).catch(e => console.error("Erro ao enviar dados para treinamento", e));
}

function abrirPainelSupervisao() {
    let user = prompt("Usuário de Supervisão:");
    if (!user) return;
    let pass = prompt("Senha:");
    if (user === "supervisor_rj" && pass === "CieeRio2026") {
        renderizarDashboardSupervisao();
    } else {
        showToast("Acesso Negado. Credenciais inválidas.", "error");
    }
}

function renderizarDashboardSupervisao() {
    document.getElementById('screen_tool').classList.remove('active');
    document.getElementById('screen_demanda').classList.remove('active');
    
    let painel = document.getElementById('screen_supervisao');
    if (!painel) {
        painel = document.createElement('div');
        painel.id = 'screen_supervisao';
        painel.className = 'container active';
        painel.style.cssText = 'max-width: 1000px; margin: 20px auto; padding: 20px;';
        painel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <h2 style="color:var(--primary-color);">🛡️ Monitoramento de Operações</h2>
                <button class="action-btn" onclick="fecharSupervisao()" style="width:auto; background:#6c757d;">⬅️ Voltar à Mesa</button>
            </div>
            <div class="panel-padrao" style="max-height: 500px; overflow-y: auto; padding:0;">
                <table class="data-table" style="width: 100%; text-align: left; border-collapse: collapse;">
                    <thead style="background:#004c99; color:white;">
                        <tr><th style="padding:12px;">Operador</th><th style="padding:12px;">Produção Total (Ações)</th><th style="padding:12px;">Última Vaga</th><th style="padding:12px;">Última Interação</th></tr>
                    </thead>
                    <tbody id="tbody_supervisao"><tr><td colspan="4" style="padding:15px; text-align:center;">Sincronizando com a Nuvem...</td></tr></tbody>
                </table>
            </div>
        `;
        document.body.appendChild(painel);
    } else {
        painel.classList.add('active');
    }

    db.ref('logs_operacionais').once('value', snapshot => {
        let dados = snapshot.val();
        let tbody = document.getElementById('tbody_supervisao');
        if (!dados) { tbody.innerHTML = "<tr><td colspan='4' style='padding:15px; text-align:center;'>Nenhum dado operacional registrado.</td></tr>"; return; }
        
        let stats = {};
        Object.values(dados).forEach(log => {
            if (!stats[log.operador]) stats[log.operador] = { count: 0, lastVaga: '-', lastAcao: '-', lastTime: 0 };
            stats[log.operador].count++;
            let time = new Date(log.dataHora).getTime();
            if (time > stats[log.operador].lastTime) {
                stats[log.operador].lastTime = time;
                stats[log.operador].lastVaga = log.vaga;
                stats[log.operador].lastAcao = log.acao;
            }
        });

        let html = "";
        let sortedOps = Object.keys(stats).sort((a, b) => stats[b].count - stats[a].count);
        sortedOps.forEach(op => {
            let dataFormatada = new Date(stats[op].lastTime).toLocaleTimeString('pt-BR');
            html += `<tr style="border-bottom: 1px solid #ddd;">
                <td style="padding:12px; font-weight:bold; color:#004c99;">${op}</td>
                <td style="padding:12px;"><span style="background:#28a745; color:white; padding:4px 8px; border-radius:12px; font-size:12px;">${stats[op].count}</span></td>
                <td style="padding:12px;">${stats[op].lastVaga}</td>
                <td style="padding:12px; font-size:12px; color:#555;">${stats[op].lastAcao} (às ${dataFormatada})</td>
            </tr>`;
        });
        tbody.innerHTML = html;
        showToast("Painel de Supervisão Atualizado", "success");
    });
}

window.fecharSupervisao = function() {
    let painel = document.getElementById('screen_supervisao');
    if(painel) painel.classList.remove('active');
    document.getElementById('screen_demanda').classList.add('active');
};

function injetarSilencioso(texto) {
    if (typeof chrome !== 'undefined' && chrome.tabs && ticket_global) {
        chrome.tabs.query({url: "*://*.zendesk.com/*"}, function(tabs) {
            tabs.forEach(tab => {
                if (tab.url.includes(ticket_global)) { 
                    chrome.tabs.sendMessage(tab.id, {acao: "injetarZendesk", texto: texto}); 
                }
            });
        });
    }
}

function forcarExibicaoCaixas() {
    let boxLog = document.getElementById('out_acomp_log');
    if (boxLog) { boxLog.style.display = 'block'; if (boxLog.parentElement) boxLog.parentElement.style.display = 'block'; }
    let boxResp = document.getElementById('out_acomp');
    if (boxResp) { boxResp.style.display = 'block'; if (boxResp.parentElement) boxResp.parentElement.style.display = 'block'; }
    let boxReg = document.getElementById('out_registro');
    if (boxReg) { boxReg.style.display = 'block'; if (boxReg.parentElement) boxReg.parentElement.style.display = 'block'; }
    let boxCliente = document.getElementById('out_resposta_cliente');
    if (boxCliente) { boxCliente.style.display = 'block'; if (boxCliente.parentElement) boxCliente.parentElement.style.display = 'block'; }
}

function limparLixoAirtable(texto) {
    if (!texto) return "";
    return texto.replace(/-Status Empresa.*/ig, '')
                .replace(/Nome da Rua.*/ig, '')
                .replace(/Cidade.*/ig, '')
                .replace(/Estagiários Ativos.*/ig, '')
                .replace(/\[Digital\].*/ig, '')
                .trim();
}

function trituradorAirtable(payload) {
    if (!payload) return;
    let dados = payload.dadosEstruturados || {};
    
    if (Object.keys(dados).length < 2 && payload.textoBruto) {
        showToast("Layout do Airtable alterado. Usando modo de leitura profunda...", "warning");
        trituradorDeVagas(payload.textoBruto);
        return;
    }

    let empresa = dados["Empresa"] || dados["Razão Social"] || "";
    if (empresa.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)) {
        empresa = empresa.replace(/\s*\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}.*/, '').trim();
    }
    empresa = limparLixoAirtable(empresa);

    if (empresa) setValSeguro('ab_empresa', empresa);
    if (dados["Curso"] || dados["Área"]) setValSeguro('ab_curso', dados["Curso"] || dados["Área"]);
    if (dados["Vaga"] || dados["ID da Vaga"]) setValSeguro('ab_vaga', dados["Vaga"] || dados["ID da Vaga"]);
    if (dados["Bolsa"]) setValSeguro('ab_bolsa', dados["Bolsa"]);
    if (payload.textoBruto) setValSeguro('texto_upload', payload.textoBruto);
    
    showToast("Dados do card extraídos com sucesso!", "success");
    saveDraft();
}

function trituradorDeVagas(textoBruto) {
    if (!textoBruto) return;
    let texto = textoBruto.replace(/,{2,}/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n+/g, '\n'); 
    
    const cacarDado = (regexList, fallback = "") => {
        for (let regex of regexList) { let m = texto.match(regex); if (m && m[1] && m[1].trim() !== "") return m[1].trim(); }
        return fallback;
    };
    
    let empresa = cacarDado([/(?:Empresa|Razão Social|Cliente|Empregador|Instituição|Nome Fantasia)[\s\:\-]*\n*\s*([A-ZÀ-Ÿ][^\n\r]+)/i, /Razão Social,([^\n\r,]+)/i, /Cnpj:?\s*([^\n\r]+)/i, /(?:Abertura de Vaga|Segue.*?abertura)[\s\S]*?[\n\r]+\s*([A-ZÀ-Ÿ][^\n\r]+)/i]);
    if (empresa && empresa.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)) empresa = empresa.replace(/\s*\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}.*/, '').trim();
    empresa = limparLixoAirtable(empresa);

    let cursoRaw = cacarDado([/1º opção:?\s*([A-ZÀ-Ÿ][^\n\r,]+)/i, /Jovem Aprendiz CIEE em ([^\n\r,]+)/i, /Area de atuação.*?,Jovem Aprendiz CIEE em ([^\n\r,]+)/i, /(?:Cursos?\s*desejados?|Curso|Área|Formação|Estágio em|Graduação em|Cursos?)[\s\w]*[:\-]?\s*\n*\s*([A-ZÀ-Ÿ][^\n\r]+?(?=Semestre|Período|Horário|Bolsa|Benef|Local|$))/i, /Perfil.*?:\s*([^\n\r]+)/i]);
    let cursoFinal = cursoRaw.toLowerCase().includes("ensino médio") ? "" : cursoRaw;
    
    let bolsa = cacarDado([/(?:Bolsa[\s\-]*Auxílio|Bolsa|Salário|Remuneração|Valor de Salário)[\s\w]*[:\-]?\s*(?:R\$)?\s*([\d\.,]+)/i]); 
    let auxTransp = cacarDado([/(?:Auxílio|Vale[\s\-]?)Transporte|VT[\s\w]*[:\-]?\s*(?:R\$)?\s*([\d\.,]+|Passagem|Modal|Sim|Conforme\s*necessidade)/i], "Não informado");
    let horarioTexto = cacarDado([/(?:Horário|Jornada|Expediente)[\s\w]*[:\-]?\s*\n*\s*([^\n\r]+?(?=Bolsa|Benef|Local|Carga|$))/i, /(\d{1,2}[:h]\d{0,2}\s*(?:às|as|-|a|até)\s*\d{1,2}[:h]\d{0,2})/i], "Não informado");
    let vagas = cacarDado([/(?:vagas?|quantidade|n[°ºo]\s*de\s*vagas)[\s\w]*[:\-]?\s*\n*\s*(\d+)/i], "1"); 
    let sexo = cacarDado([/(?:Sexo|Gênero|Perfil)[\s\w]*[:\-]?\s*\n*\s*(Masculino|Feminino|Ambos|Indiferente)/i, /Candidato\s+(Masculino|Feminino|Ambos)/i], "Ambos");
    let emailSolic = cacarDado([/E[\-\s]?mail[\s\w]*[:\-]?\s*\n*\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i], "Não informado");
    let beneficios = cacarDado([/(?:Benefícios e respectivos valores|Benefícios|Plano de Atividades|Oferece)[\s\w\(\)]*[:\-]?\s*\n*\s*([^\n\r]+?(?=Bolsa|Local|Horário|$))/i], "Não informado");

    let periodoRaw = cacarDado([/(?:Período|Semestre|Série|Níveis(?: de)? formação|Ano|Cursando)[\s\w]*[:\-]?\s*\n*\s*([0-9ºª\s\w\-à]+?(?=Horário|Bolsa|Curso|$))/i]);
    let periodoLimpo = "Não informado";
    if (periodoRaw && !/(meses|ano\(s\)|dias|6\s*meses|12\s*meses)/i.test(periodoRaw)) { periodoLimpo = periodoRaw; }

    let superNome = cacarDado([/(?:Nome Completo do Supervisor|Nome completo do Monitor|Nome:)[\s\-]*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s[A-ZÀ-Ÿ][a-zà-ÿ]+)+)/i]);
    let superCargo = cacarDado([/(?:Cargo do Supervisor|Cargo do Monitor|Cargo:)[\s\-]*([A-ZÀ-Ÿ][^\n\r,]+)/i]);
    let superCpf = cacarDado([/(?:CPF:|CPF\s*\(imprescindível\):)[\s\-]*([\d\.\-]+)/]);
    let superEmail = cacarDado([/(?:E-mail do Monitor|E-mail:|E-mail do Supervisor:)[\s\-]*([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i]);
    let nomeSolic = cacarDado([/(?:Pessoa responsável pela solicitação|Nome do Requisitante)[\s\:\-]*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s[A-ZÀ-Ÿ][a-zà-ÿ]+)+)/i]);
    let cnpjEmpresa = cacarDado([/(?:CNPJ:|CNPJ\s*\/\s*Convênio)[\s\:\-]*([\d\.\-\/]+)/]);

    if (empresa) { setValSeguro('ab_empresa', empresa); setValSeguro('acomp_nome', empresa); }
    if (cnpjEmpresa && !empresa) setValSeguro('ab_empresa', "CNPJ: " + cnpjEmpresa);
    if (cursoFinal) { setValSeguro('ab_curso', cursoFinal); setValSeguro('acomp_curso', cursoFinal); }
    if (bolsa) setValSeguro('ab_bolsa', `R$ ${bolsa}`);
    if (auxTransp) setValSeguro('ab_vt', /\d/.test(auxTransp) ? `R$ ${auxTransp}` : auxTransp);
    if (vagas) setValSeguro('ab_qtd_vagas', vagas);
    if (sexo) setValSeguro('ab_sexo', sexo);
    if (periodoLimpo !== "Não informado") setValSeguro('ab_periodo', periodoLimpo);
    if (emailSolic) setValSeguro('ab_email_solic', emailSolic);
    if (beneficios) setValSeguro('ab_beneficios', beneficios.replace(/-/g, '').trim());
    if (superNome) setValSeguro('ab_super_nome', superNome);
    if (superCargo) setValSeguro('ab_super_cargo', superCargo);
    if (superCpf) setValSeguro('ab_super_cpf', superCpf);
    if (superEmail) setValSeguro('ab_super_email', superEmail);
    if (nomeSolic) setValSeguro('ab_nome_solic', nomeSolic);

    if(horarioTexto !== "Não informado") parseHorarioParaCampos(horarioTexto); else setValSeguro('ab_carga', "Não informado");

    let vagaMatches = texto.match(/(?:vaga|n[úu]mero|c[óo]digo|id)[\s\:\-]*(\d{4,8})/i);
    if (vagaMatches) {
        let vNum = vagaMatches[1].trim();
        setValSeguro('ab_vaga', vNum); setValSeguro('acomp_vaga', vNum); setValSeguro('reg_vaga', vNum); setValSeguro('conv_vaga', vNum);
    }
}

function detectarTipoEPreencherVaga(assuntoTicket = "", textoCorpo = "") {
    if (!assuntoTicket && !textoCorpo) return "ABERTURA";
    let textoCompleto = (assuntoTicket + " " + textoCorpo).toLowerCase();
    let isAcomp = textoCompleto.includes("acomp");
    let matchNumeros = (assuntoTicket + " " + textoCorpo).match(/\d{4,8}/g); 
    let vagaEncontrada = matchNumeros ? matchNumeros[0] : "";
    let empresaEncontrada = ""; let cursoEncontrado = "";

    let assuntoSemCnpj = assuntoTicket.replace(/\s*[\-\|]\s*\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}.*/, '');
    let partesHifen = assuntoSemCnpj.split(/\s+-\s+|\|/);
    if (partesHifen.length >= 2) {
        let ultima = partesHifen[partesHifen.length - 1].trim();
        if (/^[\d\.\-\/\s]+$/.test(ultima) && partesHifen.length >= 3) { empresaEncontrada = partesHifen[partesHifen.length - 2].trim(); } 
        else { empresaEncontrada = ultima; }
        let parteEsquerda = partesHifen[0];
        if (vagaEncontrada) { let idx = parteEsquerda.indexOf(vagaEncontrada); if (idx !== -1) { cursoEncontrado = parteEsquerda.substring(idx + vagaEncontrada.length).trim(); } }
    }

    if (!empresaEncontrada && !isModoFila) { let mEmp = textoCorpo.match(/(?:Empresa|Cliente|Razão Social)[\s\:\-]*([^\n\r]+)/i); if (mEmp) empresaEncontrada = mEmp[1].trim(); }
    if (!cursoEncontrado && !isModoFila) { let mCur = textoCorpo.match(/(?:Cursos?\s*desejados?|Curso|Área)[\s\:\-]*([^\n\r]+)/i); if (mCur) cursoEncontrado = mCur[1].trim(); }

    empresaEncontrada = limparLixoAirtable(empresaEncontrada);

    if (vagaEncontrada && !isModoFila) { ['ab_vaga', 'acomp_vaga', 'conv_vaga', 'reg_vaga'].forEach(id => setValSeguro(id, vagaEncontrada)); }
    if (empresaEncontrada) { ['ab_empresa', 'acomp_nome', 'conv_empresa'].forEach(id => setValSeguro(id, empresaEncontrada)); }
    if (cursoEncontrado) { ['ab_curso', 'acomp_curso', 'conv_curso'].forEach(id => setValSeguro(id, cursoEncontrado)); }

    return isAcomp ? "ACOMP" : "ABERTURA";
}

const darkCss = `
body.dark-theme { --bg-color: #121212; --text-color: #e0e0e0; background-color: #121212; color: #e0e0e0; }
body.dark-theme .container, body.dark-theme .card-contato, body.dark-theme .dash-card, body.dark-theme .panel-padrao, body.dark-theme .robot-box { background: #1e1e1e; border-color: #333; color: #e0e0e0; }
body.dark-theme input, body.dark-theme select, body.dark-theme textarea { background: #2d2d2d; color: #e0e0e0; border-color: #444; }
body.dark-theme .door-card { background: #1e1e1e; }
body.dark-theme .door-card.fila { background: #1a251e; }
body.dark-theme .data-table th { background: #2d2d2d; color: #ccc; }
body.dark-theme h2, body.dark-theme h3 { color: #66b2ff; }
body.dark-theme .panel-complexo, body.dark-theme .panel-supervisor, body.dark-theme .panel-solicitante { background: #252525; border-color: #444; }
body.dark-theme .output-box { background-color: #2b2b2b; color: #ddd; }
`;
let style = document.createElement('style'); style.innerHTML = darkCss; document.head.appendChild(style);

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

    carregarVagasDoDia();
    carregarFila();
    renderizarCatalogo();
    renderizarLogs();
    verificarRascunho();
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
    if (e.altKey && e.key.toLowerCase() === 'w') { e.preventDefault(); let btnEncerrar = document.getElementById('btn_encerrar_global'); if (btnEncerrar) btnEncerrar.click(); }
    if (e.altKey && e.key.toLowerCase() === 'd') { e.preventDefault(); toggleDarkMode(); }
    if (e.altKey && e.key.toLowerCase() === 'm') { e.preventDefault(); abrirPainelSupervisao(); }
    if (e.altKey && e.key.toLowerCase() === 's') { 
        e.preventDefault(); 
        isModoDev = !isModoDev; 
        showToast(isModoDev ? "🛠️ Shadow Mode (Dev) ATIVADO" : "🛠️ Shadow Mode DESATIVADO", isModoDev ? "warning" : "info"); 
    }
});

function toggleDarkMode() {
    document.body.classList.toggle('dark-theme');
    let isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('ciee_dark_theme', isDark);
    showToast(isDark ? "🌙 Modo Escuro Ativado" : "☀️ Modo Claro Ativado", "info");
}

if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        
        if (message.acao === "getMesaHub") {
            sendResponse({
                bolsa: (document.getElementById('ab_bolsa')||{}).value || "", vt: (document.getElementById('ab_vt')||{}).value || "",
                sexo: (document.getElementById('ab_sexo')||{}).value || "Ambos", horario_entrada: (document.getElementById('ab_horario_entrada')||{}).value || "",
                horario_saida: (document.getElementById('ab_horario_saida')||{}).value || ""
            }); return true;
        }

        if (message.acao === "receberDadosZendesk") {
            const dados = message.payload;
            let vagaAndamento = isModoFila ? filaTrabalho.find(i => i.status === 'andamento') : null;

            if (dados.ticket) {
                if (!isModoFila && ticket_global !== "" && ticket_global !== dados.ticket) limparCamposMesa();
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
            
            showToast("Dados extraídos com sucesso!", "success"); saveDraft();
        }

        if (message.acao === "receberDadosZendeskIA") {
            const dados = message.payload;
            let vagaAndamento = isModoFila ? filaTrabalho.find(i => i.status === 'andamento') : null;
            
            if (!isModoFila && ticket_global !== "" && ticket_global !== dados.ticket) limparCamposMesa();
            ticket_global = dados.ticket || ""; document.getElementById('input_ticket_global').value = ticket_global; document.getElementById('display_ticket_global').innerText = ticket_global || "Sem Ticket";

            if (vagaAndamento) { vagaAndamento.ticket = dados.ticket; localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho)); renderizarFila(); atualizarBannerFila(vagaAndamento.vaga, ticket_global); }
            
            document.getElementById('screen_demanda').classList.remove('active'); document.getElementById('screen_tool').classList.add('active');

            // Fallback Regex
            detectarTipoEPreencherVaga(dados.assunto || "", dados.textoCorpo || "");
            let vagaFinal = vagaAndamento ? vagaAndamento.vaga : (dados.ab_vaga || "");
            if(vagaFinal) { setValSeguro('ab_vaga', vagaFinal); setValSeguro('acomp_vaga', vagaFinal); setValSeguro('conv_vaga', vagaFinal); setValSeguro('reg_vaga', vagaFinal); }
            if(dados.ab_empresa) setValSeguro('ab_empresa', dados.ab_empresa);
            if(dados.ab_curso) setValSeguro('ab_curso', dados.ab_curso);
            if(dados.ab_bolsa) setValSeguro('ab_bolsa', "R$ " + dados.ab_bolsa);
            if(dados.horario_cru) parseHorarioParaCampos(dados.horario_cru);

            let resultadosRegex = { empresa: (document.getElementById('ab_empresa')||{}).value || "", curso: (document.getElementById('ab_curso')||{}).value || "", bolsa: (document.getElementById('ab_bolsa')||{}).value || "" };

            // Dispara Gemini lendo o Assunto e o Corpo
            auditarComGemini(dados.assunto, dados.textoCorpo, dados.ticket, resultadosRegex);
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
            document.getElementById('screen_demanda').classList.remove('active');
            document.getElementById('screen_tool').classList.add('active');
            openTab('acomps');
        }

        if (message.acao === "solicitarVagasSincronia") {
            sendResponse({ vagas: JSON.parse(localStorage.getItem('hub_vagas_sinc_sharepoint') || '[]') });
        }
    });
}

let cachedModelName = "";

async function auditarComGemini(assuntoTicket, textoCorpo, numeroTicket, resultadosRegexAnteriores) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY";
    exibirPainelIA("⏳ Inicializando IA (Buscando Geração 3)...", "carregando");

    try {
        if (!cachedModelName) {
            const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`;
            const listResponse = await fetch(listUrl); const listData = await listResponse.json();
            if (listData.error) throw new Error("Erro API: " + listData.error.message);
            const availableModels = listData.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")).map(m => m.name);
            if (availableModels.includes("models/gemini-3.6-flash")) cachedModelName = "models/gemini-3.6-flash";
            else if (availableModels.includes("models/gemini-3.5-flash")) cachedModelName = "models/gemini-3.5-flash";
            else { const modelosSeguros = availableModels.filter(name => !name.includes("2.5")); cachedModelName = modelosSeguros.length > 0 ? modelosSeguros[modelosSeguros.length - 1] : availableModels[0]; }
        }

        const url = `https://generativelanguage.googleapis.com/v1/${cachedModelName}:generateContent?key=${GEMINI_API_KEY}`;
        const promptText = `Atue como Auditor Jurídico CIEE. Regras: Max 6h diárias de estágio. Valide se há: Empresa, Curso, Carga Horária, Nível Escolar e Benefícios. Se faltar algo, acione o alerta.
        Assunto do E-mail: "${assuntoTicket}"
        Corpo do E-mail: "${textoCorpo}"
        Retorne JSON puro sem markdown: {"tipo_demanda": "Abertura ou Acompanhamento", "sentimento": "Neutro, Urgente ou Risco", "auditoria": { "aprovado": true ou false, "alerta": "Problema ou OK" }, "dados": { "empresa": "Nome limpo", "curso": "Curso limpo", "bolsa": "Valor ou A combinar" }}`;

        const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }], generationConfig: { response_mime_type: "application/json" }}) });
        const data = await response.json();
        if(data.error) throw new Error(data.error.message);

        let jsonStr = data.candidates[0].content.parts[0].text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const resultadoIA = JSON.parse(jsonStr);

        if(resultadoIA.dados.empresa && !resultadoIA.dados.empresa.toLowerCase().includes("não informado") && resultadoIA.dados.empresa !== "Nenhum") setValSeguro('ab_empresa', limparLixoAirtable(resultadoIA.dados.empresa));
        if(resultadoIA.dados.curso && !resultadoIA.dados.curso.toLowerCase().includes("não informado") && resultadoIA.dados.curso !== "Nenhum") setValSeguro('ab_curso', resultadoIA.dados.curso);
        if(resultadoIA.dados.bolsa && !resultadoIA.dados.bolsa.toLowerCase().includes("não informado") && resultadoIA.dados.bolsa !== "Nenhum") {
            let b = resultadoIA.dados.bolsa; if(!b.toUpperCase().includes("R$") && /\d/.test(b)) b = "R$ " + b; setValSeguro('ab_bolsa', b);
        }

        if (resultadoIA.tipo_demanda && resultadoIA.tipo_demanda.toLowerCase().includes("acompanhamento")) { openTab('acomps'); } 
        else { openTab('abertura'); }

        exibirPainelIA(resultadoIA, "sucesso");

        let falhaNoRegex = false;
        if (resultadosRegexAnteriores.empresa === "" && resultadoIA.dados.empresa !== "Não informado") falhaNoRegex = true;
        if (resultadosRegexAnteriores.curso === "" && resultadoIA.dados.curso !== "Não informado") falhaNoRegex = true;
        if (resultadosRegexAnteriores.bolsa === "" && resultadoIA.dados.bolsa !== "Não informado") falhaNoRegex = true;

        if (falhaNoRegex) { enviarParaTreinamento(numeroTicket, textoCorpo, resultadosRegexAnteriores, resultadoIA.dados); }

    } catch (error) {
        console.error("Falha no Motor IA:", error);
        exibirPainelIA("❌ " + error.message, "erro");
    }
}

function exibirPainelIA(dados, status) {
    let container = document.getElementById('painel-ia-gemini');
    if (!container) {
        container = document.createElement('div'); container.id = 'painel-ia-gemini';
        container.style.cssText = 'margin-bottom: 15px; border-radius: 8px; font-family: sans-serif; transition: 0.3s;';
        let painelAbertura = document.getElementById('abertura');
        if (painelAbertura) painelAbertura.insertBefore(container, painelAbertura.firstChild);
    }

    if (status === "carregando") {
        container.style.background = "#eef5f9"; container.style.border = "1px solid #b6d4fe";
        container.innerHTML = `<div style="padding: 15px; color: #084298; font-weight: bold;">🧠 ${dados}</div>`;
    } else if (status === "erro") {
        container.style.background = "#f8d7da"; container.style.border = "1px solid #f5c2c7";
        container.innerHTML = `<div style="padding: 15px; color: #842029; font-weight: bold;">${dados}</div>`;
    } else {
        let corBorda = dados.auditoria.aprovado ? "#badbcc" : "#f5c2c7";
        let corFundo = dados.auditoria.aprovado ? "#d1e7dd" : "#f8d7da";
        let corTexto = dados.auditoria.aprovado ? "#0f5132" : "#842029";
        let iconeAuditoria = dados.auditoria.aprovado ? "✅" : "⚠️";
        let corSentimento = dados.sentimento.includes("Risco") ? "background: #dc3545; color: white;" : (dados.sentimento.includes("Urgente") ? "background: #ffc107; color: black;" : "background: #198754; color: white;");

        container.style.background = corFundo; container.style.border = `2px solid ${corBorda}`;
        container.innerHTML = `
            <div style="padding: 12px 15px; color: ${corTexto};">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${corBorda}; padding-bottom: 8px; margin-bottom: 8px;">
                    <strong style="font-size: 15px;">🤖 Auditoria Gemini (${dados.tipo_demanda})</strong>
                    <span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; ${corSentimento}">Termômetro: ${dados.sentimento}</span>
                </div>
                <div style="font-size: 13px;"><strong>${iconeAuditoria} Análise Legal:</strong> ${dados.auditoria.alerta}</div>
            </div>`;
        showToast("Análise IA Concluída!", "success");
    }
}

document.addEventListener('click', (e) => {
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
    } catch(err) { console.error("Erro:", action, err); isProcessing = false; }
});

document.addEventListener('change', (e) => {
    if(e.target.name === 'ab_mod') atualizarInterface();
    if(e.target.id === 'ab_horario_entrada' || e.target.id === 'ab_horario_saida') calcularCargaHoraria();
    if(e.target.id === 'reg_motivo') verificarCamposDinamicosRegistro();
    if(e.target.id === 'acomp_tipo') toggleZipModule();
    if(e.target.id === 'conv_tipo') toggleConvocacao();
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
});

document.addEventListener('focusout', (e) => {
    if(e.target.id === 'ab_bolsa' || e.target.id === 'ab_vt') formatarMoeda(e.target);
});

document.getElementById('user_signature').addEventListener('keypress', (e) => {
    if(e.key === 'Enter') fazerLogin();
});

function iniciarIndividual() {
    const tkInput = document.getElementById('input_ticket_global_ind');
    const tk = tkInput ? tkInput.value.trim() : "";
    ticket_global = tk;
    isModoFila = false;
    document.getElementById('display_ticket_global').innerText = tk || "Sem Ticket";
    document.getElementById('fila_banner_global').classList.remove('active');
    document.getElementById('tab_fila').style.display = 'none';
    document.getElementById('screen_demanda').classList.remove('active');
    document.getElementById('screen_tool').classList.add('active');
    openTab('abertura');
}

function iniciarFila() {
    isModoFila = true;
    ticket_global = "";
    document.getElementById('display_ticket_global').innerText = "Nenhum";
    document.getElementById('fila_banner_global').classList.add('active');
    document.getElementById('tab_fila').style.display = 'inline-block';
    atualizarBannerFila();
    document.getElementById('screen_demanda').classList.remove('active');
    document.getElementById('screen_tool').classList.add('active');
    openTab('fila');
}

function sairModoFila() {
    isModoFila = false;
    document.getElementById('screen_tool').classList.remove('active');
    document.getElementById('screen_demanda').classList.add('active');
    limparCamposMesa();
    showToast("Você saiu do Modo Fila.", "info");
}

function atualizarBannerFila(vaga = "", ticket = "") {
    let bannerText = document.getElementById('fila_banner_text');
    if(!bannerText) return;
    if (vaga) {
        let t = ticket ? `#${ticket}` : "(Aguardando Escanear Ticket...)";
        bannerText.innerText = `⚙️ MODO FILA: Vaga ${vaga} | Ticket ${t}`;
    } else {
        bannerText.innerText = `⚙️ MODO FILA ATIVADO - Nenhuma vaga em andamento.`;
    }
}

function carregarFila() {
    filaTrabalho = JSON.parse(localStorage.getItem('ciee_fila') || '[]');
    renderizarFila();
}

function gerarFila() {
    let input = document.getElementById('fila_input').value;
    let matches = input.match(/\d{4,8}/g);
    if(!matches) return showToast("Nenhum número válido encontrado no texto.", "warning");
    
    let adicionados = 0;
    matches.forEach(v => {
        if(!filaTrabalho.find(i => i.vaga === v)) {
            filaTrabalho.push({ vaga: v, status: 'pendente', ticket: '' });
            adicionados++;
        }
    });
    
    localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho));
    document.getElementById('fila_input').value = "";
    renderizarFila();
    showToast(`${adicionados} vagas adicionadas à fila!`, "success");
}

function limparFila() {
    if(confirm("Deseja realmente apagar toda a sua fila?")) {
        filaTrabalho = [];
        localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho));
        renderizarFila();
    }
}

function renderizarFila() {
    requestAnimationFrame(() => {
        let container = document.getElementById('fila_container');
        if(!container) return;
        
        filaTrabalho.sort((a, b) => {
            const map = { 'andamento': 1, 'pendente': 2, 'concluido': 3 };
            return map[a.status] - map[b.status];
        });

        let total = filaTrabalho.length;
        let concluidas = filaTrabalho.filter(i => i.status === 'concluido').length;
        let pendentes = filaTrabalho.filter(i => i.status === 'pendente').length;
        let pct = total === 0 ? 0 : Math.round((concluidas / total) * 100);

        let statsEl = document.getElementById('fila_stats');
        if(statsEl) {
            statsEl.innerHTML = `Progresso: ${concluidas} de ${total} (${pct}%) | Pendentes: ${pendentes} 
            <div style="width:100%; background:#ddd; height:10px; border-radius:5px; margin-top:8px; overflow:hidden;">
                <div style="width:${pct}%; background:var(--success-color); height:100%; transition:0.4s ease-out;"></div>
            </div>`;
        }
        
        if(filaTrabalho.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:#999; padding:20px; background:transparent; border-radius:8px; border:1px dashed var(--border-color);">A fila está vazia. Cole os números acima para começar.</div>`;
            return;
        }
        
        let html = "";
        filaTrabalho.forEach(item => {
            if(ocultarConcluidas && item.status === 'concluido') return;

            let corStatus = item.status === 'concluido' ? '#28a745' : (item.status === 'andamento' ? '#ffc107' : '#e9ecef');
            let textStatus = item.status === 'concluido' ? '🟢 Concluído' : (item.status === 'andamento' ? '🟡 Em Andamento' : '⚪ Pendente');
            let textStyle = (item.status === 'concluido' || item.status === 'andamento') ? 'color: #fff;' : 'color: #333;';
            if(item.status === 'andamento') textStyle = 'color: #333;';
            
            let opacity = item.status === 'concluido' ? 'opacity: 0.5;' : 'opacity: 1;';
            let strTicket = item.ticket ? `<span style="font-size: 11px; color: #888; margin-left: 10px;">(Tkt: #${item.ticket})</span>` : '';

            html += `
            <div style="background: ${item.status === 'andamento' ? '#fffdf5' : 'transparent'}; border: ${item.status === 'andamento' ? '2px solid #ffc107' : '1px solid var(--border-color)'}; padding: 12px 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: 0.3s; ${opacity}">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <strong style="font-size: 16px; color: var(--primary-color);">#${item.vaga}</strong> ${strTicket}
                    <button data-action="mudarStatusFila" data-vaga="${item.vaga}" style="background: ${corStatus}; ${textStyle} border: none; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; cursor: pointer; transition: 0.2s;">${textStatus}</button>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-mini" style="background: #dc3545;" data-action="removerVagaFila" data-vaga="${item.vaga}">X</button>
                    <button class="action-btn" style="padding: 6px 12px; font-size: 12px; width: auto;" data-action="atacarVaga" data-vaga="${item.vaga}">🚀 Atacar Vaga</button>
                </div>
            </div>
            `;
        });
        container.innerHTML = html;
    });
}

function atacarVaga(vaga) {
    setTimeout(() => {
        navigator.clipboard.writeText(vaga).then(() => { showToast(`Vaga ${vaga} copiada para a área de transferência!`, "info"); });
        filaTrabalho.forEach(i => { if(i.status === 'andamento') i.status = 'pendente'; });
        
        let item = filaTrabalho.find(i => i.vaga === vaga);
        if(item) {
            item.status = 'andamento';
            if (item.ticket) {
                ticket_global = item.ticket;
                document.getElementById('input_ticket_global').value = ticket_global;
                document.getElementById('display_ticket_global').innerText = ticket_global;
            } else {
                ticket_global = "";
                document.getElementById('input_ticket_global').value = "";
                document.getElementById('display_ticket_global').innerText = "Aguardando...";
            }
        }
        
        localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho));
        limparCamposMesa();
        
        ['ab_vaga', 'acomp_vaga', 'conv_vaga', 'reg_vaga'].forEach(id => {
            let el = document.getElementById(id);
            if(el) el.value = vaga;
        });
        atualizarBannerFila(vaga, ticket_global);
        renderizarFila();
        
        showToast(`Mesa pronta! Atacando Vaga ${vaga}.`, "success");
        openTab('acomps'); 
        
        window.open(`https://web.ciee.org.br/admin/vagas/convocados-v2/${vaga}?acompanhamento=true&tipoVagaSelecionada=NOVA`, 'kairos_aba_operaria');
    }, 10);
}

function mudarStatusFila(vaga) {
    let item = filaTrabalho.find(i => i.vaga === vaga);
    if(!item) return;
    
    if(item.status === 'pendente') item.status = 'andamento';
    else if(item.status === 'andamento') item.status = 'concluido';
    else item.status = 'pendente';
    
    localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho));
    renderizarFila();
}

function removerVagaFila(vaga) {
    filaTrabalho = filaTrabalho.filter(i => i.vaga !== vaga);
    localStorage.setItem('ciee_fila', JSON.stringify(filaTrabalho));
    renderizarFila();
}

function setValSeguro(id, valor) {
    const el = document.getElementById(id);
    if(el) {
        el.value = valor;
        if (!isLimpandoMesa) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}

function limparCamposMesa() {
    isLimpandoMesa = true;
    clearTimeout(draftTimeout); 
    const camposLimpar = ['ab_vaga_digital', 'ab_vaga', 'ab_empresa', 'ab_curso', 'ab_bolsa', 'ab_vt', 'ab_horario_entrada', 'ab_horario_saida', 'ab_carga', 'ab_periodo', 'ab_sexo', 'ab_qtd_vagas', 'ab_beneficios', 'ab_contato', 'ab_nome_solic', 'ab_email_solic', 'ab_ddd_solic', 'ab_tel_solic', 'ab_super_nome', 'ab_super_cargo', 'ab_super_cpf', 'ab_super_email', 'ab_super_ddd', 'ab_super_tel', 'ab_etapa', 'out_assunto', 'out_follow_abertura', 'out_resp_abertura', 'out_dg_texto1', 'out_dg_texto2', 'out_registro', 'out_resposta_cliente', 'reg_candidato_aprovado', 'texto_upload', 'conv_vaga', 'conv_regiao', 'conv_empresa', 'conv_mod', 'conv_data', 'conv_hora', 'conv_end', 'conv_contato', 'conv_saldo', 'conv_curso', 'out_conv_assunto', 'out_conv_texto', 'out_acomp', 'out_acomp_log', 'acomp_nome', 'acomp_curso', 'acomp_vaga', 'acomp_link', 'acomp_senha', 'reg_vaga'];
    
    camposLimpar.forEach(id => {
        let el = document.getElementById(id);
        if(el) el.value = "";
    });
    
    document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    let radioPadrao = document.querySelector('input[name="ab_mod"][value="OE"]');
    if(radioPadrao) radioPadrao.checked = true;
    atualizarInterface();
    
    let containerIA = document.getElementById('painel-ia-gemini');
    if (containerIA) containerIA.remove();

    localStorage.removeItem('hub_draft'); 
    isLimpandoMesa = false;
}

function carregarVagasDoDia() { vagas_tratadas_hoje = JSON.parse(localStorage.getItem('hub_vagas_sinc_sharepoint') || '[]'); }

function salvarVagaParaSincronia(vagaNum, statusTxt, retornoData, ticketNum) {
    vagas_tratadas_hoje = vagas_tratadas_hoje.filter(item => item.vaga !== vagaNum); 
    vagas_tratadas_hoje.push({ vaga: vagaNum, status: statusTxt, retorno: retornoData, ticket: ticketNum });
    localStorage.setItem('hub_vagas_sinc_sharepoint', JSON.stringify(vagas_tratadas_hoje));
}

function copiarLogAutomatico(texto, nomeDoLog) {
    if (!texto || texto === "") return;
    if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.set({ 'ciee_ultimo_log': texto });
    navigator.clipboard.writeText(texto).then(() => showToast(`✅ ${nomeDoLog} copiado!`, "success")).catch(() => {});
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if(!container) return; 
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, type === 'error' ? 4000 : 3000);
}

function saveDraft() {
    if(!operador || isLimpandoMesa) return; 
    clearTimeout(draftTimeout);
    draftTimeout = setTimeout(() => {
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
    atualizarInterface(); checkDG();
    showToast('Rascunho restaurado!', 'success');
}

function descartarRascunho() { localStorage.removeItem('hub_draft'); const banner = document.getElementById('draft-banner'); if(banner) banner.style.display = 'none'; }
function getSaudacao() { return new Date().getHours() < 12 ? 'bom dia' : 'boa tarde'; }

function renderizarCatalogo(filtro = "") {
    let f = filtro.toLowerCase();
    const resultados = catalogo.filter(c => c.nome.toLowerCase().includes(f) || c.regiao.toLowerCase().includes(f) || c.cargo.toLowerCase().includes(f));
    const lista = document.getElementById('lista_contatos');
    if(!lista) return;
    lista.innerHTML = resultados.map(c => `<div class="card-contato"><div class="contato-info"><h4>${c.nome} <span style="font-size: 11px; font-weight:normal; color:#888;">(${c.cargo})</span></h4><p>📍 ${c.regiao} | 📱 ${c.ramal}</p><p style="color:var(--primary-color);">📧 ${c.email}</p></div></div>`).join('');
}

function filtrarCatalogo() { const b = document.getElementById('busca_catalogo'); if(b) renderizarCatalogo(b.value); }

function fazerLogin() {
    const sigInput = document.getElementById('user_signature');
    if(!sigInput) return;
    const sig = sigInput.value.trim();
    if(!sig) return showToast("Insira sua assinatura Zendesk!", "error");
    operador = sig;
    localStorage.setItem('hub_operador', sig);
    setValSeguro('display_signature', operador);
    const ds = document.getElementById('display_signature'); if(ds) ds.innerText = operador;
    document.getElementById('screen_login').classList.remove('active');
    document.getElementById('screen_demanda').classList.add('active');
    atualizarInterface(); renderizarCatalogo(); renderizarLogs(); verificarRascunho();
}

function fazerLogout() {
    localStorage.removeItem('hub_operador');
    operador = ""; setValSeguro('user_signature', '');
    document.getElementById('screen_tool').classList.remove('active');
    document.getElementById('screen_demanda').classList.remove('active');
    document.getElementById('screen_login').classList.add('active');
    showToast("Você foi desconectado.", "info");
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
        document.getElementById('input_ticket_global').value = "";
        document.getElementById('display_ticket_global').innerText = "Nenhum";
        
        limparCamposMesa();
        
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

function openTabLibre(tab) {
    ticket_global = "Consulta"; 
    const dt = document.getElementById('display_ticket_global'); if(dt) dt.innerText = "Consulta";
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
        if(abReg && abReg.value) setValSeguro('conv_regiao', abReg.value.toUpperCase()); 
    }
}

function formatarMoeda(campo) {
    let valor = campo.value.trim();
    if(valor && !valor.toUpperCase().includes("R$") && /\d/.test(valor)) { campo.value = "R$ " + valor; saveDraft(); }
}

function copiarUnitario(id, btn) {
    let elem = document.getElementById(id);
    if(elem && elem.value) {
        navigator.clipboard.writeText(elem.value);
        let oldTxt = btn.innerText; btn.innerText = "✓";
        setTimeout(() => btn.innerText = oldTxt, 1000);
    }
}

function calcularCargaHoraria() {
    const entEl = document.getElementById('ab_horario_entrada');
    const saiEl = document.getElementById('ab_horario_saida');
    if(!entEl || !saiEl) return;
    const ent = entEl.value; const sai = saiEl.value;
    if(ent && sai) {
        let diff = (new Date("1970-01-01T" + sai + ":00") - new Date("1970-01-01T" + ent + ":00")) / 3600000; 
        if(diff < 0) diff += 24; 
        if(diff > 6) showToast(`Atenção: Carga calculada é de ${diff}h. Verifique o limite de 6h/dia.`, "warning");
        let hours = Math.floor(diff);
        let minutes = Math.round((diff - hours) * 60);
        setValSeguro('ab_carga', hours + "h" + (minutes > 0 ? String(minutes).padStart(2, '0') : "") + "/dia");
    }
}

function parseHorarioParaCampos(horarioStr) {
    if(!horarioStr) return;
    let m = horarioStr.match(/(\d{1,2})[:h]?(\d{2})?\s*(?:às|as|a|-|até)\s*(\d{1,2})[:h]?(\d{2})?/i);
    if(m) {
        setValSeguro('ab_horario_entrada', `${m[1].padStart(2, '0')}:${m[2] || '00'}`);
        setValSeguro('ab_horario_saida', `${m[3].padStart(2, '0')}:${m[4] || '00'}`);
        calcularCargaHoraria();
    } else {
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
        setValSeguro('ab_curso', ''); 
        let lista = (mod === 'OE') ? cursosEstagio : arcosAprendiz;
        lista.forEach(item => { let option = document.createElement('option'); option.value = item; datalist.appendChild(option); });
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
        setValSeguro('ab_nome_solic', "CIEE Rio");
        setValSeguro('ab_email_solic', "nao.notificar@cieerj.org.br");
        setValSeguro('ab_setor_solic', "RH (Operacional Capital)");
        setValSeguro('ab_ddd_solic', "21");
        setValSeguro('ab_tel_solic', "00000-0000");
        const w1 = document.getElementById('wrapper_resp_normal'); if(w1) w1.style.display = 'none';
        const w2 = document.getElementById('wrapper_dg_textos'); if(w2) w2.style.display = 'flex';
        const w3 = document.getElementById('div_etapa_normal'); if(w3) w3.style.visibility = 'hidden';
    } else {
        const da = document.getElementById('dg_alert'); if(da) da.classList.remove('active');
        setValSeguro('ab_setor_solic', "RH (Operacional Capital)");
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
    navigator.clipboard.writeText(textoFinal).then(() => showToast('Texto padrão copiado!', 'success'));
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
        registrarLog(acao);
        
        if (typeof chrome !== 'undefined' && chrome.tabs && acao.includes("Zendesk")) {
            chrome.tabs.query({url: "*://*.zendesk.com/*"}, function(tabs) {
                tabs.forEach(tab => {
                    if (!ticket_global || tab.url.includes(ticket_global)) { chrome.tabs.sendMessage(tab.id, {acao: "injetarZendesk", texto: text}); }
                });
            });
            showToast("Texto injetado no Zendesk de forma invisível!", "success");
        }
    } catch (err) { console.error(err); showToast("Erro ao copiar.", "error"); }
}

function registrarLog(acao) {
    let vaga = (document.getElementById('ab_vaga')||{}).value || (document.getElementById('reg_vaga')||{}).value || (document.getElementById('acomp_vaga')||{}).value || (document.getElementById('conv_vaga')||{}).value || "-";
    let empresa = (document.getElementById('ab_empresa')||{}).value || (document.getElementById('reg_contato')||{}).value || (document.getElementById('acomp_nome')||{}).value || (document.getElementById('conv_empresa')||{}).value || "-";
    let logs = JSON.parse(localStorage.getItem('ciee_logs') || '[]');
    logs.unshift({ hora: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}), ticket: ticket_global, acao: acao, vaga: vaga, empresa: empresa });
    localStorage.setItem('ciee_logs', JSON.stringify(logs)); renderizarLogs();
    enviarParaNuvem(acao, vaga, empresa);
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
        let iconExpanded = qtdOutros > 0 ? `<button data-action="toggleLog" data-ticket="${ticketStr}" style="border:none; background:#e9ecef; color:#004c99; font-size:11px; font-weight:bold; cursor:pointer; padding:4px 8px; border-radius:4px; margin-left:10px; transition:0.2s;" title="Ver atualizações desta vaga">➕ Histórico (${qtdOutros})</button>` : '';

        html += `
        <tr style="background-color: transparent; border-bottom: ${qtdOutros > 0 ? 'none' : '1px solid var(--border-color)'};">
            <td>${logInicial.hora}</td>
            <td><strong style="font-size: 1.1em;">#${logInicial.ticket}</strong> ${iconExpanded}</td>
            <td><span class="badge ${corInit}">${nomeAcaoInit}</span></td>
            <td>${logInicial.vaga || "-"} <br><span style="font-size:10px; color:#777;">${logInicial.empresa || "-"}</span></td>
            <td>-</td>
        </tr>`;

        if (qtdOutros > 0) {
            logsSubsequentes.forEach((lSub, index) => {
                let nomeAcaoSub = lSub.acao || lSub.categoria || lSub.detalhe || "Ação"; 
                let corSub = nomeAcaoSub.includes('Abertura') ? 'bg-abertura' : (nomeAcaoSub.includes('Convocação') ? 'bg-cr' : 'bg-acomp');
                let isLast = index === logsSubsequentes.length - 1; 

                html += `
                <tr class="log-child-group-${ticketStr}" style="display: none; background-color: rgba(0,0,0,0.03); border-bottom: ${isLast ? '1px solid var(--border-color)' : 'none'};">
                    <td style="padding-left: 20px; color: #777;">↳ ${lSub.hora}</td>
                    <td style="color: #aaa; font-style: italic; font-size: 11px;">Atualização</td>
                    <td><span class="badge ${corSub}" style="opacity:0.85;">${nomeAcaoSub}</span></td>
                    <td style="color: #777;">-</td>
                    <td style="color: #777;">-</td>
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
    btn.style.background = isHidden ? '#e9ecef' : '#ffeeba';
}

function baixarBackupCSV() {
    let logs = JSON.parse(localStorage.getItem('ciee_logs') || '[]'); if(logs.length===0) return showToast("Vazio.", "error");
    let csv = "Hora;Ticket;Ação;Vaga;Empresa\n" + logs.map(l => `${l.hora};${l.ticket};${l.acao || l.categoria || ""};${l.vaga || ""};${l.empresa || ""}`).join("\n");
    saveAs(new Blob(["\ufeff", csv], {type: "text/csv;charset=utf-8"}), `Export_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`);
    localStorage.removeItem('ciee_logs'); renderizarLogs();
}

function exportarBackupJSON() {
    let data = localStorage.getItem('ciee_logs'); if(!data || data==='[]') return showToast("Vazio.", "error");
    saveAs(new Blob([data], {type: "application/json;charset=utf-8"}), `Backup_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.json`);
}

function importarBackup(e) {
    const reader = new FileReader(); reader.onload = (e) => { try { localStorage.setItem('ciee_logs', e.target.result); renderizarLogs(); showToast("Restaurado!", "success"); } catch(err){showToast("Erro ao importar", "error");} }; 
    if(e.target.files[0]) reader.readAsText(e.target.files[0]);
}

function limparLogs() { if(confirm("Apagar histórico?")) { localStorage.removeItem('ciee_logs'); renderizarLogs(); showToast("Histórico limpo.", "info");} }

function gerarAberturaCompleta() {
    const reg = (document.getElementById('ab_regiao')||{}).value || "";
    const regUpper = reg.toUpperCase();
    const isDG = (regUpper === 'DG' || regUpper === 'DIGITAL');
    const elMod = document.querySelector('input[name="ab_mod"]:checked');
    const mod = elMod ? elMod.value : "";
    const vg = (document.getElementById('ab_vaga')||{}).value || "[Nº Vaga]";
    const cur = (document.getElementById('ab_curso')||{}).value || "[Curso]";
    const emp = (document.getElementById('ab_empresa')||{}).value || "[Empresa]";
    const etapa = (document.getElementById('ab_etapa')||{}).value || "[Upload de currículo]";
    const saudacao = getSaudacao();
    
    let labelBolsa = mod === 'OA' ? "Salário" : "Bolsa-auxílio";
    setValSeguro('out_assunto', `${regUpper} ACOMP ${mod} ${vg} ${cur} - ${emp}`);
    
    if (isDG) {
        setValSeguro('out_follow_abertura', `Ação: Vaga aberta conforme solicitação do Time Digital através do Ticket #${ticket_global} | ${operador}`);
    } else {
        const periodo = (document.getElementById('ab_periodo')||{}).value || "-"; 
        const sexo = (document.getElementById('ab_sexo')||{}).value || "-";
        const qtd_vagas = (document.getElementById('ab_qtd_vagas')||{}).value || "1"; 
        let bolsa = (document.getElementById('ab_bolsa')||{}).value || "-";
        if (bolsa !== "-" && !bolsa.toUpperCase().includes("R$") && /\d/.test(bolsa)) bolsa = "R$ " + bolsa;
        let vt = (document.getElementById('ab_vt')||{}).value || "Não informado";
        if (vt !== "Não informado" && !vt.toUpperCase().includes("R$") && /\d/.test(vt)) vt = "R$ " + vt;
        const ent = (document.getElementById('ab_horario_entrada')||{}).value; 
        const sai = (document.getElementById('ab_horario_saida')||{}).value;
        const carga = (document.getElementById('ab_carga')||{}).value || "Não informado";
        let horarioTextoFinal = "Não informado";
        if(ent && sai) { horarioTextoFinal = `das ${ent} às ${sai} (${carga})`; } else if (carga !== "Não informado") { horarioTextoFinal = carga; }
        const beneficios = (document.getElementById('ab_beneficios')||{}).value || "Não informado"; 
        const contato = (document.getElementById('ab_contato')||{}).value || "Não informado";
        let strSolicitante = ((document.getElementById('ab_email_solic')||{}).value || (document.getElementById('ab_tel_solic')||{}).value) ? ` | Contato Solicitante: Preenchido` : "";
        let strSupervisor = (document.getElementById('ab_super_nome')||{}).value ? ` | Supervisor: ${(document.getElementById('ab_super_nome')||{}).value}` : "";

        setValSeguro('out_follow_abertura', `Ação: Vaga aberta conforme solicitação da empresa no ticket ${ticket_global} | Perfil: ${cur}, ${periodo}, Sexo ${sexo} | Horário: ${horarioTextoFinal} | ${labelBolsa}: ${bolsa} | Auxílio Transporte: ${vt} | Benefícios: ${beneficios} | Quantidade: ${qtd_vagas} vaga(s) | Formato: ${contato}${strSolicitante}${strSupervisor} | Ticket: #${ticket_global} | ${operador}`);
    }

    let zendeskResp = "";
    if (isDG) {
        setValSeguro('out_dg_texto1', `Prezados, ${saudacao}!\nEspero que estejam bem.\n\nVaga aberta no Kairós, conforme solicitado.\n\nAtenciosamente,`);
        zendeskResp = `Prezada empresa parceira, ${saudacao}!\n\nInformo que a vaga foi divulgada no portal do CIEE e está disponível para os estudantes acessarem.\nRealizaremos a triagem e assim que possível encaminharemos a listagem dos currículos dos interessados na oportunidade.\n\nQualquer dúvida, estamos à disposição.\n\nAtenciosamente,`;
        setValSeguro('out_dg_texto2', zendeskResp);
    } else {
        zendeskResp = `Olá, Empresa Parceira!\n\nSeu novo atendimento segue por número: Ticket #${ticket_global}\n\nProcesso de divulgação e captação de candidatos iniciado para a vaga nº ${vg}, seguindo as etapas alinhadas em nosso contato (${etapa}).\n\nEm caso de dúvidas ou atualizações relacionadas ao processo seletivo, tais como: alteração de perfil, criação de etapas ou informar o nome do aprovado, gentileza utilizar este canal que terá o atendimento prioritário por nossa equipe de acompanhamento.\n\nAtenciosamente,`;
        setValSeguro('out_resp_abertura', zendeskResp);
    }
    
    injetarSilencioso(zendeskResp);
    forcarExibicaoCaixas();
    
    copiarLogAutomatico((document.getElementById('out_follow_abertura')||{}).value, "Log Kairós (Abertura)");
    let dtRetorno = new Date(); dtRetorno.setDate(dtRetorno.getDate() + 7);
    salvarVagaParaSincronia(vg, "A CONVOCAR TRIADOS/ENVIO DE CV", dtRetorno.toISOString().split('T')[0], ticket_global);
}

function verificarCamposDinamicosRegistro() {
    const m = (document.getElementById('reg_motivo')||{}).value;
    document.querySelectorAll('.panel-complexo .dynamic-field').forEach(e => e.classList.remove('active'));
    if (m === 'alteracao_perfil') { const el=document.getElementById('div_alt_perfil'); if(el) el.classList.add('active'); }
    if (m === 'alteracao_bolsa') { const el=document.getElementById('div_alt_bolsa'); if(el) el.classList.add('active'); }
    if (m === 'aprova_aprendiz' || m === 'aprova_estagio') { const el=document.getElementById('div_aprovacao'); if(el) el.classList.add('active'); }
    if (m === 'cancelamento') { const el=document.getElementById('div_cancelamento'); if(el) el.classList.add('active'); }
    if (m === 'perfil_restrito') { const el=document.getElementById('div_perfil_restrito'); if(el) el.classList.add('active'); }
}

function gerarRegistroEResposta() {
    const canal = (document.getElementById('reg_canal')||{}).value || "";
    const inputContato = ((document.getElementById('reg_contato')||{}).value || "").trim();
    const vaga = (document.getElementById('reg_vaga')||{}).value || "[Vaga]";
    const motivo = (document.getElementById('reg_motivo')||{}).value || "";
    const saudacao = getSaudacao();
    let nomeZendesk = inputContato ? `Olá ${inputContato}` : "Prezada Empresa Parceira";
    let nomeKairos = inputContato || "representante da empresa";
    let logInterno = ""; let respCliente = ""; let statusSharepoint = "RETORNAR EM";

    if (motivo === 'cobranca') {
        logInterno = `Ação: Contato com ${nomeKairos} via ${canal}. | Motivo: Cobrança de retorno sobre currículos enviados / status do processo. | Status: Aguardando retorno. | Ticket: #${ticket_global} | ${operador}`;
        respCliente = `${nomeZendesk}, ${saudacao}!\n\nPoderia, por gentileza, informar se a empresa realizou a análise dos currículos? Houve agendamento de entrevistas? Há algum candidato aprovado?\n\nFicaremos no aguardo de um posicionamento acerca das etapas realizadas.\n\nAtenciosamente,`;
        statusSharepoint = "SEM RETORNO DA EMPRESA/VISITA DO ASSISTENTE";
    } else if (motivo === 'duvidas') {
        logInterno = `Ação: Contato com ${nomeKairos} via ${canal}. | Motivo: Alinhamento de perfil e dúvidas sanadas. | Status: Processo segue normalmente. | Ticket: #${ticket_global} | ${operador}`;
        respCliente = `${nomeZendesk}, ${saudacao}!\n\nPassando para formalizar nosso alinhamento referente à vaga ${vaga}. Conforme conversamos, todas as dúvidas foram sanadas e o processo de captação segue normalmente.\n\nQualquer nova dúvida, basta responder a este e-mail.\n\nAtenciosamente,`;
        statusSharepoint = "RETORNAR EM";
    } else if (motivo === 'perfil_restrito') {
        let sugestoes = [];
        if(document.getElementById('sug_bolsa')?.checked) sugestoes.push("aumento no valor da bolsa-auxílio");
        if(document.getElementById('sug_semestre')?.checked) sugestoes.push("flexibilização dos semestres/períodos aceitos");
        if(document.getElementById('sug_idade')?.checked) sugestoes.push("ampliação da faixa etária");
        if(document.getElementById('sug_curso')?.checked) sugestoes.push("inclusão de cursos correlatos ou tecnólogos");
        if(document.getElementById('sug_horario')?.checked) sugestoes.push("flexibilização do horário do estágio");
        let textoSugestoes = sugestoes.length > 0 ? "Como sugestão de mercado para atrairmos mais estudantes, recomendamos avaliar a possibilidade de: " + sugestoes.join(", ") + "." : "Gostaríamos de agendar um rápido alinhamento para sugerir algumas flexibilizações no perfil.";

        logInterno = `Ação: Contato com ${nomeKairos} via ${canal}. | Motivo: Vaga com baixa aderência/Perfil restrito. | Sugestões: ${sugestoes.length > 0 ? sugestoes.join(", ") : "Alinhamento"}. | Status: Aguardando retorno. | Ticket: #${ticket_global} | ${operador}`;
        respCliente = `${nomeZendesk}, ${saudacao}!\n\nEntro em contato a respeito da vaga ${vaga}, pois durante nossa captação notamos um baixo volume de candidatos que atendem a todos os requisitos atuais.\n\n${textoSugestoes}\n\nPodemos seguir com alguma dessas alterações para impulsionar o processo?\n\nFico no aguardo e à disposição.\n\nAtenciosamente,`;
        statusSharepoint = "EM NEGOCIAÇÃO (PERFIL)";
    } else if (motivo === 'solicitacao_novos_cand') {
        logInterno = `Acomp: Solicitação de novos candidatos. | Ação: Nova etapa de captação criada no Kairós. | Status: Aguardando triagem. | Ticket: #${ticket_global} | ${operador}`;
        respCliente = `${nomeZendesk}, ${saudacao}!\n\nConforme solicitado, informo que já reativamos a captação e criamos uma nova etapa em nosso sistema para a vaga ${vaga}.\nNossa equipe está trabalhando na triagem de novos perfis e, assim que tivermos candidatos aderentes, encaminharemos a listagem de currículos para sua análise.\n\nSeguimos à disposição e trabalhando para fechar esta oportunidade o mais breve possível.\n\nAtenciosamente,`;
        statusSharepoint = "EMPRESA PEDIU MAIS CURRÍCULOS/CANDIDATOS";
    } else if (motivo === 'alteracao_perfil') {
        const de = (document.getElementById('reg_perfil_de')||{}).value || "___"; const para = (document.getElementById('reg_perfil_para')||{}).value || "___";
        logInterno = `Ação: Contato com ${nomeKairos} via ${canal}. | Motivo: Alteração de perfil. | Alteração: De '${de}' para '${para}'. | Status: Perfil atualizado. | Ticket: #${ticket_global} | ${operador}`;
        respCliente = `${nomeZendesk}, ${saudacao}!\n\nInformo que o perfil da vaga ${vaga} foi atualizado com sucesso em nosso sistema conforme solicitado (De: ${de} / Para: ${para}).\n\nNossa equipe já está trabalhando na captação de candidatos dentro desse novo formato.\n\nAtenciosamente,`;
        statusSharepoint = "EM NEGOCIAÇÃO (PERFIL)";
    } else if (motivo === 'alteracao_bolsa') {
        const de = (document.getElementById('reg_bolsa_de')||{}).value || "___"; const para = (document.getElementById('reg_bolsa_para')||{}).value || "___";
        logInterno = `Ação: Contato com ${nomeKairos} via ${canal}. | Motivo: Alteração de bolsa/benefício. | Alteração: De '${de}' para '${para}'. | Status: Valores atualizados. | Ticket: #${ticket_global} | ${operador}`;
        respCliente = `${nomeZendesk}, ${saudacao}!\n\nInformo que os valores da vaga ${vaga} foram atualizados com sucesso em nosso sistema (De: ${de} / Para: ${para}).\n\nAtenciosamente,`;
        statusSharepoint = "EM NEGOCIAÇÃO (PERFIL)";
    } else if (motivo === 'cancelamento') {
        const sub = (document.getElementById('reg_motivo_canc')||{}).value || "";
        logInterno = `Ação: Encerramento de vaga nº ${vaga}. | Motivo: ${sub}. | Ticket: #${ticket_global} | ${operador}`;
        respCliente = `${nomeZendesk}, ${saudacao}!\n\nConforme verificado/solicitado, procedemos com o encerramento do processo seletivo da vaga nº ${vaga} em nosso sistema.\n\nAgradecemos a parceria.\n\nAtenciosamente,`;
        statusSharepoint = "VAGA CANCELADA EMPRESA";
    } else if (motivo === 'aprova_aprendiz') {
        const cand = (document.getElementById('reg_candidato_aprovado')||{}).value || "[Nome do Candidato]";
        logInterno = `Ação: Recebimento de aprovação do candidato ${cand} referente à vaga ${vaga}. | Motivo: Envio de checklist para trâmites contratuais (Aprendiz). | Status: Aguardando dados da empresa. | Ticket: #${ticket_global} | ${operador}`;
        respCliente = `${nomeZendesk}, ${saudacao}!\n\nRecebemos a confirmação de aprovação do(a) candidato(a) ${cand} e ficamos muito felizes com a notícia! O setor responsável já dará início aos trâmites contratuais.\n\nPara agilizarmos a formalização, caso a empresa esteja de posse da documentação do jovem e deseje nos enviar por e-mail, os documentos necessários são:\n- RG e CPF\n- Comprovante de residência\n- Declaração escolar atualizada\n- Carteira de Trabalho (caso haja, páginas de identificação e contratos)\n- Se menor de idade: RG e CPF do responsável legal.\n\nPor gentileza, sinalize respondendo a este e-mail se a documentação será enviada por aqui.\n\nAproveito a oportunidade para solicitar a confirmação dos dados contratuais abaixo para a emissão do documento:\n\n*DADOS DO APRENDIZ:*\nData de Início: \nNome Aprovado(a): ${cand}\nCPF do Jovem: \nRazão Social: \nCNPJ: \nEndereço de Atuação: \nÁrea de Atuação: \nSalário: \nHorário: \n\n*DADOS DO SUPERVISOR:*\nNome: \nCargo: \nTelefone: \n\n*ASSINATURA E FÉRIAS:*\nO contrato será assinado de forma Eletrônica ou via PDF? \nSe Eletrônica, forneça Nome e E-mail do assinante: \nPeríodo em que as férias serão concedidas: \n\nFico no aguardo e sigo à disposição.\n\nAtenciosamente,`;
        statusSharepoint = "RETORNAR EM";
    } else if (motivo === 'aprova_estagio') {
        const cand = (document.getElementById('reg_candidato_aprovado')||{}).value || "[Nome do Candidato]";
        logInterno = `Ação: Recebimento de aprovação do candidato ${cand} referente à vaga ${vaga}. | Motivo: Envio de checklist para TCE (Estágio). | Status: Aguardando dados da empresa. | Ticket: #${ticket_global} | ${operador}`;
        respCliente = `${nomeZendesk}, ${saudacao}!\n\nRecebemos a confirmação de aprovação do(a) candidato(a) ${cand} e ficamos muito felizes com a notícia! Nosso setor responsável já dará início aos trâmites contratuais.\n\nPara que possamos emitir o Termo de Compromisso de Estágio (TCE) com agilidade e precisão, solicitamos, por gentileza, o preenchimento e confirmação dos dados abaixo:\n\n*DADOS DO ESTÁGIO:*\nData de Início: \nNome Aprovado(a): ${cand}\nCPF do Estudante: \nRazão Social: \nCNPJ: \nEndereço do Estágio: \nHorário do Estágio: \nValor da Bolsa-Auxílio: \nValor do Auxílio-Transporte: \n\n*DADOS DO SUPERVISOR:*\nNome do Supervisor: \nCargo: \nTelefone: \nCPF: \nE-mail do Supervisor: \n\nFico no aguardo e sigo à disposição.\n\nAtenciosamente,`;
        statusSharepoint = "RETORNAR EM";
    }

    setValSeguro('out_registro', logInterno); setValSeguro('out_resposta_cliente', respCliente);
    injetarSilencioso(respCliente);
    forcarExibicaoCaixas();
    
    let dtRetorno = new Date(); dtRetorno.setDate(dtRetorno.getDate() + 7);
    salvarVagaParaSincronia(vaga, statusSharepoint, dtRetorno.toISOString().split('T')[0], ticket_global);
    copiarLogAutomatico(logInterno, "Log Kairós (Registro)");
}