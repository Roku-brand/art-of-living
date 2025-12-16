// ========== 設定 ==========
const OS_META = [
  { key: "life",     title: "人生OS", desc: "入口。全体像を掴む。", file: "./data/life.json" },
  { key: "internal", title: "心の扱い方｜内部OS", desc: "感情・思考・自己調整。", file: "./data/internal.json" },
  { key: "relation", title: "コミュニケーションの極意｜対人OS", desc: "距離感・交渉・信頼。", file: "./data/relation.json" },
  { key: "social",   title: "社会での立ち回り｜社会OS", desc: "組織・政治・意思決定。", file: "./data/social.json" },
  { key: "action",   title: "行動・習慣の技術｜行動OS", desc: "実行・習慣化・継続。", file: "./data/action.json" },
  { key: "future",   title: "未来への対応策｜未来OS", desc: "AI時代の備え。", file: "./data/future.json" },
  { key: "extra",    title: "追加OS（仮）", desc: "調整枠・実験枠。", file: "./data/extra.json" }
];

const LS_FAV = "shoseijutsu:favorites";
const LS_PERSONAL = "shoseijutsu:personalCards";

// ========== ユーティリティ ==========
const $ = (sel) => document.querySelector(sel);

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));

function readJSONSafe(text){
  try { return JSON.parse(text); } catch { return null; }
}

function loadFavorites(){
  return new Set(readJSONSafe(localStorage.getItem(LS_FAV)) ?? []);
}
function saveFavorites(set){
  localStorage.setItem(LS_FAV, JSON.stringify([...set]));
}

function loadPersonalCards(){
  return readJSONSafe(localStorage.getItem(LS_PERSONAL)) ?? [];
}
function savePersonalCards(cards){
  localStorage.setItem(LS_PERSONAL, JSON.stringify(cards));
}

function parseQuery(qs){
  const out = {};
  (qs || "").replace(/^\?/, "").split("&").filter(Boolean).forEach(kv=>{
    const [k,v] = kv.split("=");
    out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  });
  return out;
}

function nav(hash){
  location.hash = hash;
}

/**
 * 文字列/配列/その他を bullets に統一（内部OSの配列でも落ちない）
 */
function splitToBullets(text){
  if (text == null) return [];
  if (Array.isArray(text)) return text.map(v => String(v).trim()).filter(Boolean);
  if (typeof text !== "string") text = String(text);
  const t = text.trim();
  if (!t) return [];
  const lines = t.split(/\n+/).map(x => x.replace(/^\s*[・\-]\s*/,"").trim()).filter(Boolean);
  return lines.length ? lines : [t];
}

/**
 * データ揺れ吸収：内部OS pitfall(単数) 等
 */
function normalizeCard(c){
  if (!c || typeof c !== "object") return c;
  const out = { ...c };
  if (out.pitfalls == null && out.pitfall != null) out.pitfalls = out.pitfall;
  return out;
}

// ========== データ読み込み ==========
let DATA = { byOS: {}, all: [] };

async function fetchOS(osKey){
  const meta = OS_META.find(x => x.key === osKey);
  if (!meta) return [];
  try {
    const res = await fetch(meta.file, { cache: "no-store" });
    if (!res.ok) throw new Error(`${meta.file} ${res.status}`);
    const json = await res.json();
    const arr = Array.isArray(json) ? json : [];
    return arr.map(normalizeCard);
  } catch (e) {
    console.error("fetchOS error:", e);
    return [];
  }
}

async function loadAll(){
  const personal = loadPersonalCards();
  const results = await Promise.all(OS_META.map(m => fetchOS(m.key)));
  OS_META.forEach((m, i) => { DATA.byOS[m.key] = results[i]; });

  // personal を extra に混ぜる
  const mergedExtra = [
    ...(DATA.byOS.extra ?? []),
    ...personal.map(x => normalizeCard({ ...x, os: "extra" }))
  ];
  DATA.byOS.extra = mergedExtra;

  DATA.all = OS_META.flatMap(m => (DATA.byOS[m.key] ?? []));
}

// ========== UI シェル ==========
function renderShell(activeTab){
  const app = $("#app");
  app.innerHTML = `
    <div class="header">
      <div class="header-inner">
        <div class="brand">
          <h1>処世術禄</h1>
          <small>Shoseijutsu OS</small>
        </div>

        <div class="header-actions">
          <button class="btn ghost ${activeTab==="top"?"active":""}" id="btnTop">トップ</button>
          <button class="btn ghost ${activeTab==="list"?"active":""}" id="btnList">処世術一覧</button>
          <button class="btn ghost ${activeTab==="my"?"active":""}" id="btnMy">マイページ</button>
        </div>
      </div>
    </div>

    <div class="container" id="view"></div>
  `;

  $("#btnTop").onclick  = ()=> nav("#home");
  $("#btnList").onclick = ()=> nav("#list?os=life");
  $("#btnMy").onclick   = ()=> nav("#my");
}

// ========== 画面：トップ ==========
function renderHome(){
  renderShell("top");
  const view = $("#view");

  const copy = `情報の洪水に終止符。これが決定版。
自己啓発・心理学・行動科学・対人術・キャリア論などを 5つのOS・195の項目 に集約した「処世術の体系書」`;

  view.innerHTML = `
    <div class="card section" style="padding:14px;">
      <div style="font-size:18px; font-weight:800; margin-bottom:8px;">処世術禄</div>
      <p class="hero-copy" style="margin:0; white-space:pre-line;">${escapeHtml(copy)}</p>

      <div class="row" style="margin-top:12px;">
        <button class="btn primary" id="goList">処世術一覧へ</button>
        <span class="subtle">7つのOS・200項目（目標値として固定表示）</span>
      </div>
    </div>

    <div class="card section" style="padding:14px;">
      <div class="os-select-title">OSを選択</div>
      <div class="os-select-grid">
        ${OS_META.map(m => `
          <div class="card os-mini" data-os="${m.key}">
            <h3>${escapeHtml(m.title)}</h3>
            <p>${escapeHtml(m.desc)}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  $("#goList").onclick = ()=> nav("#list?os=life");
  view.querySelectorAll("[data-os]").forEach(el=>{
    el.onclick = ()=> nav(`#list?os=${el.getAttribute("data-os")}`);
  });
}

// ========== 一覧 ==========
function buildTagSet(cards){
  const set = new Set();
  cards.forEach(c => (c.tags||[]).forEach(t => set.add(t)));
  return [...set].sort((a,b)=>a.localeCompare(b, "ja"));
}
function sortById(cards){
  return [...cards].sort((a,b)=> String(a.id).localeCompare(String(b.id)));
}

function renderList(osKey){
  renderShell("list");
  const view = $("#view");

  const currentOS = OS_META.find(m => m.key === osKey) ? osKey : "life";
  const meta = OS_META.find(m=>m.key===currentOS);

  const allCards = sortById(DATA.byOS[currentOS] ?? []);
  const tags = buildTagSet(allCards);

  const state = {
    tag: "",
    expandedId: ""
  };

  // ここで「hero」を消し、右サイドバーにOSを出す
  view.innerHTML = `
    <div class="list-layout">
      <div class="list-main">
        <div class="card section list-toolbar">
          <div class="tagbar" id="tagbar">
            <button class="tagbtn active" data-tag="">すべて</button>
            ${tags.map(t=>`<button class="tagbtn" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("")}
          </div>
        </div>

        <div class="cards-grid" id="cards"></div>
      </div>

      <aside class="list-side">
        <div class="card side-card">
          <div class="side-head">
            <div class="side-os">${escapeHtml(meta?.title ?? "人生OS")}</div>
            <div class="side-count">件数：<span id="countAll">${allCards.length}</span> 件</div>
          </div>

          <div class="side-tabs" id="osbar">
            ${OS_META.map(m => `
              <button class="oschip sidechip ${m.key===currentOS ? "active" : ""}" data-os="${m.key}">
                ${escapeHtml(m.title)}
              </button>
            `).join("")}
          </div>
        </div>
      </aside>
    </div>
  `;

  // OS切替（右サイド）
  $("#osbar").querySelectorAll("[data-os]").forEach(b=>{
    b.onclick = ()=> nav(`#list?os=${b.getAttribute("data-os")}`);
  });

  const draw = ()=>{
    let cards = allCards;
    if (state.tag) cards = cards.filter(c => (c.tags||[]).includes(state.tag));

    $("#countAll").textContent = String(cards.length);

    const fav = loadFavorites();

    $("#cards").innerHTML = cards.map(c=>{
      const isOpen = c.id === state.expandedId;
      const isFav = fav.has(c.id);

      const essenceBullets = splitToBullets(c.essence);
      const pitfallsBullets = splitToBullets(c.pitfalls);
      const strategyBullets = splitToBullets(c.strategy);

      return `
        <div class="card scard">
          <div class="scard-top scard-click" data-toggle="${escapeHtml(c.id)}">
            <div class="scard-icon">🧠</div>

            <div class="scard-head">
              <h3 class="scard-title">${escapeHtml(c.title)}</h3>
              <p class="scard-summary">${escapeHtml(c.summary)}</p>

              <div class="scard-meta">
                <span class="scard-id">${escapeHtml(c.id)}</span>
              </div>
            </div>

            <div class="scard-side">
              <div class="favmini" data-fav="${escapeHtml(c.id)}" title="お気に入り">
                <span>${isFav ? "★" : "☆"}</span>
                <span class="count">0</span>
              </div>
            </div>
          </div>

          ${isOpen ? `
            <div class="scard-expand">
              <h4>本質・要点</h4>
              <ul>${essenceBullets.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>

              <h4>やがてな落とし穴</h4>
              <ul>${pitfallsBullets.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>

              <h4>二周目視点の戦略</h4>
              <ul>${strategyBullets.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
            </div>
          ` : ``}

          <div class="scard-tags">
            ${(c.tags||[]).map(t=>`
              <span class="tagchip" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>
            `).join("")}
          </div>
        </div>
      `;
    }).join("") || `<div class="card" style="padding:14px; color:var(--muted);">該当するカードがありません。</div>`;

    // タグチップクリック → 上部タグボタンと同期
    $("#cards").querySelectorAll("[data-tag]").forEach(el=>{
      el.onclick = (e)=>{
        e.stopPropagation();
        const t = el.getAttribute("data-tag");
        state.tag = (state.tag === t) ? "" : t;
        $("#tagbar").querySelectorAll("[data-tag]").forEach(b=>{
          b.classList.toggle("active", b.getAttribute("data-tag") === state.tag);
        });
        draw();
      };
    });

    // 展開
    $("#cards").querySelectorAll("[data-toggle]").forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute("data-toggle");
        state.expandedId = (state.expandedId === id) ? "" : id;
        draw();
      };
    });

    // お気に入り
    $("#cards").querySelectorAll("[data-fav]").forEach(el=>{
      el.onclick = (e)=>{
        e.stopPropagation();
        const id = el.getAttribute("data-fav");
        const set = loadFavorites();
        if (set.has(id)) set.delete(id); else set.add(id);
        saveFavorites(set);
        draw();
      };
    });
  };

  // 上部タグボタン
  $("#tagbar").querySelectorAll("[data-tag]").forEach(b=>{
    b.onclick = ()=>{
      state.tag = b.getAttribute("data-tag");
      $("#tagbar").querySelectorAll("[data-tag]").forEach(x=>{
        x.classList.toggle("active", x === b);
      });
      draw();
    };
  });

  draw();
}

// ========== 詳細 ==========
function findCardById(id){
  return DATA.all.find(c => c.id === id);
}
function renderDetail(id){
  renderShell("list");
  const view = $("#view");
  const card = normalizeCard(findCardById(id));

  if (!card) {
    view.innerHTML = `<div class="card detail">カードが見つかりません：${escapeHtml(id)}</div>`;
    return;
  }

  const osTitle = (OS_META.find(m=>m.key===card.os)?.title) ?? card.os;
  const fav = loadFavorites();
  const isFav = fav.has(card.id);

  const essenceBullets = splitToBullets(card.essence);
  const pitfallsBullets = splitToBullets(card.pitfalls);
  const strategyBullets = splitToBullets(card.strategy);

  view.innerHTML = `
    <div class="card detail">
      <div class="row">
        <div>
          <h2>${escapeHtml(card.title)}</h2>
          <div class="meta">
            <span class="badge id">${escapeHtml(card.id)}</span>
            <span class="badge">${escapeHtml(osTitle)}</span>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn" id="backToList">一覧へ</button>
          <button class="btn primary" id="favBtn">${isFav ? "★ お気に入り" : "☆ お気に入り"}</button>
        </div>
      </div>

      <div class="kv"><h3>要約</h3><p>${escapeHtml(card.summary)}</p></div>

      <div class="kv">
        <h3>本質</h3>
        <ul>${essenceBullets.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>

      <div class="kv">
        <h3>落とし穴</h3>
        <ul>${pitfallsBullets.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>

      <div class="kv">
        <h3>戦略</h3>
        <ul>${strategyBullets.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>

      <div class="tags">
        ${(card.tags||[]).map(t=>`<span class="badge">#${escapeHtml(t)}</span>`).join("")}
      </div>

      <div class="endcap">このカードはここで完結します</div>
    </div>
  `;

  $("#backToList").onclick = ()=> nav(`#list?os=${encodeURIComponent(card.os || "life")}`);
  $("#favBtn").onclick = ()=>{
    const set = loadFavorites();
    if (set.has(card.id)) set.delete(card.id); else set.add(card.id);
    saveFavorites(set);
    renderDetail(card.id);
  };
}

// ========== マイページ ==========
function renderMy(){
  renderShell("my");
  const view = $("#view");

  const favSet = loadFavorites();
  const favorites = DATA.all.filter(c => favSet.has(c.id));
  const personal = loadPersonalCards();

  view.innerHTML = `
    <div class="card" style="padding:14px;">
      <div style="font-size:18px; margin-bottom:6px;">マイページ（β）</div>
      <div class="small">お気に入り（localStorage）と、個人追加（ローカル保存）</div>
    </div>

    <div class="card section" style="padding:14px;">
      <div class="row">
        <div style="font-size:14px; color:var(--muted);">お気に入り一覧</div>
        <button class="btn danger" id="clearFav">お気に入り全消去</button>
      </div>
      <div class="section" id="favList"></div>
    </div>

    <div class="card section" style="padding:14px;">
      <div style="font-size:14px; color:var(--muted); margin-bottom:10px;">個人追加（β）</div>

      <div class="grid" style="grid-template-columns:1fr; gap:10px;">
        <input class="input" id="pid" placeholder="id（例：P-001）" />
        <input class="input" id="ptitle" placeholder="title（魅力的なタイトル）" />
        <input class="input" id="psummary" placeholder="summary（要約）" />
        <textarea id="pessence" placeholder="essence（本質）"></textarea>
        <textarea id="ppitfalls" placeholder="pitfalls（落とし穴）"></textarea>
        <textarea id="pstrategy" placeholder="strategy（戦略）"></textarea>
        <input class="input" id="ptags" placeholder='tags（カンマ区切り：例 交渉,距離感）' />

        <div class="row">
          <button class="btn primary" id="addPersonal">追加する</button>
          <button class="btn" id="reload">再読み込み</button>
          <span class="small">追加カードは extra として一覧に反映</span>
        </div>
      </div>

      <div class="section small" id="personalInfo"></div>
    </div>
  `;

  const renderFavList = ()=>{
    $("#favList").innerHTML = favorites.length
      ? favorites.map(c=>`
        <div class="card item">
          <div style="flex:1;">
            <div class="meta"><span class="badge id">${escapeHtml(c.id)}</span></div>
            <h4>${escapeHtml(c.title)}</h4>
            <div class="small">${escapeHtml(c.summary)}</div>
          </div>
          <button class="btn primary" data-open="${escapeHtml(c.id)}">詳細</button>
        </div>
      `).join("")
      : `<div class="small">お気に入りはまだありません。</div>`;

    $("#favList").querySelectorAll("[data-open]").forEach(b=>{
      b.onclick = ()=> nav(`#detail?id=${encodeURIComponent(b.getAttribute("data-open"))}`);
    });
  };

  $("#clearFav").onclick = ()=>{
    saveFavorites(new Set());
    nav("#my");
  };

  $("#reload").onclick = async ()=>{
    await loadAll();
    nav("#my");
  };

  $("#addPersonal").onclick = async ()=>{
    const id = $("#pid").value.trim();
    const title = $("#ptitle").value.trim();
    if (!id || !title){
      alert("id と title は必須です");
      return;
    }
    const card = normalizeCard({
      id,
      title,
      summary: $("#psummary").value.trim(),
      essence: $("#pessence").value.trim(),
      pitfalls: $("#ppitfalls").value.trim(),
      strategy: $("#pstrategy").value.trim(),
      tags: $("#ptags").value.split(",").map(s=>s.trim()).filter(Boolean),
      os: "extra"
    });
    const cards = loadPersonalCards();
    cards.push(card);
    savePersonalCards(cards);
    await loadAll();
    nav("#list?os=extra");
  };

  $("#personalInfo").textContent = `保存済みの個人追加カード：${personal.length}件`;
  renderFavList();
}

// ========== ルーティング ==========
async function boot(){
  await loadAll();

  const onRoute = ()=>{
    const hash = location.hash || "#home";

    if (hash.startsWith("#home")) return renderHome();

    if (hash.startsWith("#list")) {
      const q = parseQuery(hash.split("?")[1] || "");
      const os = q.os || "life";
      return renderList(os);
    }

    if (hash.startsWith("#detail")) {
      const q = parseQuery(hash.split("?")[1] || "");
      return renderDetail(q.id || "");
    }

    if (hash.startsWith("#my")) return renderMy();

    renderHome();
  };

  window.addEventListener("hashchange", onRoute);
  onRoute();
}

boot();
