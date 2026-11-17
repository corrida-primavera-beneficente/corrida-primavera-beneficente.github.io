// ============================================================
//  CONFIGURAÇÃO — edite só este arquivo
// ============================================================
window.CONFIG = {
  // URL do Google Apps Script publicado (termina em /exec)
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxUtp7i-vTnl0zCJb71m_5yWWUu02JZZ5P8Ddu87-vlmLcLOEI54J-lUE2bcU0OYLg/exec",

  // Dados do Pix (recebedor)
  PIX_CHAVE: "",              // CPF, CNPJ, e-mail, celular (+5541...) ou chave aleatória
  PIX_NOME: "",               // nome do titular da conta (até 25 letras)
  PIX_CIDADE: "CURITIBA",

  // Link de convite do GRUPO do WhatsApp (aparece depois que a pessoa se inscreve)
  // Ex: "https://chat.whatsapp.com/AbCdEf123..."
  WHATSAPP_GRUPO: "https://chat.whatsapp.com/FPa7wJCkhYw6Hz2OEODEnr",

  // WhatsApp da organização para dúvidas (rodapé), só números. Ex: "5541999999999"
  WHATSAPP_ORG: "",

  // false = mostra "Inscrições encerradas" na hora (fechamento manual)
  INSCRICOES_ABERTAS: true,

  // Fechamento automático (horário de Brasília). Sem limite de vagas.
  ENCERRAMENTO: "2026-12-03T23:59:59-03:00",

  PLANOS: {
    campeao:   { nome: "Inscrição Campeão",   valor: 45.90 },
    essencial: { nome: "Inscrição Essencial", valor: 25.90 },
  },
};
