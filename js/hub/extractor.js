// ==========================================
// /js/hub/extractor.js
// ==========================================

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
    if (!payload || !payload.dadosEstruturados) return;
    let dados = payload.dadosEstruturados;
    
    // Fallback: Se o layout do Airtable mudar, repassa pro triturador de texto raiz
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
    if (typeof saveDraft === 'function') saveDraft();
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

    if (horarioTexto !== "Não informado") { 
        if (typeof parseHorarioParaCampos === 'function') parseHorarioParaCampos(horarioTexto); 
    } else { 
        setValSeguro('ab_carga', "Não informado"); 
    }

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

    if (!empresaEncontrada && (typeof isModoFila === 'undefined' || !isModoFila)) { 
        let mEmp = textoCorpo.match(/(?:Empresa|Cliente|Razão Social)[\s\:\-]*([^\n\r]+)/i); 
        if (mEmp) empresaEncontrada = mEmp[1].trim(); 
    }
    if (!cursoEncontrado && (typeof isModoFila === 'undefined' || !isModoFila)) { 
        let mCur = textoCorpo.match(/(?:Cursos?\s*desejados?|Curso|Área)[\s\:\-]*([^\n\r]+)/i); 
        if (mCur) cursoEncontrado = mCur[1].trim(); 
    }

    empresaEncontrada = limparLixoAirtable(empresaEncontrada);

    if (vagaEncontrada && (typeof isModoFila === 'undefined' || !isModoFila)) { ['ab_vaga', 'acomp_vaga', 'conv_vaga', 'reg_vaga'].forEach(id => setValSeguro(id, vagaEncontrada)); }
    if (empresaEncontrada) { ['ab_empresa', 'acomp_nome', 'conv_empresa'].forEach(id => setValSeguro(id, empresaEncontrada)); }
    if (cursoEncontrado) { ['ab_curso', 'acomp_curso', 'conv_curso'].forEach(id => setValSeguro(id, cursoEncontrado)); }

    return isAcomp ? "ACOMP" : "ABERTURA";
}

function extrairDoTexto() {
    let textoBruto = (document.getElementById('texto_upload')||{}).value;
    if(!textoBruto) return showToast("Cole o texto do e-mail primeiro.", "warning");
    trituradorDeVagas(textoBruto);
}

function lerPlanilha(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            // Requer a library xlsx carregada no manifest
            const workbook = XLSX.read(data, { type: 'array' });
            let textoUnificado = "";
            for (let i = 0; i < workbook.SheetNames.length; i++) {
                let sheet = workbook.Sheets[workbook.SheetNames[i]];
                let csvRaw = XLSX.utils.sheet_to_csv(sheet);
                textoUnificado += csvRaw + "\n";
            }
            showToast("Planilha lida com sucesso. Enviando para o Triturador...", "info");
            trituradorDeVagas(textoUnificado);
        } catch (err) { showToast("Ocorreu um erro ao processar a planilha.", "error"); }
        event.target.value = ''; 
    };
    reader.readAsArrayBuffer(file);
}

async function carregarPDFAirtableLocal(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        if (typeof window.pdfjsLib !== 'undefined') { 
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('js/libs/pdf.worker.min.js'); 
        } else { 
            throw new Error("Biblioteca pdfjsLib não encontrada."); 
        }
        
        showToast("Lendo PDF de forma offline...", "info");
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let textoCompletoBruto = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const pagina = await pdf.getPage(i);
            const conteudoTexto = await pagina.getTextContent();
            textoCompletoBruto += conteudoTexto.items.map(item => item.str).join(" ") + " ";
        }
        trituradorDeVagas(textoCompletoBruto);
        event.target.value = ''; 
    } catch (erro) { 
        showToast("Erro ao ler o PDF local.", "error"); 
        event.target.value = ''; 
    }
}