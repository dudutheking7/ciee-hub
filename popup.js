document.addEventListener('DOMContentLoaded', () => {
    
    document.getElementById('btn_abrir_hub').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("hub.html") });
    });

    document.getElementById('btn_enviar_dados').addEventListener('click', () => {
        acionarLeitor("zendesk.com", "extrairZendesk", "receberDadosZendesk");
    });

    document.getElementById('btn_airtable').addEventListener('click', () => {
        acionarLeitor("airtable.com", "extrairAirtable", "receberDadosAirtable");
    });

    async function acionarLeitor(urlDesejada, acaoContent, acaoHub) {
        const status = document.getElementById('status');
        status.style.color = '#333';
        status.innerText = "Buscando Hub...";

        try {
            const hubUrl = chrome.runtime.getURL("hub.html");
            const hubTabs = await chrome.tabs.query({ url: hubUrl });
            
            if (hubTabs.length === 0) {
                status.style.color = '#dc3545';
                status.innerText = "Abra o Painel Principal primeiro (Botão 1).";
                return;
            }

            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!activeTab || !activeTab.url.includes(urlDesejada)) {
                status.style.color = '#dc3545';
                status.innerText = `Você precisa estar numa aba do ${urlDesejada.split('.')[0]}!`;
                return;
            }

            status.style.color = '#007bff';
            status.innerText = "Lendo a tela...";
            
            chrome.tabs.sendMessage(activeTab.id, { acao: acaoContent }, (response) => {
                if (chrome.runtime.lastError || !response) {
                    status.style.color = '#dc3545';
                    status.innerText = "Dê F5 na página para atualizar a conexão.";
                    return;
                }

                chrome.tabs.sendMessage(hubTabs[0].id, {
                    acao: acaoHub,
                    payload: response
                });

                status.style.color = '#28a745';
                status.innerText = "Enviado com sucesso!";
                
                chrome.tabs.update(hubTabs[0].id, { active: true });
            });
            
        } catch (err) {
            console.error(err);
            status.style.color = '#dc3545';
            status.innerText = "Erro inesperado. Tente novamente.";
        }
    }
});