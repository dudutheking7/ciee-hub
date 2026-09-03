// ==========================================
// /js/hub/generator.js
// ==========================================

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

    let textoZendesk = "";
    if (isDG) {
        setValSeguro('out_dg_texto1', `Prezados, ${saudacao}!\nEspero que estejam bem.\n\nVaga aberta no Kairós, conforme solicitado.\n\nAtenciosamente,`);
        textoZendesk = `Prezada empresa parceira, ${saudacao}!\n\nInformo que a vaga foi divulgada no portal do CIEE e está disponível para os estudantes acessarem.\nRealizaremos a triagem e assim que possível encaminharemos a listagem dos currículos dos interessados na oportunidade.\n\nQualquer dúvida, estamos à disposição.\n\nAtenciosamente,`;
        setValSeguro('out_dg_texto2', textoZendesk);
    } else {
        textoZendesk = `Olá, Empresa Parceira!\n\nSeu novo atendimento segue por número: Ticket #${ticket_global}\n\nProcesso de divulgação e captação de candidatos iniciado para a vaga nº ${vg}, seguindo as etapas alinhadas em nosso contato (${etapa}).\n\nEm caso de dúvidas ou atualizações relacionadas ao processo seletivo, tais como: alteração de perfil, criação de etapas ou informar o nome do aprovado, gentileza utilizar este canal que terá o atendimento prioritário por nossa equipe de acompanhamento.\n\nAtenciosamente,`;
        setValSeguro('out_resp_abertura', textoZendesk);
    }
    
    forcarExibicaoCaixas();
    injetarSilencioso(textoZendesk);
    
    if (typeof copiarLogAutomatico === 'function') copiarLogAutomatico((document.getElementById('out_follow_abertura')||{}).value, "Log Kairós (Abertura)");
    let dtRetorno = new Date(); dtRetorno.setDate(dtRetorno.getDate() + 7);
    if (typeof salvarVagaParaSincronia === 'function') salvarVagaParaSincronia(vg, "A CONVOCAR TRIADOS/ENVIO DE CV", dtRetorno.toISOString().split('T')[0], ticket_global);
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
    
    forcarExibicaoCaixas();
    injetarSilencioso(respCliente);
    
    let dtRetorno = new Date(); dtRetorno.setDate(dtRetorno.getDate() + 7);
    if (typeof salvarVagaParaSincronia === 'function') salvarVagaParaSincronia(vaga, statusSharepoint, dtRetorno.toISOString().split('T')[0], ticket_global);
    if (typeof copiarLogAutomatico === 'function') copiarLogAutomatico(logInterno, "Log Kairós (Registro)");
}

function toggleZipModule() {
    const tEl = document.getElementById('acomp_tipo'); if(!tEl) return;
    const t = tEl.value;
    const zm = document.getElementById('zip_module'); if(zm) zm.style.display = t === 'envio_curriculos_zip' ? 'block' : 'none';
    const bg = document.getElementById('btn_gerar_acomp'); if(bg) bg.style.display = t === 'envio_curriculos_zip' ? 'none' : 'block';
}

function gerarAcomp(qtd = "[X]") {
    const tipo = (document.getElementById('acomp_tipo')||{}).value || "";
    const emp = (document.getElementById('acomp_nome')||{}).value || "[Empresa]";
    const vag = (document.getElementById('acomp_vaga')||{}).value || "[Vaga]";
    const cur = (document.getElementById('acomp_curso')||{}).value || "[Curso]";
    const abReg = (document.getElementById('ab_regiao')||{}).value || "";
    const isDG = abReg.toUpperCase() === 'DG';
    const saudacao = getSaudacao();
    
    let nomeZ = (emp !== "[Empresa]" && !isDG) ? `Olá ${emp}` : "Prezada Empresa Parceira";
    let texto = ""; let logInterno = ""; let statusSharepoint = "RETORNAR EM";
    let dtRetorno = new Date(); dtRetorno.setDate(dtRetorno.getDate() + 7);

    if (tipo === 'envio_curriculos_link') {
        const link = (document.getElementById('acomp_link')||{}).value || "https://...";
        const senha = (document.getElementById('acomp_senha')||{}).value || "000000";
        texto = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <p>Olá, empresa!</p>
    <p>Informamos que já temos candidatos interessados na vaga nº <strong>${vag}</strong> e os currículos estão disponíveis para sua análise.</p>
    <p>🔗 Acesse os perfis por meio do link:</p>
    
    <div style="background-color: #f4f6f8; border-left: 4px solid #004c99; padding: 15px; margin: 15px 0; border-radius: 4px;">
        <p style="margin: 0 0 5px 0;"><strong>🔗 Link:</strong> <a href="${link}" style="color: #004c99; text-decoration: none;">${link}</a></p>
        <p style="margin: 0;"><strong>🔑 Senha:</strong> <span style="font-family: monospace; background: #e1e5eb; padding: 2px 6px; border-radius: 4px;">${senha}</span></p>
    </div>

    <p>Para tornar o processo mais ágil e assertivo, os candidatos foram organizados considerando a aderência ao perfil da oportunidade, facilitando a identificação dos perfis mais compatíveis com a vaga.</p>
    
    <ul style="list-style: none; padding-left: 0;">
        <li style="margin-bottom: 5px;">✅ Maior assertividade na seleção;</li>
        <li style="margin-bottom: 5px;">✅ Redução do tempo de triagem;</li>
        <li style="margin-bottom: 5px;">✅ Perfis alinhados aos requisitos da oportunidade;</li>
        <li style="margin-bottom: 5px;">✅ Processo mais eficiente e organizado.</li>
    </ul>

    <p>Ficaremos no aguardo do seu retorno com os candidatos selecionados para as próximas etapas ou com eventuais considerações sobre os perfis apresentados.</p>
    <p>Caso necessite de apoio durante a análise ou tenha qualquer dúvida, nossa equipe permanece à disposição para auxiliá-los.</p>
</div>
`;
        logInterno = `Ação: Envio de link de currículos para a vaga ${vag}. | Motivo: Acompanhamento / Envio de Link. | Status: Aguardando análise da empresa. | Ticket: #${ticket_global} | ${operador}`;
    }
    else if(tipo === 'padrao_inicial') {
        texto = `${nomeZ}, ${saudacao}!\n\nEstou entrando em contato a respeito de sua vaga (${vag} - ${cur}), que atualmente conta com ${qtd} candidatos encaminhados aguardando a realização do processo seletivo. Os currículos estão disponíveis em nosso portal para análise.\n\nSolicito, por gentileza, que me informe por meio deste e-mail caso haja alguma aprovação.\n\nQualquer dúvida estou à disposição!\n\nAtenciosamente,`;
        logInterno = `Ação: Contato com a empresa. | Motivo: Cobrança inicial padrão. | Status: Aguardando análise. | Ticket: #${ticket_global} | ${operador}`;
        statusSharepoint = "SEM RETORNO DA EMPRESA/VISITA DO ASSISTENTE";
    } else if(tipo === 'envio_curriculos_zip' || tipo === 'envio_curriculos_avulso') {
        texto = `Prezada Empresa Parceira, ${saudacao}!\nEspero que estejam bem.\n\nEncaminho em anexo os currículos dos candidatos interessados e encaminhados nesta oportunidade (Vaga ${vag} - ${cur}). Fico no aguardo da análise, aprovação ou sinalização de agendamento de entrevistas.\n\nAtenciosamente,`;
        logInterno = `Ação: Envio de ${qtd} currículo(s) para a vaga ${vag}. | Motivo: Acompanhamento. | Status: Aguardando análise da empresa. | Ticket: #${ticket_global} | ${operador}`;
    } else if(tipo === 'dg_abertura') { 
        texto = `Prezados, ${saudacao}!\nEspero que estejam bem.\n\nVaga aberta no Kairós, conforme solicitado.\n\nAtenciosamente,`;
        logInterno = `Ação: Contato de Abertura Digital. | Status: Vaga aberta. | Ticket: #${ticket_global} | ${operador}`;
        statusSharepoint = "A CONVOCAR TRIADOS/ENVIO DE CV";
    } else if(tipo === 'dg_acomp') { 
        texto = `Prezada empresa parceira, ${saudacao}!\n\nInformo que a vaga foi divulgada no portal do CIEE e está disponível para os estudantes acessarem.\nRealizaremos a triagem e assim que possível encaminharemos a listagem dos currículos dos interessados na oportunidade.\n\nQualquer dúvida, estamos à disposição.\n\nAtenciosamente,`;
        logInterno = `Ação: Contato de Acompanhamento Digital. | Status: Divulgado / Aguardando triagem. | Ticket: #${ticket_global} | ${operador}`;
        statusSharepoint = "ACOMPANHAMENTO";
    } else if(tipo === 'dg_cobranca') { 
        texto = `Prezada Empresa Parceira, ${saudacao}!\n\nPoderia, por gentileza, informar se a empresa realizou a análise dos currículos? Houve agendamento de entrevistas? Há algum candidato aprovado?\n\nFicaremos no aguardo de um posicionamento acerca das etapas realizadas.\n\nAtenciosamente,`;
        logInterno = `Ação: Contato com a empresa. | Motivo: Cobrança de retorno sobre currículos (Digital). | Status: Aguardando análise. | Ticket: #${ticket_global} | ${operador}`;
        statusSharepoint = "SEM RETORNO DA EMPRESA/VISITA DO ASSISTENTE";
    }
    
    setValSeguro('out_acomp', texto.trim()); setValSeguro('out_acomp_log', logInterno);
    forcarExibicaoCaixas();
    injetarSilencioso(texto.trim());
    
    if (typeof salvarVagaParaSincronia === 'function') salvarVagaParaSincronia(vag, statusSharepoint, dtRetorno.toISOString().split('T')[0], ticket_global);
    if (typeof copiarLogAutomatico === 'function') copiarLogAutomatico(logInterno, "Log Kairós (Acompanhamento)");
}

async function processarZip() {
    const pu = document.getElementById('pdf_upload'); if(!pu) return;
    const files = pu.files; if(!files || files.length === 0) return showToast("Anexe os arquivos PDF primeiro!", "error");
    showToast("Gerando arquivo ZIP...", "info");
    const zip = new JSZip(); for(let i=0; i<files.length; i++) { zip.file(files[i].name, files[i]); }
    const content = await zip.generateAsync({type:"blob"});
    const nv = (document.getElementById('acomp_vaga')||{}).value || "Curriculos";
    saveAs(content, `Curriculos_Vaga_${nv}.zip`);
    gerarAcomp(files.length); showToast("ZIP gerado com sucesso!", "success");
}

function toggleConvocacao() {
    const t = (document.getElementById('conv_tipo')||{}).value;
    const c1 = document.getElementById('div_conv_agendado'); const c2 = document.getElementById('div_conv_prioridade');
    if(t === 'agendado') { if(c1) c1.style.display = 'block'; if(c2) c2.style.display = 'none'; } 
    else { if(c1) c1.style.display = 'none'; if(c2) c2.style.display = 'block'; }
}

function gerarConvocacao() {
    const tipo = (document.getElementById('conv_tipo')||{}).value || "";
    const vg = (document.getElementById('conv_vaga')||{}).value || "[Vaga]";
    const regEl = (document.getElementById('conv_regiao')||{}).value || "REGIÃO";
    const reg = regEl.toUpperCase();
    const isDG = (reg === 'DG' || reg === 'DIGITAL');
    const saudacao = getSaudacao();
    
    if(tipo === 'prioridade') {
        const cur = (document.getElementById('conv_curso')||{}).value || "";
        if (isDG) {
            setValSeguro('out_conv_assunto', `PRIORIDADE - DIGITAL - Vaga: ${vg}`);
            setValSeguro('out_conv_texto', `Prezados, ${saudacao}.\n\nSolicito, por gentileza, o apoio na realização da convocação referente à vaga ${vg}.\n\nFico no aguardo e permaneço à disposição para quaisquer esclarecimentos.\n\nAtenciosamente,`);
        } else {
            setValSeguro('out_conv_assunto', `Prioridade - ${reg} - Vaga: ${vg}`);
            setValSeguro('out_conv_texto', `Prezados, ${saudacao}.\n\nPor gentileza, poderiam priorizar a convocação da vaga abaixo?\n\n${vg} ${cur ? '('+cur+')' : ''}\n\nAtenciosamente,`);
        }
        let dtRetorno = new Date(); dtRetorno.setDate(dtRetorno.getDate() + 7);
        if (typeof salvarVagaParaSincronia === 'function') salvarVagaParaSincronia(vg, "A CONVOCAR TRIADOS/ENVIO DE CV", dtRetorno.toISOString().split('T')[0], ticket_global);
    } else {
        const emp = (document.getElementById('conv_empresa')||{}).value || "[Empresa]";
        if(isDG) { setValSeguro('out_conv_assunto', `CONVOCAÇÃO - DIGITAL - Vaga: ${vg} - ${emp}`); } 
        else { setValSeguro('out_conv_assunto', `Repasse CR - ${reg} - Vaga: ${vg} - ${emp}`); }

        const cData = (document.getElementById('conv_data')||{}).value || ""; const cMod = (document.getElementById('conv_mod')||{}).value || "";
        const cEnd = (document.getElementById('conv_end')||{}).value || ""; const cHora = (document.getElementById('conv_hora')||{}).value || "";
        const cCont = (document.getElementById('conv_contato')||{}).value || ""; const cSal = (document.getElementById('conv_saldo')||{}).value || "";

        setValSeguro('out_conv_texto', `Prezados, ${saudacao}!\nEspero que estejam bem.\n\nPoderiam por gentileza prosseguir com a convocação abaixo:\n\nEmpresa: ${emp}\nVaga: ${vg}\nData do processo: ${cData}\nModalidade: ${cMod}\nEndereço da entrevista: ${cEnd}\nPonto de referência: (Informar)\nHorário da entrevista: ${cHora}\nProcurar por: ${cCont}\nDocumentos necessários: RG, CPF, Comprovante de residência, Declaração de matrícula/conclusão e Certificado de reservista.\nSaldo de encaminhados: ${cSal}\n\nAtenciosamente,`);
    }
    
    forcarExibicaoCaixas();
    injetarSilencioso((document.getElementById('out_conv_texto')||{}).value);
    if (typeof copiarLogAutomatico === 'function') copiarLogAutomatico((document.getElementById('out_conv_texto')||{}).value, "Texto de Convocação");
}