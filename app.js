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

  // ---------- Pix (BR Code "copia e cola") ----------
  const strip = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const f = (id, v) => id + String(v.length).padStart(2, "0") + v;
  function crc16(s) {
    let crc = 0xffff;
    for (let i = 0; i < s.length; i++) {
      crc ^= s.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }
  function pixPayload(valor) {
    const p =
      f("00", "01") +
      f("26", f("00", "br.gov.bcb.pix") + f("01", C.PIX_CHAVE.trim())) +
      f("52", "0000") +
      f("53", "986") +
      f("54", valor.toFixed(2)) +
      f("58", "BR") +
      f("59", strip(C.PIX_NOME).slice(0, 25)) +
      f("60", strip(C.PIX_CIDADE).slice(0, 15)) +
      f("62", f("05", "PRIMAVERA2026")) +
      "6304";
    return p + crc16(p);
  }

  let pixCode = "";
  function updatePix() {
    const m = form.modelo.value;
    if (!m) return;
    const plano = C.PLANOS[m];
    $("#pix-empty").hidden = true;
    $("#pix").hidden = false;
    $("#pix-valor").textContent = brl(plano.valor);
    $("#pix-nome").textContent = C.PIX_NOME || "(configurar)";
    $("#pix-chave").textContent = C.PIX_CHAVE || "(configurar)";
    const qr = $("#pix-qr");
    qr.innerHTML = "";
    if (!C.PIX_CHAVE) { qr.textContent = "Configure a chave Pix"; return; }
    pixCode = pixPayload(plano.valor);
    new QRCode(qr, { text: pixCode, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M });
  }
  form.querySelectorAll("input[name=modelo]").forEach((r) => r.addEventListener("change", updatePix));

  $("#pix-copy").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    try {
      await navigator.clipboard.writeText(pixCode);
    } catch {
      const t = document.createElement("textarea");
      t.value = pixCode; document.body.appendChild(t); t.select();
      document.execCommand("copy"); t.remove();
    }
    const old = b.textContent;
    b.textContent = "Copiado! ✓";
    setTimeout(() => (b.textContent = old), 2000);
  });

  // ---------- Upload ----------
  const file = form.comprovante;
  file.addEventListener("change", () => {
    const fl = file.files[0];
    $("#upload-t").textContent = fl ? "✓ " + fl.name : "Toque para anexar a imagem ou o PDF do comprovante";
    $("#upload").classList.toggle("has-file", !!fl);
  });

  const readAsBase64 = (fl) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(fl);
    });

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
    if (fl.size > MAX_MB * 1024 * 1024) return `O comprovante tem mais de ${MAX_MB} MB. Envie um arquivo menor.`;
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

    try {
      const fl = file.files[0];
      const plano = C.PLANOS[form.modelo.value];
      const body = {
        nome: form.nome.value.trim(),
        whatsapp: wa.value,
        nascimento: form.nascimento.value,
        modalidade: form.modalidade.value,
        modelo: plano.nome,
        valor: plano.valor,
        arquivo: { nome: fl.name, tipo: fl.type, base64: await readAsBase64(fl) },
      };
      // text/plain evita o preflight de CORS do Apps Script
      const r = await fetch(C.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.erro || "Erro ao salvar");

      form.hidden = true;
      $("#success-n").textContent = "#" + data.numero;
      const g = $("#success-wa");
      if (C.WHATSAPP_GRUPO) g.href = C.WHATSAPP_GRUPO;
      else g.closest(".group-cta").hidden = true;
      $("#success").hidden = false;
      $("#inscricao").scrollIntoView({ behavior: "smooth" });
    } catch (ex) {
      console.error(ex);
      showErr("Não foi possível enviar agora. Verifique sua internet e tente de novo. Se persistir, fale com a organização.");
      btn.disabled = false;
      btn.textContent = "Enviar inscrição";
    }
  });
})();
