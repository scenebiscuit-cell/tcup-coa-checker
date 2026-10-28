/* TCUP COA Checker: page logic. Uses CORE (src/core.js) and SAMPLES (src/samples.js). */
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const F = CORE.fmt;

  const state = { data: null, result: null, source: null, sampleId: null, sampleText: null, images: [], fileName: null, ctl: null, sample: null, canImages: false };

  /* ---------- samples ---------- */
  const sWrap = $("samples");
  for (const s of SAMPLES) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "sample"; b.dataset.id = s.id; b.setAttribute("aria-pressed", "false");
    b.dataset.tone = { clear: "pass", review: "warn", hold: "fail" }[CORE.evaluate(CORE.parseText(s.text)).verdict];
    b.innerHTML = `<b>${esc(s.label)}</b><span>${esc(s.hint)}</span>`;
    b.onclick = () => loadSample(s.id);
    sWrap.append(b);
  }
  function markSample(id) { for (const b of sWrap.children) b.setAttribute("aria-pressed", String(b.dataset.id === id)); }
  function loadSample(id) {
    const s = SAMPLES.find(x => x.id === id);
    clearAttachment();
    $("coa").value = s.text;
    state.sampleId = id; state.sampleText = s.text;
    markSample(id);
    setStatus("");
    showData(CORE.parseText(s.text), "Sample · built-in parser");
  }
  $("coa").addEventListener("input", () => { if ($("coa").value !== state.sampleText) { state.sampleId = null; markSample(null); } });

  /* ---------- status ---------- */
  function setStatus(msg, err) { const el = $("status"); el.textContent = msg; el.classList.toggle("err", !!err); }

  /* ---------- Claude availability ---------- */
  (async () => {
    try {
      const sample = await window.claude?.use?.("sample");
      if (!sample) throw 0;
      state.sample = sample;
      refreshRunLabel();
      $("how").innerHTML = "<b>How it works.</b> Claude reads the document and fills in a fixed set of fields. The compliance calls come from rules written in code, each tied to a statute or rule, so the same COA always gets the same verdict. You can correct any field the reader got wrong.";
      const lim = await sample.limits().catch(() => null);
      state.canImages = !!lim?.images;
      refreshRunLabel();
    } catch {
      state.sample = null;
    }
  })();

  /* ---------- fetch from a link (Claude desktop app's built-in browser) ---------- */
  const HOST = "host:claude_browser";
  (async () => {
    try {
      const mcp = await window.claude?.use?.("mcp");
      if (!mcp) return;
      const list = await mcp.listTools(HOST).catch(() => null);
      if (!list?.servers?.some(s => s.server === HOST)) return;
      state.mcp = mcp;
      $("fetchForm").hidden = false;
    } catch { /* stays hidden */ }
  })();

  function rawText(res) {
    const p = res?.payload;
    if (typeof p === "string") return p;
    if (p && typeof p === "object") {
      for (const k of ["text", "content", "pageText", "page_text"]) if (typeof p[k] === "string") return p[k];
    }
    return (res?.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  }
  // get_page_text wraps the page in "Title/URL/Source element ---" and a trailing "Tab Context:" block
  function pageText(res) {
    let t = rawText(res);
    const head = t.indexOf("\n---\n");
    if (/^\s*Title:/.test(t) && head !== -1) t = t.slice(head + 5);
    const tail = t.search(/\n\s*Tab Context:/);
    if (tail !== -1) t = t.slice(0, tail);
    return t.trim();
  }
  function b64ToBlob(data, type) {
    const bin = atob(data); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u], { type: type || "image/png" });
  }
  $("fetchForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    let url = $("url").value.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    let host;
    try { host = new URL(url).hostname; if (!host.includes(".")) throw 0; } catch { setStatus("Enter a full web address, like https://lab.example.com/coa/123.", true); return; }
    const btn = $("fetchBtn");
    btn.disabled = true;
    clearAttachment(); state.sampleId = null; markSample(null);
    setStatus(`Opening ${host} in the Claude browser…`);
    try {
      await state.mcp.callTool(HOST, "navigate", { url });
      let text = pageText(await state.mcp.callTool(HOST, "get_page_text", { max_chars: 60000 }, { cache: false }));
      if (text.replace(/\s/g, "").length < 200) {        // portals that render late: one more look
        await new Promise(r => setTimeout(r, 2500));
        text = pageText(await state.mcp.callTool(HOST, "get_page_text", { max_chars: 60000 }, { cache: false }));
      }
      if (text.replace(/\s/g, "").length < 200) {
        setStatus(/\.pdf(\?|#|$)/i.test(url)
          ? `That link opens a PDF, which the Claude browser shows as an image. Click the download arrow at the top right of the PDF in the Claude browser, then drop the file in above. The checker reads PDFs directly.`
          : `${host} didn't return readable text. It may need a login or show the COA as a PDF. Download the COA from the Claude browser and drop it in above.`, true);
        return;
      }
      $("coa").value = text.trim(); state.sampleText = null;
      showAttachment(host);
      setStatus(`Pulled the COA text from ${host}. Checking it now…`);
      $("run").click();
    } catch (err) {
      const msg = {
        server_not_connected: "The Claude browser isn't reachable. Open this page in the Claude desktop app and try again.",
        cancelled: "The fetch was declined in the Claude app.",
        approval_required: "The Claude app needs your approval to use its browser. Click Fetch again and choose Allow.",
        not_in_manifest: "Browser access is turned off for this page. You can turn it back on from the page's Permissions menu.",
        blocked_by_policy: "Your organization's settings block this page from using the Claude browser.",
        tool_error: "The Claude browser couldn't open that link. Check the address and try again.",
      }[err?.code] || "Couldn't fetch that link. Try again, or download the COA and drop it in above.";
      const access = err?.code === "tool_error" && /allow|permission|approv/i.test(String(err?.message || ""));
      setStatus(access ? `The Claude browser needs your permission to open ${host}. Allow it when the app asks, then click Fetch again.` : msg, true);
    } finally { btn.disabled = false; }
  });

  /* ---------- local model through Ollama (runs on the viewer's own computer) ---------- */
  const store = {
    get(k) { try { return localStorage.getItem("coa." + k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem("coa." + k, v); } catch { /* storage blocked: settings just aren't remembered */ } },
  };
  const VISION_NAME = /(vl\b|vl:|vision|llava|gemma3|minicpm-v|moondream|qwen3-vl|mistral-small3\.[12])/i;
  state.local = null;   // { url, model, vision }

  function imageReader() {
    if (useOllama() && state.local.vision) return "local";
    if (state.sample && state.canImages) return "claude";
    return null;
  }
  function readerName() { return imageReader() === "local" ? state.local.model : "Claude"; }
  function useOllama() { return !!state.local && $("useLocal").checked; }

  function refreshRunLabel() {
    if (useOllama()) {
      $("run").textContent = `Read with ${state.local.model} and check`;
      $("runLocal").hidden = false;
    } else if (state.sample) {
      $("run").textContent = "Read with Claude and check";
      $("runLocal").hidden = false;
    } else {
      $("run").textContent = "Check COA";
      $("runLocal").hidden = true;
    }
    const photos = !!imageReader();
    $("drop").querySelector("span").textContent = photos ? "Or drop a PDF, text file, or photo of a COA, or" : "Or drop a PDF or text file, or";
  }

  function ollamaBase() {
    let u = $("ollamaUrl").value.trim() || "http://localhost:11434";
    if (!/^https?:\/\//i.test(u)) u = "http://" + u;
    return u.replace(/\/+$/, "");
  }
  function setLocalStatus(msg, kind) {
    const el = $("ollamaStatus"); el.textContent = msg;
    el.classList.toggle("err", kind === "err");
    $("localState").textContent = state.local ? "Connected" : "Off";
    $("localState").dataset.on = state.local ? "1" : "";
  }

  $("ollamaUrl").value = store.get("ollamaUrl") || "http://localhost:11434";
  if (/^https?:$/.test(location.protocol)) $("originCmd").textContent = `setx OLLAMA_ORIGINS "${location.origin}"`;
  $("ollamaConnect").onclick = connectOllama;
  $("ollamaModel").onchange = async () => {
    if (!state.local) return;
    state.local.model = $("ollamaModel").value;
    store.set("ollamaModel", state.local.model);
    state.local.vision = await hasVision(ollamaBase(), state.local.model);
    setLocalStatus(`Using ${state.local.model}${state.local.vision ? " (reads photos and scans)" : " (text and PDFs with text)"}.`);
    refreshRunLabel();
  };
  $("useLocal").onchange = refreshRunLabel;

  async function hasVision(base, model) {
    try {
      const r = await fetch(base + "/api/show", { method: "POST", body: JSON.stringify({ model }), signal: AbortSignal.timeout(5000) });
      if (r.ok) { const j = await r.json(); if (Array.isArray(j.capabilities)) return j.capabilities.includes("vision"); }
    } catch { /* older Ollama: fall back to the name */ }
    return VISION_NAME.test(model);
  }

  async function connectOllama() {
    const base = ollamaBase();
    store.set("ollamaUrl", base);
    $("ollamaConnect").disabled = true;
    setLocalStatus(`Connecting to ${base}…`);
    try {
      const r = await fetch(base + "/api/tags", { signal: AbortSignal.timeout(6000) });
      if (!r.ok) throw new Error("http " + r.status);
      const models = ((await r.json()).models || []).map(m => m.name || m.model).filter(Boolean);
      if (!models.length) { state.local = null; setLocalStatus("Ollama is running but has no models yet. In a terminal, run: ollama pull qwen2.5:14b", "err"); return; }
      const saved = store.get("ollamaModel");
      const pick = models.find(m => m === saved) || models.find(m => /^qwen2\.5:14b/.test(m)) || models.find(m => /qwen|llama|mistral|gemma/i.test(m)) || models[0];
      $("ollamaModel").innerHTML = models.map(m => `<option ${m === pick ? "selected" : ""}>${esc(m)}</option>`).join("");
      $("ollamaModel").disabled = false; $("useLocal").disabled = false; $("useLocal").checked = true;
      state.local = { url: base, model: pick, vision: await hasVision(base, pick) };
      store.set("ollamaModel", pick);
      setLocalStatus(`Connected. Using ${pick}${state.local.vision ? " (reads photos and scans)" : " (text and PDFs with text)"}. The COA stays on this computer.`);
    } catch (e) {
      state.local = null;
      const fromWeb = !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && location.protocol !== "file:";
      setLocalStatus(fromWeb
        ? `Couldn't reach Ollama at ${base}. Check that Ollama is running on this computer, and that it allows this site: set OLLAMA_ORIGINS to ${location.origin} and restart Ollama. Setup steps are at the bottom of the page.`
        : `Couldn't reach Ollama at ${base}. Check that Ollama is running on this computer.`, "err");
    } finally {
      $("ollamaConnect").disabled = false;
      refreshRunLabel();
    }
  }

  // photos and scans go to the model as base64, scaled down so a 12 MP phone photo doesn't swamp it
  async function toBase64Scaled(blob, max = 1800) {
    let src = blob;
    try {
      const bmp = await createImageBitmap(blob);
      const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      src = await new Promise(r => c.toBlob(r, "image/jpeg", 0.92));
    } catch { /* send the original */ }
    const url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(src); });
    return String(url).split(",")[1];
  }

  async function runOllama(text) {
    const busy = (on) => { $("run").disabled = on; $("runLocal").disabled = on; $("stop").hidden = !on; };
    const { url, model } = state.local;
    const imgs = state.images.length ? state.images : [];
    if (imgs.length && !state.local.vision) { setStatus(`${model} can't read images. Pick a vision model such as qwen2.5vl, or paste the COA text.`, true); return; }
    state.ctl = new AbortController();
    busy(true);
    const started = Date.now();
    const body = text ? text.slice(0, 60000) : `(The COA is in the attached image${imgs.length > 1 ? "s" : ""}. Read it from the image${imgs.length > 1 ? "s" : ""}.)`;
    const prompt = CORE.extractionPrompt(body);
    const need = Math.ceil(prompt.length / 3) + 3500 + imgs.length * 3000;
    const num_ctx = [8192, 16384, 32768].find(n => n >= need) || 32768;
    setStatus(`Starting ${model}… the first run can take 20–60 seconds while the model loads.`);
    let out = "";
    const tick = setInterval(() => {
      const secs = Math.round((Date.now() - started) / 1000);
      setStatus(out ? `${model} is reading the COA… ${out.length.toLocaleString()} characters written, ${secs}s` : `Waiting for ${model} to start… ${secs}s`);
    }, 1000);
    const send = async (format) => {
      const msg = { role: "user", content: prompt };
      if (imgs.length) msg.images = await Promise.all(imgs.map(b => toBase64Scaled(b)));
      return fetch(url + "/api/chat", {
        method: "POST", signal: state.ctl.signal,
        body: JSON.stringify({ model, messages: [msg], stream: true, format, keep_alive: "10m",
          options: { temperature: 0, num_ctx } }),
      });
    };
    try {
      let r = await send(CORE.extractionSchema());
      if (!r.ok) {
        const t = await r.text();
        if (r.status === 400 && /format|schema|grammar/i.test(t)) r = await send("json");   // older Ollama: plain JSON mode
        else if (r.status === 404 || /not found/i.test(t)) throw new Error(`Model ${model} isn't installed. Run: ollama pull ${model}`);
        else throw new Error(`Ollama returned an error: ${t.slice(0, 200)}`);
        if (!r.ok) throw new Error(`Ollama returned an error: ${(await r.text()).slice(0, 200)}`);
      }
      const reader = r.body.getReader(), dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          const j = JSON.parse(line);
          if (j.error) throw new Error(j.error);
          out += j.message?.content || "";
        }
      }
      if (buf.trim()) { const j = JSON.parse(buf); if (j.error) throw new Error(j.error); out += j.message?.content || ""; }
      let raw;
      try { raw = JSON.parse(out); }
      catch { const a = out.indexOf("{"), b = out.lastIndexOf("}"); raw = a !== -1 && b > a ? JSON.parse(out.slice(a, b + 1)) : null; }
      if (!raw) throw new Error(`${model}'s answer couldn't be read as data. Try again, or try a larger model.`);
      const d = CORE.sanitizeExtraction(raw);
      const secs = Math.round((Date.now() - started) / 1000);
      showData(d, `Read by ${model} · local`);
      setStatus(`${model} extracted ${d.cannabinoids.length} cannabinoid rows and ${d.panels.length} test panels in ${secs}s. Local models misread more often than large hosted ones, so compare the "Lab results as read" table to the COA before relying on the verdict.`);
    } catch (e) {
      if (e?.name === "AbortError") setStatus("Stopped.");
      else if (e instanceof TypeError) setStatus(`Lost the connection to Ollama at ${url}. Check that it's still running.`, true);
      else setStatus(e?.message || "The local model couldn't read this COA.", true);
    } finally { clearInterval(tick); busy(false); }
  }

  /* ---------- files ---------- */
  const drop = $("drop");
  $("pick").onclick = () => $("file").click();
  $("file").onchange = (e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; };
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); const f = e.dataTransfer?.files?.[0]; if (f) handleFile(f); });

  function clearAttachment() { state.images = []; state.fileName = null; state.fromScreen = false; $("attached").innerHTML = ""; }
  function showAttachment(label) {
    $("attached").innerHTML = `<span class="chip">${esc(label)} <button type="button" aria-label="Remove attachment">×</button></span>`;
    $("attached").querySelector("button").onclick = () => { clearAttachment(); setStatus(""); };
  }

  let pdfReady = null;
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("load")); document.head.append(s); }); }
  function loadPdf() {
    if (!pdfReady) pdfReady = (async () => {
      const base = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
      await loadScript(base + "pdf.worker.min.js");   // runs pdf.js on the main thread (no cross-origin Worker)
      await loadScript(base + "pdf.min.js");
      return window.pdfjsLib;
    })();
    return pdfReady;
  }

  async function handleFile(f) {
    clearAttachment();
    state.sampleId = null; markSample(null);
    const type = f.type || "";
    try {
      if (/^image\//.test(type)) {
        if (!imageReader()) { setStatus("Reading photos needs a vision model. Connect a local vision model such as qwen2.5vl under \"Use a local AI model,\" or paste the COA text instead.", true); return; }
        state.images = [f]; state.fileName = f.name;
        $("coa").value = ""; state.sampleText = null;
        showAttachment(f.name);
        setStatus(`Photo attached. ${readerName()} will read it when you check.`);
        return;
      }
      if (/pdf/.test(type) || /\.pdf$/i.test(f.name)) {
        setStatus("Reading the PDF…");
        const pdfjs = await loadPdf();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
        let text = "";
        for (let i = 1; i <= Math.min(doc.numPages, 12); i++) {
          const page = await doc.getPage(i);
          const tc = await page.getTextContent();
          // group pieces into lines by height on the page, then join them by their gaps (see CORE.joinLine)
          let lastY = null, row = [];
          for (const it of tc.items) {
            if (!it.str) continue;
            const y = Math.round(it.transform[5]);
            if (lastY !== null && Math.abs(y - lastY) > 2) { text += CORE.joinLine(row) + "\n"; row = []; }
            row.push({ str: it.str, x: it.transform[4], w: it.width, h: it.height || Math.abs(it.transform[3]) });
            lastY = y;
          }
          text += CORE.joinLine(row) + "\n\n";
        }
        state.fileName = f.name;
        if (text.replace(/\s/g, "").length > 150) {
          $("coa").value = text.trim(); state.sampleText = null;
          showAttachment(f.name);
          setStatus(`Pulled text from ${doc.numPages} page${doc.numPages > 1 ? "s" : ""}. Check it below, then run the check.`);
        } else {
          // scanned PDF: render pages to images for Claude
          if (!imageReader()) { setStatus("This PDF is a scan with no text layer, so the built-in parser can't read it. Connect a local vision model such as qwen2.5vl, or paste the COA text instead.", true); return; }
          const lim = imageReader() === "claude" ? await state.sample.limits().catch(() => null) : null;
          const max = Math.min(doc.numPages, lim?.images?.maxCount || 3);
          const blobs = [];
          for (let i = 1; i <= max; i++) {
            const page = await doc.getPage(i);
            const vp = page.getViewport({ scale: 2 });
            const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
            await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
            blobs.push(await new Promise(r => c.toBlob(r, "image/png")));
          }
          state.images = blobs;
          $("coa").value = ""; state.sampleText = null;
          showAttachment(`${f.name} · ${max} page image${max > 1 ? "s" : ""}`);
          setStatus(`Scanned PDF. ${readerName()} will read the page images when you check.`);
        }
        return;
      }
      // text-ish
      $("coa").value = await f.text(); state.sampleText = null;
      showAttachment(f.name);
      setStatus("File loaded.");
    } catch (e) {
      setStatus("Couldn't read that file. Try pasting the COA text instead.", true);
    }
  }

  /* ---------- run ---------- */
  $("runLocal").onclick = () => runLocal();
  $("run").onclick = () => {
    const text = $("coa").value.trim();
    // unchanged sample text reloads instantly, unless a local model is on: then the model reads it too, for comparison
    if (state.sampleId && text === state.sampleText.trim() && !useOllama()) { loadSample(state.sampleId); return; }
    if (!text && !state.images.length) { setStatus("Paste COA text or attach a file first.", true); return; }
    if (useOllama()) runOllama(text); else if (state.sample) runClaude(text); else runLocal();
  };
  $("stop").onclick = () => state.ctl?.abort();

  function runLocal() {
    const text = $("coa").value;
    if (!text.trim()) { setStatus(state.images.length ? "The built-in parser reads text only. Use an AI reader for photos and scans." : "Paste COA text first.", true); return; }
    const d = CORE.parseText(text);
    const found = d.cannabinoids.length + d.panels.length;
    showData(d, "Built-in parser");
    setStatus(found ? `Parsed ${d.cannabinoids.length} cannabinoid rows and ${d.panels.length} test panels.` : "The built-in parser didn't recognize this layout." + (state.sample || state.local ? " Try the AI reader." : " Connecting a local AI model under \"Use a local AI model\" reads any layout."), !found);
  }

  async function runClaude(text) {
    const busy = (on) => { $("run").disabled = on; $("runLocal").disabled = on; $("stop").hidden = !on; };
    state.ctl = new AbortController();
    busy(true);
    setStatus("Claude is reading the COA… this usually takes 15–60 seconds.");
    const body = text ? text.slice(0, 60000) : `(The COA is in the attached image${state.images.length > 1 ? "s" : ""}. Read it from the image.)`;
    const opts = { signal: state.ctl.signal, modelTier: "default" };
    if (state.images.length) opts.images = state.images;
    try {
      const raw = await state.sample.json(CORE.extractionPrompt(body), opts);
      const d = CORE.sanitizeExtraction(raw);
      showData(d, "Read by Claude");
      setStatus(`Claude extracted ${d.cannabinoids.length} cannabinoid rows and ${d.panels.length} test panels. Correct anything it misread under Product details.` +
        (state.fromScreen ? " These values came from screen captures, where small table text can blur. For a final call, download the PDF and drop it in above." : ""));
    } catch (e) {
      const msg = {
        cancelled: "Stopped.",
        not_granted: "Claude access wasn't allowed for this page. Using the built-in parser instead.",
        sampling_disabled: "Claude isn't available on this account. Using the built-in parser instead.",
        rate_limited: "Too many requests right now. Wait a minute and try again.",
        invalid_json: "Claude's answer couldn't be read as data. Try again.",
        prompt_too_large: "That COA is too long. Paste the potency and contaminant pages only.",
        image_rejected: "That image couldn't be used. Try a clearer photo or a PDF.",
        refused: "Claude declined to read this document.",
        session_expired: "Your session expired. Sign in again and retry.",
      }[e?.code] || "Something went wrong reaching Claude. Try again.";
      setStatus(msg, e?.code !== "cancelled");
      if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled"].includes(e?.code)) {
        state.sample = null; refreshRunLabel();
        if (text) runLocal();
      }
    } finally { busy(false); }
  }

  /* ---------- render ---------- */
  function showData(d, source) {
    state.data = d; state.source = source;
    $("source").textContent = source;
    $("reportBody").innerHTML = shell();
    bindDetails();
    renderResults();
  }

  function shell() {
    const p = state.data.product;
    const opt = (u, cur) => `<option ${u === cur ? "selected" : ""}>${u}</option>`;
    return `
      <div style="display:grid;gap:18px">
        <div class="verdict" id="verdict"></div>
        <dl class="meta" id="meta"></dl>
        <fieldset class="details">
          <legend>Product details</legend>
          <div class="field"><label for="f-form">Product form</label><input id="f-form" value="${esc(p.form ?? "")}" placeholder="e.g. Gummy"></div>
          <div class="field"><label for="f-size">Dosage unit size</label><div class="row"><input id="f-size" type="number" min="0" step="any" value="${p.unit_size ?? ""}" placeholder="4"><select id="f-sizeu" aria-label="Dosage unit size unit">${opt("g", p.unit_size_unit ?? "g")}${opt("mL", p.unit_size_unit)}</select></div></div>
          <div class="field"><label for="f-units">Units per package</label><input id="f-units" type="number" min="0" step="1" value="${p.units_per_package ?? ""}" placeholder="100"></div>
          <div class="field"><label for="f-net">Net contents</label><div class="row"><input id="f-net" type="number" min="0" step="any" value="${p.net_content ?? ""}" placeholder="400"><select id="f-netu" aria-label="Net contents unit">${opt("g", p.net_content_unit ?? "g")}${opt("mL", p.net_content_unit)}</select></div></div>
          <p class="note">Read from the COA. Edit any value and the checks rerun.</p>
        </fieldset>
        <div class="meters" id="meters"></div>
        <ul class="checks" id="checks"></ul>
        <details class="data"><summary>Lab results as read</summary><div class="inner" id="tables"></div></details>
        <div class="foot-actions"><button type="button" class="btn" id="copy">Copy findings</button><span class="status" id="copyMsg"></span></div>
      </div>`;
  }

  function bindDetails() {
    const p = state.data.product;
    const upd = () => {
      p.form = $("f-form").value.trim() || null;
      p.unit_size = CORE.num($("f-size").value); p.unit_size_unit = $("f-sizeu").value;
      p.units_per_package = CORE.num($("f-units").value);
      p.net_content = CORE.num($("f-net").value); p.net_content_unit = $("f-netu").value;
      renderResults();
    };
    for (const id of ["f-form", "f-size", "f-sizeu", "f-units", "f-net", "f-netu"]) $(id).addEventListener("input", upd);
    $("copy").onclick = copyFindings;
  }

  function renderResults() {
    const d = state.data;
    const r = CORE.evaluate(d);
    state.result = r;
    const p = d.product;

    const head = { hold: ["Hold", "Don't dispense until the failures are resolved."], review: ["Review", "No hard failures, but some items need a person to confirm."], clear: ["Clear", "Nothing on this COA conflicts with the TCUP rules checked here."] }[r.verdict];
    const pills = ["fail", "warn", "pass", "info"].filter(k => r.counts[k]).map(k => `<span class="pill ${k}">${r.counts[k]} ${{ fail: "fail", warn: "to review", pass: "pass", info: "note" }[k]}${k === "fail" && r.counts[k] > 1 ? "s" : ""}${k === "info" && r.counts[k] > 1 ? "s" : ""}</span>`).join("");
    if ($("verdict").dataset.v !== r.verdict) window.HeaderArt?.mood(r.verdict);   // the header trichomes react to the verdict
    $("verdict").dataset.v = r.verdict;
    $("verdict").innerHTML = `<div class="stamp">${head[0]}</div><div class="vtext"><h3>${esc(p.name || "Unnamed product")}</h3><p>${head[1]}</p><div class="counts">${pills}</div></div>`;

    const m = [["Batch", p.batch], ["Tested", d.dates.tested || d.dates.reported], ["Lab", d.lab.name], ["Client", d.client]];
    $("meta").innerHTML = m.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v || "Not on COA")}</dd></div>`).join("");

    // meters
    const mt = r.math;
    const inh = r.formClass === "inhalation";
    const meter = (label, val, lim, how, unitLbl, note) => {
      const na = val === null;
      const pct = na ? 0 : Math.min(100, (val / (lim * 1.5)) * 100);
      const limPct = (1 / 1.5) * 100;
      const st = na ? "na" : val > lim ? "fail" : "pass";
      return `<div class="meter" data-s="${st}"><div class="k"><span class="eyebrow">${label}</span><span class="lim">limit ${F(lim, 0)} mg</span></div>
        <div class="val">${na ? "—" : F(val, val < 100 ? 1 : 0)} <small>${unitLbl}</small></div>
        <div class="bar ${na ? "na" : val > lim ? "over" : ""}" role="img" aria-label="${label}: ${na ? "not calculable" : F(val) + " of " + lim + " mg"}"><i style="width:${pct}%"></i><b style="left:${limPct}%"></b></div>
        <div class="how2">${esc(note || how || "Needs dosage unit size or package size")}</div></div>`;
    };
    $("meters").innerHTML =
      meter("THC per dosage unit", inh ? null : mt.perUnit, 10, mt.perUnitHow, "mg", inh ? "Inhaled: set per metered dose by the prescription" : (mt.problem || null)) +
      meter(inh ? "THC per device" : "THC per package", mt.perPkg, 1000, mt.perPkgHow, "mg");

    // checks, worst first
    const order = { fail: 0, warn: 1, pass: 2, info: 3 };
    const checks = [...r.checks].sort((a, b) => order[a.status] - order[b.status]);
    $("checks").innerHTML = checks.map(c => `<li class="check" data-s="${c.status}"><span class="tag">${{ fail: "Fail", warn: "Review", pass: "Pass", info: "Note" }[c.status]}</span>
      <h4>${esc(c.title)}</h4><p>${esc(c.detail)} <cite><a href="${c.cite.url}" target="_blank" rel="noopener">${esc(c.cite.text)}</a></cite></p></li>`).join("");

    // tables
    const cRows = d.cannabinoids.map(c => {
      const k = CORE.canonCannabinoid(c.name);
      const counts = k && k.key in CORE.THC_WEIGHT;
      return `<tr><td>${esc(c.name)}${counts ? ` <span class="thcmark" title="Counted toward total THC">●</span>` : ""}</td><td class="num">${esc(c.raw ?? c.value)}</td><td class="num">${esc(c.unit || "")}</td></tr>`;
    }).join("") || `<tr><td colspan="3">No cannabinoid rows found</td></tr>`;
    const pHtml = d.panels.map(pn => {
      const rows = pn.analytes.map(a => {
        const rv = CORE.num(a.result), lv = CORE.num(a.limit);
        const bad = a.status === "fail" || (rv !== null && lv !== null && lv > 0 && rv > lv && !/^\s*</.test(String(a.result)));
        return `<tr class="${bad ? "bad" : ""}"><td>${esc(a.name)}</td><td class="num">${esc(a.result)}</td><td class="num">${esc(a.limit ?? "—")}</td><td class="num">${esc(a.unit ?? "")}</td></tr>`;
      }).join("");
      const st = pn.status === "not tested" ? "nt" : pn.status;
      return `<div><div class="ptitle">${esc(CORE.CATEGORY_LABEL[pn.category] || pn.name)} <span class="mini ${st}">${esc(pn.status)}</span></div>
        ${rows ? `<div class="tbl"><table><thead><tr><th>Analyte</th><th>Result</th><th>Limit</th><th>Unit</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}</div>`;
    }).join("");
    $("tables").innerHTML = `<div><div class="ptitle">Cannabinoids <span class="sub"><span class="thcmark">●</span> counted toward total THC</span></div>
      <div class="tbl"><table><thead><tr><th>Cannabinoid</th><th>Result</th><th>Unit</th></tr></thead><tbody>${cRows}</tbody></table></div></div>${pHtml || "<p class='status'>No contaminant panels found.</p>"}`;
  }

  async function copyFindings() {
    const d = state.data, r = state.result;
    const lines = [
      `TCUP COA check: ${d.product.name || "Unnamed product"} (batch ${d.product.batch || "n/a"})`,
      `Verdict: ${{ hold: "HOLD", review: "NEEDS REVIEW", clear: "CLEAR" }[r.verdict]}`,
      `THC per dosage unit: ${r.formClass === "inhalation" ? "set by prescription (inhaled)" : r.math.perUnit === null ? "not calculable" : F(r.math.perUnit) + " mg (limit 10 mg)"}`,
      `THC per package: ${r.math.perPkg === null ? "not calculable" : F(r.math.perPkg, 0) + " mg (limit 1,000 mg)"}`,
      "",
      ...[...r.checks].filter(c => c.status !== "pass").map(c => `[${c.status.toUpperCase()}] ${c.title}. ${c.detail} (${c.cite.text})`),
      "",
      `${r.counts.pass} checks passed. Source: ${state.source}.`,
    ];
    const text = lines.join("\n");
    try { await navigator.clipboard.writeText(text); $("copyMsg").textContent = "Copied"; }
    catch {
      const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.append(ta); ta.select();
      try { document.execCommand("copy"); $("copyMsg").textContent = "Copied"; } catch { $("copyMsg").textContent = "Copy failed. Select the report text instead."; }
      ta.remove();
    }
    setTimeout(() => { $("copyMsg").textContent = ""; }, 2500);
  }

  loadSample("gummy");
})();
