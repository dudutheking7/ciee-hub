// ==========================================
// /js/core/gemini-api.js
// ==========================================

let cachedModelName = "";

async function auditarComGemini(assuntoTicket, textoCorpo, numeroTicket, resultadosRegexAnteriores) {
    const GEMINI_API_KEY = localStorage.getItem("ciee_gemini_api_key") || "";
    
    exibirPainelIA("⏳ Sincronizando com a API do Google (Buscando modelo de Geração 3)...", "carregando");

    try {
        if (!cachedModelName) {
            const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`;
            const listResponse = await fetch(listUrl);
            const listData = await listResponse.json();
            
            if (listData.error) throw new Error("Erro na API Key: " + listData.error.message);
            
            const availableModels = listData.models
                .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                .map(m => m.name);

            if (availableModels.includes("models/gemini-3.6-flash")) cachedModelName = "models/gemini-3.6-flash";
            else if (availableModels.includes("models/gemini-3.5-flash")) cachedModelName = "models/gemini-3.5-flash";
            else if (availableModels.includes("models/gemini-3.1-flash-lite")) cachedModelName = "models/gemini-3.1-flash-lite";
            else {
                const modelosSeguros = availableModels.filter(name => !name.includes("2.5"));
                cachedModelName = modelosSeguros.length > 0 ? modelosSeguros[modelosSeguros.length - 1] : availableModels[0];
            }
        }

        exibirPainelIA(`⏳ Extraindo e Auditando via ${cachedModelName.split('/')[1]}...`, "carregando");

        const url = `https://generativelanguage.googleapis.com/v1/${cachedModelName}:generateContent?key=${GEMINI_API_KEY}`;

        // NOVO PROMPT: FORMATADO PARA A AUTOMAÇÃO DE ABERTURA (FASE 3) - REGRAS CORRIGIDAS E CARGA HORÁRIA ADICIONADA
        const promptText = `
        Você é um Auditor Jurídico e Extrator de Dados Sênior do CIEE. Leia o e-mail de solicitação de vaga abaixo.
        
        REGRAS DE NEGÓCIO RIGOROSAS:
        1. Carga horária máxima legal: Máximo de 6h diárias de estágio (desconte o intervalo se houver).
        2. Períodos (Semestres): Se Ensino Superior, o padrão é do 2º ao 6º semestre (exceto se a empresa exigir outro).
        3. Auxílio Transporte (VT): Deduza logicamente. Valores altos (ex: R$ 150, R$ 200) são "Mensal". Valores baixos (ex: R$ 10, R$ 18) são "Diário". Se não houver valor, use "A combinar" ou "Não informado".
        4. Cursos - Filtro Positivo e Negativo:
           - Se Ensino Médio: Permitir "Ensino Médio", "EJA", "Novo Ensino Médio", "EAD". PROIBIR "EJATEC", "Integrado", "Técnico", "Habilitação".
           - Se Administração: Permitir "Administração", "Empresas", "Negócios", "EAD". PROIBIR "Marketing", "Engenharia", "Logística", "Sistemas", a menos que a empresa peça explicitamente.
        5. Nível Escolar: Se a empresa pedir cursos como MKT, ADM, RH, ENG, Direito, Psicologia ou afins, defina "nivel_escolar" OBRIGATORIAMENTE como "Superior", a menos que o texto contenha explicitamente as palavras "Técnico" ou "Ensino Médio".
        6. Atividades: Você deve "traduzir" os textos longos da empresa para termos CURTOS E GENÉRICOS de catálogo de vagas (máximo 3 a 4 palavras). Exemplo: Se a empresa pede "Auxiliar no setor da produção, organizar freezer e ver etiquetas", você devolve apenas "Auxiliar na produção" ou "Organização de estoque". Foque na essência da ação para que o sistema consiga encontrar o item na lista padrão.
        7. Carga Horária (Jornada): Extraia a jornada diária de trabalho. Se a vaga pedir "6 horas diárias" ou "Estágio de 6h", responda "06:00". Se for 4 horas, "04:00". Se não for mencionado, deixe vazio.
        
        Assunto do E-mail: "${assuntoTicket}"
        Corpo do E-mail: "${textoCorpo}"
        
        Responda APENAS com um objeto JSON válido, sem crases markdown (sem \`\`\`json), exatamente com esta estrutura:
        {
          "tipo_demanda": "Abertura ou Acompanhamento",
          "sentimento": "Neutro, Urgente ou Risco",
          "auditoria": { "aprovado": true, "alerta": "Resumo do problema jurídico ou OK" },
          "dados": {
            "empresa": "Nome limpo da empresa",
            "modalidade": "Estagio ou Aprendiz",
            "nivel_escolar": "Médio, Superior ou Técnico",
            "curso": "Nome do curso original",
            "sexo": "Feminino, Masculino ou Ambos",
            "bolsa": "Valor numérico limpo ou A combinar",
            "vt": {
              "tipo": "mensal, diario ou a_combinar",
              "valor": "Valor numérico limpo"
            },
            "horario_entrada": "HH:MM",
            "horario_saida": "HH:MM",
            "carga_horaria": "HH:MM",
            "semestre": {
              "minimo": "Numero ou texto",
              "maximo": "Numero ou texto"
            },
            "filtro_cursos": {
              "pesquisa_kairos": "Termo principal para digitar na busca (ex: administração ou ensino médio)",
              "palavras_permitidas": ["palavra1", "palavra2"],
              "palavras_proibidas": ["ejatec", "marketing", "tecnico"]
            },
            "atividades_sugeridas": [
              "Atividade 1",
              "Atividade 2",
              "Atividade 3"
            ]
          }
        }
        `;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        const data = await response.json();
        if(data.error) throw new Error(data.error.message);

        let jsonStr = data.candidates[0].content.parts[0].text;
        jsonStr = jsonStr.replace(/```json/gi, '').replace(/```/g, '').trim();
        const resultadoIA = JSON.parse(jsonStr);

        // SALVA O JSON DA IA NO WINDOW PARA O ROBÔ DE ABERTURA ACESSAR DEPOIS
        window.hubDadosIA = resultadoIA.dados;

        // SOBREPOSIÇÃO FORÇA BRUTA (Preenchendo a Mesa com a IA)
        if(resultadoIA.dados.empresa && !resultadoIA.dados.empresa.toLowerCase().includes("não informado") && resultadoIA.dados.empresa !== "Nenhum") {
            setValSeguro('ab_empresa', limparLixoAirtable(resultadoIA.dados.empresa));
        }
        
        if(resultadoIA.dados.curso && !resultadoIA.dados.curso.toLowerCase().includes("não informado") && resultadoIA.dados.curso !== "Nenhum") {
            setValSeguro('ab_curso', resultadoIA.dados.curso);
        }
        
        if(resultadoIA.dados.bolsa && !resultadoIA.dados.bolsa.toLowerCase().includes("não informado") && resultadoIA.dados.bolsa !== "Nenhum") {
            let b = resultadoIA.dados.bolsa;
            if(!b.toUpperCase().includes("R$") && /\d/.test(b)) b = "R$ " + b;
            setValSeguro('ab_bolsa', b);
        }

        if(resultadoIA.dados.sexo && resultadoIA.dados.sexo !== "Ambos") {
            setValSeguro('ab_sexo', resultadoIA.dados.sexo);
        }

       if (resultadoIA.tipo_demanda && resultadoIA.tipo_demanda.toLowerCase().includes("acompanhamento")) { 
            openTab('acomps'); 
        } else { 
            openTab('abertura_ia'); // Abre a nossa nova aba!
            if (typeof popularAbaBeta === 'function') {
                popularAbaBeta(resultadoIA.dados); // Manda a IA preencher as Tags!
            }
        }

        exibirPainelIA(resultadoIA, "sucesso");

        if (typeof isModoDev !== 'undefined' && isModoDev) {
            console.log(`[SHADOW MODE] Ticket: #${numeroTicket}`);
            console.log(`[REGEX] Empresa: ${resultadosRegexAnteriores.empresa} | Curso: ${resultadosRegexAnteriores.curso}`);
            console.log(`[IA] Empresa: ${resultadoIA.dados.empresa} | Curso: ${resultadoIA.dados.curso}`);
            if (resultadosRegexAnteriores.curso === "" && resultadoIA.dados.curso !== "Não informado") {
                showToast(`🛠️ DEV: Regex falhou no Curso, IA encontrou: ${resultadoIA.dados.curso}`, "warning");
            }
        } else {
            let falhaNoRegex = false;
            if (resultadosRegexAnteriores.empresa === "" && resultadoIA.dados.empresa !== "Não informado") falhaNoRegex = true;
            if (resultadosRegexAnteriores.curso === "" && resultadoIA.dados.curso !== "Não informado") falhaNoRegex = true;
            if (resultadosRegexAnteriores.bolsa === "" && resultadoIA.dados.bolsa !== "Não informado") falhaNoRegex = true;

            if (falhaNoRegex && typeof enviarParaTreinamento === 'function') {
                enviarParaTreinamento(numeroTicket, textoCorpo, resultadosRegexAnteriores, resultadoIA.dados);
            }
        }

    } catch (error) {
        console.error("Falha no Motor IA:", error);
        exibirPainelIA("❌ " + error.message, "erro");
    }
}

function exibirPainelIA(dados, status) {
    let container = document.getElementById('painel-ia-gemini');
    if (!container) {
        container = document.createElement('div');
        container.id = 'painel-ia-gemini';
        container.style.cssText = 'margin-bottom: 15px; border-radius: 8px; font-family: sans-serif; transition: 0.3s;';
        let painelAbertura = document.getElementById('abertura');
        if (painelAbertura) painelAbertura.insertBefore(container, painelAbertura.firstChild);
    }

    if (status === "carregando") {
        container.style.background = "#eef5f9";
        container.style.border = "1px solid #b6d4fe";
        container.innerHTML = `<div style="padding: 15px; color: #084298; font-weight: bold;">🧠 ${dados}</div>`;
    } else if (status === "erro") {
        container.style.background = "#f8d7da";
        container.style.border = "1px solid #f5c2c7";
        container.innerHTML = `<div style="padding: 15px; color: #842029; font-weight: bold;">${dados}</div>`;
    } else {
        let corBorda = dados.auditoria.aprovado ? "#badbcc" : "#f5c2c7";
        let corFundo = dados.auditoria.aprovado ? "#d1e7dd" : "#f8d7da";
        let corTexto = dados.auditoria.aprovado ? "#0f5132" : "#842029";
        let iconeAuditoria = dados.auditoria.aprovado ? "✅" : "⚠️";
        
        let corSentimento = dados.sentimento.includes("Risco") ? "background: #dc3545; color: white;" : (dados.sentimento.includes("Urgente") ? "background: #ffc107; color: black;" : "background: #198754; color: white;");

        container.style.background = corFundo;
        container.style.border = `2px solid ${corBorda}`;
        container.innerHTML = `
            <div style="padding: 12px 15px; color: ${corTexto};">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${corBorda}; padding-bottom: 8px; margin-bottom: 8px;">
                    <strong style="font-size: 15px;">🤖 Auditoria Gemini (${dados.tipo_demanda})</strong>
                    <span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; ${corSentimento}">
                        Termômetro: ${dados.sentimento}
                    </span>
                </div>
                <div style="font-size: 13px;">
                    <strong>${iconeAuditoria} Análise Legal:</strong> ${dados.auditoria.alerta}
                </div>
            </div>
        `;
        showToast("Análise IA Concluída!", "success");
    }
}