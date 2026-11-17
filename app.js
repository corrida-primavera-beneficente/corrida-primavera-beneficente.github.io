(function () {
  const C = window.CONFIG;
  const $ = (s) => document.querySelector(s);
  const form = $("#form");
  const MAX_MB = 5;

  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // ---------- Inscrições abertas? ----------
  const encerrado = () => C.ENCERRAMENTO && Date.now() > new Date(C.ENCERRAMENTO).getTime();
  if (!C.INSCRICOES_ABERTAS || encerrado()) {
    form.hidden = true;
    $("#closed").hidden = false;
  }

  // ---------- Links de WhatsApp ----------
  if (C.WHATSAPP_ORG) {
    const fw = $("#footer-wa");
    fw.href = "https://wa.me/" + C.WHATSAPP_ORG;
    fw.hidden = false;
  }

  // ---------- Botões "Escolher" dos cards ----------
  document.querySelectorAll("[data-pick]").forEach((a) =>
    a.addEventListener("click", () => {
      const r = form.querySelector(`input[name=modelo][value=${a.dataset.pick}]`);
      r.checked = true;
      updatePix();
    })
  );

  // ---------- Máscara WhatsApp ----------
  const wa = form.whatsapp;
  wa.addEventListener("input", () => {
    let d = wa.value.replace(/\D/g, "").slice(0, 11);
    if (d.length > 6) d = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
    else if (d.length > 2) d = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    else if (d.length) d = `(${d}`;
    wa.value = d;
  });

  // ---------- Pix (chave para copiar) ----------
  function updatePix() {
    const m = form.modelo.value;
    if (!m) return;
    const valor = brl(C.PLANOS[m].valor);
    $("#pix-empty").hidden = true;
    $("#pix").hidden = false;
    $("#pix-valor").textContent = valor;
    $("#pix-valor2").textContent = valor;
    $("#pix-nome").textContent = C.PIX_NOME;
    $("#pix-chave").textContent = C.PIX_CHAVE;
  }
  form.querySelectorAll("input[name=modelo]").forEach((r) => r.addEventListener("change", updatePix));

  $("#pix-copy").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    try {
      await navigator.clipboard.writeText(C.PIX_CHAVE);
    } catch {
      const t = document.createElement("textarea");
      t.value = C.PIX_CHAVE; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select(); t.setSelectionRange(0, 999);
      document.execCommand("copy"); t.remove();
    }
    b.textContent = "✓ Chave copiada! Agora cole no app do banco";
    b.classList.add("copied");
    setTimeout(() => { b.textContent = "📋 Copiar chave Pix"; b.classList.remove("copied"); }, 3500);
  });

  // ---------- "Acorda" o servidor enquanto a pessoa preenche ----------
  let warmed = false;
  form.addEventListener("focusin", () => {
    if (warmed || !C.APPS_SCRIPT_URL) return;
    warmed = true;
    fetch(C.APPS_SCRIPT_URL).catch(() => {});
  });

  // ---------- Upload (comprime a imagem já na hora que anexa) ----------
  const file = form.comprovante;
  let prepared = null; // Promise<{nome, tipo, base64}>

  const readAsBase64 = (blob) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });

  async function compressImage(fl) {
    const MAX = 1600;
    const url = URL.createObjectURL(fl);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = url;
      });
      const k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.8));
      return blob && blob.size < fl.size ? blob : null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function prepareFile(fl) {
    if (fl.type.startsWith("image/")) {
      try {
        const small = await compressImage(fl);
        if (small) {
          return { nome: fl.name.replace(/\.[^.]+$/, "") + ".jpg", tipo: "image/jpeg", base64: await readAsBase64(small), bytes: small.size };
        }
      } catch (e) { /* formato que o navegador não abre (ex. HEIC): envia o original */ }
    }
    return { nome: fl.name, tipo: fl.type, base64: await readAsBase64(fl), bytes: fl.size };
  }

  file.addEventListener("change", () => {
    const fl = file.files[0];
    $("#upload-t").textContent = fl ? "✓ " + fl.name : "Toque para anexar a imagem ou o PDF do comprovante";
    $("#upload").classList.toggle("has-file", !!fl);
    prepared = fl ? prepareFile(fl) : null;
    if (prepared) prepared.catch(() => {});
  });

  // ---------- Tela "Enviando..." ----------
  const sending = $("#sending");
  const blockLeave = (e) => { e.preventDefault(); e.returnValue = ""; };
  function setSending(on) {
    sending.hidden = !on;
    document.body.style.overflow = on ? "hidden" : "";
    if (on) window.addEventListener("beforeunload", blockLeave);
    else window.removeEventListener("beforeunload", blockLeave);
  }

  // ---------- Envio ----------
  const err = $("#error");
  const showErr = (msg) => { err.textContent = msg; err.hidden = false; err.scrollIntoView({ behavior: "smooth", block: "center" }); };

  function validate() {
    const nome = form.nome.value.trim();
    if (nome.split(/\s+/).length < 2) return "Informe seu nome completo.";
    if (wa.value.replace(/\D/g, "").length < 10) return "Informe um WhatsApp válido com DDD.";
    if (!form.nascimento.value) return "Informe sua data de nascimento.";
    if (!form.modalidade.value) return "Escolha a modalidade: corrida ou caminhada.";
    if (!form.modelo.value) return "Escolha o modelo de inscrição.";
    const fl = file.files[0];
    if (!fl) return "Anexe o comprovante do Pix.";
    if (!/^image\/|^application\/pdf$/.test(fl.type)) return "O comprovante precisa ser imagem (JPG/PNG) ou PDF.";
    const limite = fl.type.startsWith("image/") ? 20 : MAX_MB; // imagens são comprimidas antes do envio
    if (fl.size > limite * 1024 * 1024) return `O comprovante tem mais de ${limite} MB. Envie um arquivo menor.`;
    if (!form.termo.checked) return "Marque a declaração de responsabilidade para continuar.";
    return "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.hidden = true;
    if (encerrado()) return showErr("As inscrições foram encerradas em 03/12.");
    const msg = validate();
    if (msg) return showErr(msg);
    if (!C.APPS_SCRIPT_URL) return showErr("Sistema ainda não configurado (APPS_SCRIPT_URL).");

    const btn = $("#submit");
    btn.disabled = true;
    btn.textContent = "Enviando…";
    setSending(true);

    try {
      const arq = await (prepared || prepareFile(file.files[0]));
      if (arq.bytes > MAX_MB * 1024 * 1024) throw new Error("grande");
      const plano = C.PLANOS[form.modelo.value];
      const body = {
        nome: form.nome.value.trim(),
        whatsapp: wa.value,
        nascimento: form.nascimento.value,
        modalidade: form.modalidade.value,
        modelo: plano.nome,
        valor: plano.valor,
        arquivo: { nome: arq.nome, tipo: arq.tipo, base64: arq.base64 },
      };
      // text/plain evita o preflight de CORS do Apps Script
      const r = await fetch(C.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.erro || "Erro ao salvar");

      setSending(false);
      form.hidden = true;
      $("#success-n").textContent = "#" + data.numero;
      const g = $("#success-wa");
      if (C.WHATSAPP_GRUPO) g.href = C.WHATSAPP_GRUPO;
      else g.closest(".group-cta").hidden = true;
      $("#success").hidden = false;
      $("#inscricao").scrollIntoView({ behavior: "smooth" });
    } catch (ex) {
      console.error(ex);
      setSending(false);
      if (ex.message === "grande") {
        btn.disabled = false;
        btn.textContent = "Enviar inscrição";
        return showErr(`O comprovante tem mais de ${MAX_MB} MB. Envie um print ou um arquivo menor.`);
      }
      showErr("Não foi possível enviar agora. Verifique sua internet e tente de novo. Se persistir, fale com a organização.");
      btn.disabled = false;
      btn.textContent = "Enviar inscrição";
    }
  });
})();
