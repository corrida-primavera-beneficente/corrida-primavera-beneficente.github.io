# Circuito da Primavera Tingui 2026 — Site de inscrições

Site estático + Google Apps Script → Planilha Google + pasta no Drive.

```
index.html / styles.css / app.js   → o site
config.js                          → chave Pix, links de WhatsApp, URL do script (edite aqui)
assets/                            → logo e medalha
apps-script/Code.gs                → backend (cole no Google Apps Script)
```

## 1. Publicar o backend (uma vez)

1. Abra a planilha **Corrida Primavera Tingui 2026** → menu **Extensões → Apps Script**.
2. Apague o conteúdo do `Código.gs` e cole todo o `apps-script/Code.gs`. Salve (💾).
3. No topo, escolha a função **setup** e clique **▶ Executar**. Autorize com a sua conta Google
   (em "Google não verificou este app" → *Avançado* → *Acessar (não seguro)* — é o seu próprio script).
   Isso cria a aba **Inscrições** e a pasta **Comprovantes - Circuito da Primavera Tingui 2026** no seu Drive.
4. **Implantar → Nova implantação** → tipo **App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Copie a **URL do app da Web** (termina em `/exec`) e cole em `config.js` → `APPS_SCRIPT_URL`.

> Se alterar o `Code.gs` depois: **Implantar → Gerenciar implantações → ✏️ → Versão: Nova versão**. A URL continua a mesma.

## 2. Preencher `config.js`

- `PIX_CHAVE`, `PIX_NOME` (titular), `PIX_CIDADE`
- `WHATSAPP_GRUPO`: link de convite do grupo (WhatsApp → grupo → Convidar via link)
- `WHATSAPP_ORG`: número para dúvidas (opcional)

## 3. Colocar no ar (grátis)

**Netlify Drop:** acesse https://app.netlify.com/drop e arraste a pasta inteira do projeto. Pronto: gera um link.
Depois é possível trocar o nome em *Site settings → Change site name* (ex.: `primavera-tingui.netlify.app`).

## 4. No dia a dia

- Cada inscrição vira uma linha na aba **Inscrições**, com o link **Abrir comprovante**.
- Confira o Pix no banco e troque o **Status pagamento** para **Confirmado**.
- Para encerrar as inscrições: `INSCRICOES_ABERTAS: false` no `config.js` e publique de novo.
