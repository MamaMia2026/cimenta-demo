/* Cimenta – calculator de beton (machetă demo) */
const WHATSAPP_NUMBER = "40700000000"; // număr de exemplu, format internațional fără „+”

(function () {
  "use strict";

  // [clasă, preț lei/m³, recomandare]
  const CL = [
    ["C8/10", 310, "Egalizări, umpluturi, beton de curățenie"],
    ["C12/15", 335, "Fundații pentru garduri, alei"],
    ["C16/20", 360, "Fundații de case, plăci pe sol"],
    ["C20/25", 385, "Fundații, plăci, stâlpi – cel mai cerut"],
    ["C25/30", 410, "Planșee, grinzi, stâlpi, structuri"],
    ["C30/37", 445, "Structuri solicitate, platforme industriale"],
    ["Șapă M10", 290, "Șape, pardoseli interioare"]
  ];
  // [localitate, km de Timișoara]
  const LOC = [
    ["Timișoara", 8], ["Dumbrăvița", 9], ["Ghiroda", 8], ["Giroc", 10], ["Moșnița Nouă", 12],
    ["Sânandrei", 14], ["Săcălaz", 15], ["Remetea Mare", 16], ["Recaș", 26], ["Buziaș", 36],
    ["Jimbolia", 42], ["Deta", 47], ["Arad", 56], ["Lugoj", 64], ["Sânnicolau Mare", 68]
  ];
  // [cheie, etichetă, unitate, valoare implicită]
  const F = {
    placa: [["L", "Lungime", "m", 10], ["W", "Lățime", "m", 8], ["H", "Grosime", "cm", 15]],
    fund: [["P", "Lungime totală (perimetru)", "m", 40], ["W", "Lățime", "cm", 40], ["H", "Adâncime", "cm", 80]],
    stalp: [["D", "Diametru", "cm", 30], ["H", "Înălțime", "m", 3], ["N", "Bucăți", "buc", 6]],
    grinda: [["A", "Latura A", "cm", 25], ["B", "Latura B", "cm", 30], ["H", "Lungime / înălțime", "m", 3], ["N", "Bucăți", "buc", 8]],
    sapa: [["S", "Suprafață", "m²", 80], ["H", "Grosime", "cm", 5]],
    m3: [["V", "Cantitate", "m³", 6]]
  };
  const TRUCK = 8, FREE_KM = 10, KM = 6, POMPA = 650, POMPA_M3 = 12;

  let shape = "placa";
  let last = null; // ultimul rezultat, folosit în mesajul WhatsApp
  const $ = (id) => document.getElementById(id);
  // format ro-RO (1.234,56) fără Intl: inițializarea Intl costă ~100 ms pe mobil
  const fmt = (n, d = 0) => {
    const [i, f] = (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).split(".");
    return i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (f ? "," + f : "");
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function fields() {
    $("fields").innerHTML = F[shape].map((f) =>
      `<label class="c-f"><span>${f[1]}</span><div><input type="number" min="0" step="any" inputmode="decimal" data-k="${f[0]}" value="${f[3]}" aria-label="${f[1]} (${f[2]})"><em aria-hidden="true">${f[2]}</em></div></label>`
    ).join("");
    $("fields").querySelectorAll("input").forEach((i) => (i.oninput = calc));
  }

  function v(k) {
    const e = $("fields").querySelector(`[data-k="${k}"]`);
    return e ? Math.max(0, parseFloat(e.value) || 0) : 0;
  }

  let liveTimer;
  function calc() {
    let m = 0;
    if (shape === "placa") m = v("L") * v("W") * v("H") / 100;
    if (shape === "fund") m = v("P") * v("W") / 100 * v("H") / 100;
    if (shape === "stalp") m = Math.PI * Math.pow(v("D") / 200, 2) * v("H") * v("N");
    if (shape === "grinda") m = v("A") / 100 * v("B") / 100 * v("H") * v("N");
    if (shape === "sapa") m = v("S") * v("H") / 100;
    if (shape === "m3") m = v("V");
    if ($("pierderi").checked && shape !== "m3") m *= 1.05;
    m = Math.round(m * 100) / 100;

    const c = CL[+$("clasa").value];
    const km = Math.max(0, +$("km").value || 0);
    const tr = Math.max(1, Math.ceil(m / TRUCK));
    const beton = m * c[1];
    const transp = m > 0 ? Math.max(0, km - FREE_KM) * KM * tr : 0;
    const pompa = $("pompa").checked && m > 0 ? POMPA + m * POMPA_M3 : 0;
    const total = beton + transp + pompa;

    $("vol").textContent = fmt(m, 2);
    $("clasaHint").textContent = c[2];
    $("trucks").innerHTML = m > 0
      ? Array.from({ length: Math.min(tr, 8) }, (_, i) => `<span class="tk ${i === tr - 1 && m % TRUCK && m % TRUCK < TRUCK ? "half" : ""}" aria-hidden="true"></span>`).join("") +
        `<b>${tr} ${tr === 1 ? "autobetonieră" : "autobetoniere"}</b> <i>· ${TRUCK} m³ fiecare</i>`
      : "";
    $("lClasa").textContent = `${c[0]} · ${fmt(m, 2)} m³`;
    $("lTransp").textContent = km <= FREE_KM ? "· gratuit sub " + FREE_KM + " km" : `· ${km} km × ${tr} curse`;
    $("pBeton").textContent = fmt(beton) + " lei";
    $("pTransp").textContent = transp ? fmt(transp) + " lei" : "0 lei";
    $("rPompa").style.display = pompa ? "" : "none";
    $("pPompa").textContent = fmt(pompa) + " lei";
    $("pTot").textContent = fmt(total) + " lei";

    last = { m, clasa: c[0], km, tr, beton, transp, pompa, total, pierderi: $("pierderi").checked };

    // anunț pentru cititoare de ecran, cu întârziere ca să nu „vorbească” la fiecare tastă
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      $("live").textContent = `Necesar ${fmt(m, 2)} metri cubi, total estimat ${fmt(total)} lei fără TVA.`;
    }, 700);
  }

  $("shapes").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    shape = b.dataset.s;
    $("shapes").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    fields();
    calc();
  });
  $("loc").addEventListener("change", () => {
    if ($("loc").value !== "x") $("km").value = $("loc").value;
    else $("km").focus();
    calc();
  });
  ["km", "clasa", "pompa", "pierderi"].forEach((id) => $(id).addEventListener("input", calc));
  ["pompa", "pierderi", "clasa"].forEach((id) => $(id).addEventListener("change", calc));
  $("calcForm").addEventListener("submit", (e) => e.preventDefault());

  /* ---------- Cerere ofertă → WhatsApp ---------- */
  const dlg = $("offer"), form = $("offerForm");
  let opener = null;

  function locName() {
    const o = $("loc").selectedOptions[0];
    return o && o.value !== "x" && +o.value === last.km ? o.textContent.split(" · ")[0] : "";
  }

  function summary() {
    const loc = locName();
    return `Volum: <b>${fmt(last.m, 2)} m³</b> · Clasa: <b>${esc(last.clasa)}</b><br>` +
      `Distanță: <b>${last.km} km</b>${loc ? " (" + esc(loc) + ")" : ""} · ${last.tr} ${last.tr === 1 ? "cursă" : "curse"}` +
      `${last.pompa ? " · cu pompă" : ""}<br>Total estimat: <b>${fmt(last.total)} lei</b> (fără TVA)`;
  }

  function openOffer() {
    calc();
    opener = document.activeElement;
    $("offerSum").innerHTML = summary();
    $("offerErr").textContent = "";
    const d = new Date(); d.setDate(d.getDate() + 1);
    $("fData").min = d.toISOString().slice(0, 10);
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    $("fNume").focus();
  }
  function closeOffer() {
    if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open");
  }
  dlg.addEventListener("close", () => { if (opener) opener.focus(); });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) closeOffer(); }); // click pe fundal
  $("offerClose").addEventListener("click", closeOffer);
  $("cta").addEventListener("click", openOffer);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      const bad = form.querySelector(":invalid");
      const name = bad.closest("label").firstChild.textContent.trim();
      $("offerErr").textContent = bad.validity.valueMissing
        ? `Completează câmpul „${name}”.`
        : `Verifică câmpul „${name}”.`;
      bad.focus();
      return;
    }
    const data = new Date($("fData").value + "T12:00:00").toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });
    const loc = locName();
    const lines = [
      "Bună ziua! Aș dori o ofertă fermă pentru beton:",
      "",
      `• Volum: ${fmt(last.m, 2)} m³${last.pierderi && shape !== "m3" ? " (inclusiv +5% pierderi)" : ""}`,
      `• Clasa: ${last.clasa}`,
      `• Distanță: ${last.km} km de Timișoara${loc ? " (" + loc + ")" : ""}, ${last.tr} ${last.tr === 1 ? "cursă" : "curse"}`,
      `• Pompă: ${last.pompa ? "da" : "nu"}`,
      `• Total estimat din calculator: ${fmt(last.total)} lei (fără TVA)`,
      "",
      `Nume: ${$("fNume").value.trim()}`,
      `Telefon: ${$("fTel").value.trim()}`,
      `Adresa șantierului: ${$("fAdresa").value.trim()}`,
      `Data turnării: ${data}`
    ];
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener");
    closeOffer();
  });

  /* ---------- Pornire ---------- */
  // Calculatorul e sub fold: îl construim abia când se apropie de ecran,
  // ca să nu blocăm firul principal la încărcarea paginii (Lighthouse TBT).
  let ready = false;
  function init() {
    if (ready) return;
    ready = true;
    $("clasa").innerHTML = CL.map((c, i) => `<option value="${i}"${i === 3 ? " selected" : ""}>${c[0]} · ${c[1]} lei/m³</option>`).join("");
    $("loc").innerHTML = LOC.map((l) => `<option value="${l[1]}">${l[0]} · ~${l[1]} km</option>`).join("") + `<option value="x">Altă localitate…</option>`;
    fields();
    calc();
  }
  const section = $("calculator");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); init(); }
    }, { rootMargin: "150px 0px" });
    io.observe(section);
    section.addEventListener("focusin", init, { once: true });
  } else {
    init();
  }
})();
