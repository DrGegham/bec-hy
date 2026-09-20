(function () {
"use strict";
var D = window.BEC_DATA, U = D.ui, PAGES = D.pages, CATS = D.cats, KEY = D.storageKey;
var BY = {}; PAGES.forEach(function (p) { BY[p.id] = p; });
var ORDER = D.catOrder.filter(function (c) { return PAGES.some(function (p) { return p.cat === c; }); });
var LIST = {};
ORDER.forEach(function (c) {
  LIST[c] = PAGES.filter(function (p) { return p.cat === c; })
    .sort(function (a, b) { return a.title.localeCompare(b.title, "hy", { sensitivity: "base" }); });
});

/* ---------- storage (never fails, even if the browser blocks it) ---------- */
var mem = {};
function sGet(k, d) { k = KEY + k; try { var v = localStorage.getItem(k); return v == null ? (k in mem ? mem[k] : d) : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } }
function sSet(k, v) { k = KEY + k; mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

/* ---------- helpers ---------- */
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k]; }); }
function fold(s) { return s.toLowerCase().replace(/\u0587/g, "\u0565\u0582").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function $(id) { return document.getElementById(id); }
var I = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/></svg>'
};
var app = $("app");
var SIZES = [16, 18, 20, 22, 25];
function applySize() { var i = sGet("size", 1); if (i < 0 || i >= SIZES.length) i = 1; document.documentElement.style.setProperty("--fs", SIZES[i] + "px"); }

/* ---------- chrome ---------- */
function shell(o) {
  var left = o.back
    ? '<button class="ib" id="back" aria-label="' + esc(U.back) + '">' + I.back + "</button>"
    : '<svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><path d="M26 10h12v16h16v12H38v16H26V38H10V26h16z"/></svg>';
  var right = (o.noSearch ? "" : '<a class="ib" href="#/search" aria-label="' + esc(U.searchAria) + '">' + I.search + "</a>") +
              (o.noAbout ? "" : '<a class="ib" href="#/about" aria-label="' + esc(U.aboutAria) + '">' + I.info + "</a>");
  return '<header class="bar"><div class="bar-in">' + left + "<h1>" + esc(o.title) + "</h1>" + right + "</div></header>";
}

/* ---------- views ---------- */
function rows(ids) {
  return '<div class="rows">' + ids.map(function (id) {
    var p = BY[id];
    return '<a class="row cat-' + p.cat + '" href="#/p/' + p.id + '"><span class="dot"></span><span class="tt">' + esc(p.title) + '<span class="sub">' + esc(CATS[p.cat].one) + "</span></span>" + I.chev + "</a>";
  }).join("") + "</div>";
}
function home() {
  var recent = (sGet("recent", []) || []).filter(function (id) { return BY[id]; }).slice(0, 6);
  var saved = (sGet("saved", []) || []).filter(function (id) { return BY[id]; });
  var h = shell({ title: U.barTitle, noSearch: true }) + "<main>";
  h += '<p class="lead"><b>' + esc(U.appTitle) + "</b>" + esc(U.tagline) + "</p>";
  h += '<a class="searchbtn" href="#/search">' + I.search + "<span>" + esc(U.searchPlaceholder) + "</span></a>";
  h += '<h2 class="sec">' + esc(U.browse) + '</h2><div class="cats">';
  ORDER.forEach(function (c) {
    h += '<a class="catcard cat-' + c + '" href="#/list/' + c + '"><div><div class="t">' + esc(CATS[c].label) + '</div><div class="d">' + esc(CATS[c].desc) + '</div></div><span class="n">' + LIST[c].length + "</span>" + I.chev + "</a>";
  });
  h += "</div>";
  if (U.pilotNote) h += '<p class="pilot">' + esc(U.pilotNote) + "</p>";
  if (saved.length) h += '<h2 class="sec">' + esc(U.saved) + "</h2>" + rows(saved);
  if (recent.length) h += '<h2 class="sec">' + esc(U.recent) + "</h2>" + rows(recent);
  h += '<div class="foot"><p>' + esc(U.footHome) + ' <a href="#/about">' + esc(U.footAbout) + "</a></p></div></main>";
  return h;
}
function list(cat) {
  var c = CATS[cat]; if (!c || !LIST[cat]) return notFound();
  var h = '<div class="cat-' + cat + '">' + shell({ title: c.label, back: true }) + '<div class="band"></div><main>';
  h += '<div class="listhead"><h2>' + esc(c.label) + "</h2><p>" + esc(fmt(U.pagesCount, { n: LIST[cat].length })) + " " + esc(c.desc) + ".</p></div>";
  if (LIST[cat].length > 12) h += '<input class="filter" id="filter" type="search" placeholder="' + esc(U.filterPlaceholder) + '" aria-label="' + esc(U.filterPlaceholder) + '" autocomplete="off">';
  h += '<div class="rows" id="rows">' + LIST[cat].map(function (p) {
    return '<a class="row" href="#/p/' + p.id + '" data-t="' + esc(fold(p.title)) + '"><span class="dot"></span><span class="tt">' + esc(p.title) + "</span>" + I.chev + "</a>";
  }).join("") + '</div><div class="empty" id="none" hidden>' + esc(U.noMatch) + "</div></main></div>";
  return h;
}
function page(id, anchor) {
  var p = BY[id]; if (!p) return notFound();
  var saved = (sGet("saved", []) || []).indexOf(id) > -1;
  var h = '<div class="cat-' + p.cat + '">' + shell({ title: p.title, back: true }) + "<main>";
  h += '<div class="ph"><span class="chip">' + esc(CATS[p.cat].one) + "</span><h2>" + esc(p.title) + "</h2>";
  h += '<div class="tools"><button class="tb" id="save" aria-pressed="' + saved + '">' + I.star + "<span>" + esc(saved ? U.savedBtn : U.save) + "</span></button>";
  h += '<button class="tb" id="smaller" aria-label="' + esc(U.smaller) + '">A\u2212</button><button class="tb" id="larger" aria-label="' + esc(U.larger) + '">A+</button></div></div>';
  h += '<article class="doc">' + p.html + "</article>";
  h += '<div class="foot"><p>' + esc(U.footPage) + ' <a href="#/about">' + esc(U.footAbout) + "</a></p></div></main></div>";
  return h;
}
function about() {
  var h = shell({ title: U.aboutTitle, back: true, noAbout: true, noSearch: true }) + '<main><div class="about">';
  D.about.forEach(function (s) {
    h += "<h2>" + esc(s.h) + "</h2>";
    s.p.forEach(function (t) { h += "<p" + (s.plain ? ' class="plain"' : "") + ">" + esc(t) + "</p>"; });
  });
  h += '<p class="ver">' + esc(U.version) + " " + esc(D.version) + "</p></div></main>";
  return h;
}
function search(q) {
  return shell({ title: U.searchTitle, back: true, noSearch: true }) + '<main><div class="sbox"><input id="q" type="search" placeholder="' + esc(U.searchPlaceholder) + '" aria-label="' + esc(U.searchAria) + '" autocomplete="off" autocapitalize="off" spellcheck="false" value="' + esc(q || "") + '"></div><div class="res" id="res"></div></main>';
}
function notFound() { return shell({ title: U.notFoundTitle, back: true }) + '<main><p class="empty">' + esc(U.notFound) + '</p><p><a href="#/">' + esc(U.home) + "</a></p></main>"; }

/* ---------- search ---------- */
var INDEX = PAGES.map(function (p) { return { p: p, t: fold(p.title), k: fold(p.keywords || ""), x: fold(p.text) }; });
function termRe(w) { return new RegExp(w.replace(/\u0565\u0582/g, "(?:\u0565\u0582|\u0587)"), "ig"); }
function highlight(seg, res) {
  var spans = [];
  res.forEach(function (re) { re.lastIndex = 0; var m; while ((m = re.exec(seg))) { spans.push([m.index, m.index + m[0].length]); if (m[0].length === 0) re.lastIndex++; } });
  spans.sort(function (a, b) { return a[0] - b[0]; });
  var out = "", pos = 0;
  spans.forEach(function (sp) { if (sp[0] < pos) return; out += esc(seg.slice(pos, sp[0])) + "<mark>" + esc(seg.slice(sp[0], sp[1])) + "</mark>"; pos = sp[1]; });
  return out + esc(seg.slice(pos));
}
function runSearch(q) {
  var out = $("res"); if (!out) return;
  var terms = fold(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!terms.length) { out.innerHTML = '<p class="empty">' + esc(U.searchEmpty) + "</p>"; return; }
  var hits = [];
  INDEX.forEach(function (e) {
    var s = 0, ok = true;
    for (var i = 0; i < terms.length; i++) {
      var w = terms[i], inT = e.t.indexOf(w), inK = e.k.indexOf(w), inX = e.x.indexOf(w);
      if (inT < 0 && inK < 0 && inX < 0) { ok = false; break; }
      if (inT >= 0) { s += 10; if (inT === 0 || /[^\p{L}\p{N}]/u.test(e.t.charAt(inT - 1))) s += 5; }
      if (inK >= 0) s += 8;
      if (inX >= 0) { var c = 0, pos = inX; while (pos >= 0 && c < 6) { c++; pos = e.x.indexOf(w, pos + 1); } s += 2 + c * 0.5; }
    }
    if (ok) hits.push({ e: e, s: s });
  });
  hits.sort(function (a, b) { return b.s - a.s; });
  if (!hits.length) { out.innerHTML = '<p class="empty">' + esc(fmt(U.searchNone, { q: q })) + "</p>"; return; }
  var res = terms.map(termRe);
  var html = '<div class="rows">' + hits.slice(0, 40).map(function (h) {
    var p = h.e.p, raw = p.text, sn = "", first = -1;
    for (var i = 0; i < res.length; i++) { res[i].lastIndex = 0; var m = res[i].exec(raw); if (m && (first < 0 || m.index < first)) first = m.index; }
    if (first >= 0) { var start = Math.max(0, first - 55), seg = raw.substr(start, 150); sn = (start > 0 ? "\u2026 " : "") + highlight(seg, res) + (start + 150 < raw.length ? " \u2026" : ""); }
    return '<a class="row cat-' + p.cat + '" href="#/p/' + p.id + '"><span class="dot"></span><span class="tt">' + esc(p.title) + '<span class="chip">' + esc(CATS[p.cat].one) + "</span>" + (sn ? '<span class="sn">' + sn + "</span>" : "") + "</span></a>";
  }).join("") + "</div>";
  if (hits.length > 40) html += '<p class="empty">' + esc(fmt(U.searchMore, { n: hits.length })) + "</p>";
  out.innerHTML = html;
}

/* ---------- router ---------- */
var stack = [], scrolls = {}, current = "";
function render() {
  var h = location.hash.replace(/^#/, "") || "/", a = h.split("/").filter(Boolean);
  if (stack.length > 1 && stack[stack.length - 2] === h) { scrolls[stack[stack.length - 1]] = window.scrollY; stack.pop(); }
  else if (stack[stack.length - 1] !== h) { if (current) scrolls[current] = window.scrollY; stack.push(h); }
  current = h;
  var view = "home", html = "", after = null;
  if (!a.length) html = home();
  else if (a[0] === "list") { view = "list"; html = list(a[1]); after = wireList; }
  else if (a[0] === "p") {
    view = "page"; var id = a[1]; html = page(id, a[2]); after = function () { wirePage(id); };
    if (BY[id]) { var rec = (sGet("recent", []) || []).filter(function (x) { return x !== id; }); rec.unshift(id); sSet("recent", rec.slice(0, 8)); }
  }
  else if (a[0] === "search") { view = "search"; html = search(""); after = wireSearch; }
  else if (a[0] === "about") { view = "about"; html = about(); }
  else html = notFound();
  document.body.className = "view-" + view;
  app.innerHTML = html;
  var b = $("back"); if (b) b.addEventListener("click", goBack);
  if (after) after();
  if (view === "page" && a[2]) { var el = document.getElementById(a[2]); if (el) { el.scrollIntoView(); return; } }
  window.scrollTo(0, scrolls[h] || 0);
}
function goBack() { if (stack.length > 1) history.back(); else location.hash = "#/"; }
window.addEventListener("hashchange", render);

/* ---------- wiring ---------- */
function wireList() {
  var f = $("filter"); if (!f) return;
  f.addEventListener("input", function () {
    var q = fold(f.value.trim()), n = 0;
    Array.prototype.forEach.call(document.querySelectorAll("#rows .row"), function (r) {
      var show = !q || r.getAttribute("data-t").indexOf(q) > -1; r.style.display = show ? "" : "none"; if (show) n++;
    });
    $("none").hidden = n > 0;
  });
}
function wireSearch() {
  var q = $("q"); q.focus(); var t;
  q.addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { runSearch(q.value); }, 120); });
  runSearch("");
}
function wirePage(id) {
  Array.prototype.forEach.call(document.querySelectorAll("img.fig"), function (im) { im.addEventListener("click", function () { zoom(im.src); }); });
  var s = $("save");
  s.addEventListener("click", function () {
    var l = (sGet("saved", []) || []).slice(), i = l.indexOf(id);
    if (i > -1) l.splice(i, 1); else l.unshift(id);
    sSet("saved", l); var on = l.indexOf(id) > -1;
    s.setAttribute("aria-pressed", on); s.querySelector("span").textContent = on ? U.savedBtn : U.save;
  });
  $("smaller").addEventListener("click", function () { sSet("size", Math.max(0, sGet("size", 1) - 1)); applySize(); });
  $("larger").addEventListener("click", function () { sSet("size", Math.min(SIZES.length - 1, sGet("size", 1) + 1)); applySize(); });
}
function zoom(src) { $("zimg").src = src; $("zoom").classList.add("on"); }
$("zclose").addEventListener("click", function () { $("zoom").classList.remove("on"); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape") $("zoom").classList.remove("on"); });

/* ---------- offline support and safe updates ---------- */
function showUpdate(worker) {
  if ($("upd")) return;
  var d = document.createElement("div"); d.className = "upd"; d.id = "upd"; d.setAttribute("role", "status");
  d.innerHTML = "<span>" + esc(U.updateAvail) + '</span><button type="button">' + esc(U.updateBtn) + "</button>";
  d.querySelector("button").addEventListener("click", function () { window.__becUpdating = true; worker.postMessage({ type: "SKIP_WAITING" }); });
  document.body.appendChild(d);
}
if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./service-worker.js").then(function (reg) {
      if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
      reg.addEventListener("updatefound", function () {
        var nw = reg.installing; if (!nw) return;
        nw.addEventListener("statechange", function () { if (nw.state === "installed" && navigator.serviceWorker.controller) showUpdate(nw); });
      });
    }).catch(function (e) { console.error("Service worker registration failed:", e); });
    var done = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () { if (window.__becUpdating && !done) { done = true; location.reload(); } });
  });
}

applySize();
render();
})();
