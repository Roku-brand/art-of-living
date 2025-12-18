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
 * 文字列/配列/その他を bullets に統一
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

  // OS内タブ（分類）互換：category/group → tab
  if (out.tab == null && out.category != null) out.tab = out.category;
  if (out.tab == null && out.group != null) out.tab = out.group;
  out.tab = String(out.tab ?? "").trim();

  return out;
}

function osClass(osKey){
  const k = String(osKey || "extra");
  return `os-${k}`;
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
    // ★osを必ず付与（OSライン色のため）
    return arr.map(c => normalizeCard({ ...c, os: c.os || osKey }));
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

  const copy = `情報の洪水に惑わされないためには、点在する情報ではなく“構造化された知恵”が必要。
本書は、自己啓発・心理学・行動科学・対人術・キャリア論などを 5つのOS・195の項目 に集約した「処世術の体系書」です。`;

  view.innerHTML = `
    <div class="card section" style="padding:14px;">
      <div style="font-size:18px; font-weight:900; margin-bottom:8px;">処世術禄</div>
      <p class="hero-copy" style="margin:0; white-space:pre-line; color:rgba(10,18,20,.72);">${escapeHtml(copy)}</p>

      <div class="row" style="margin-top:12px;">
        <button class="btn primary" id="goList">処世術一覧へ</button>
        <span class="subtle" style="color:rgba(10,18,20,.50); font-size:12px;">7つのOS・200項目（目標値として固定表示）</span>
      </div>
    </div>

    <div class="card section" style="padding:14px;">
      <div class="os-select-title">OSを選択</div>
      <div class="os-select-grid">
        ${OS_META.map(m => `
          <button class="os-mini" data-os="${escapeHtml(m.key)}" type="button">
            <div class="os-mini-title">${escapeHtml(m.title)}</div>
            <div class="os-mini-desc">${escapeHtml(m.desc)}</div>
          </button>
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

/**
 * OS内タブ（分類）を最大 maxTabs 個まで（＋必要なら「その他」）に整形
 */
function buildTabStats(cards, maxTabs = 7){
  const counts = new Map();
  cards.forEach(c=>{
    const k = String(c.tab || "").trim() || "未分類";
    counts.set(k, (counts.get(k) || 0) + 1);
  });

  const sorted = [...counts.entries()].sort((a,b)=>{
    if (b[1] !== a[1]) return b[1] - a[1];
    return String(a[0]).localeCompare(String(b[0]), "ja");
  });

  let main = sorted;
  let hasOther = false;

  if (sorted.length > maxTabs){
    const keep = maxTabs - 1; // 「その他」枠
    main = sorted.slice(0, Math.max(0, keep));
    hasOther = true;
  }

  const shownKeys = new Set(main.map(([k])=>k));
  const otherCount = hasOther
    ? sorted.filter(([k])=>!shownKeys.has(k)).reduce((acc, [,n])=>acc+n, 0)
    : 0;

  const tabs = [
    ...main.map(([k,n])=>({ key: k, label: k, count: n })),
    ...(hasOther ? [{ key: "__other__", label: "その他", count: otherCount }] : [])
  ];

  return { tabs, shownKeys };
}

function osLabelParts(osKey){
  if (osKey === "life") return { main: "人生OS", sub: "" };
  if (osKey === "internal") return { main: "1. 心の扱い方", sub: "内部OS" };
  if (osKey === "relation") return { main: "2. 人との関わり方", sub: "対人OS" };
  if (osKey === "social") return { main: "3. 社会での立ち回り", sub: "社会OS" };
  if (osKey === "action") return { main: "4. 行動・習慣の技術", sub: "行動OS" };
  if (osKey === "future") return { main: "5. キャッチアップの極意", sub: "未来OS" };
  if (osKey === "extra") return { main: "追加OS（仮）", sub: "" };
  return { main: osKey, sub: "" };
}

/**
 * サイドバー（OS切替）
 * - 「トップ」は不要 → 削除
 * - 並び順は人生OSを最上段に固定
 */
function renderCompactSidebar(currentOS){
  const items = [
    "life",
    "internal",
    "relation",
    "social",
    "action",
    "future",
    "extra"
  ];

  return `
    <div class="sidebarCompact">
      <div class="sidebarCompactTitle">処世術OS</div>

      <div class="sidebarCompactList" id="osbar">
        ${items.map(key=>{
          const p = osLabelParts(key);
          return `
            <div class="sidebarCompactItem ${key===currentOS ? "isActive" : ""}" data-os="${escapeHtml(key)}">
              <div class="sidebarCompactLeft">
                <div class="sidebarCompactMain">${escapeHtml(p.main)}</div>
                ${p.sub ? `<div class="sidebarCompactSub">${escapeHtml(p.sub)}</div>` : ``}
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <div class="sidebarCompactFooter">
        <div class="sidebarCompactSearch" id="goSearch" role="button" tabindex="0">
          <span class="sidebarCompactDot" aria-hidden="true"></span>
          <span class="sidebarCompactSearchText">検索（OS横断）</span>
        </div>
      </div>
    </div>
  `;
}

function renderList(osKey){
  renderShell("list");
  const view = $("#view");

  const currentOS = OS_META.find(m => m.key === osKey) ? osKey : "life";
  const meta = OS_META.find(m=>m.key===currentOS);

  const allCards = sortById(DATA.byOS[currentOS] ?? []);

  // 2次フィルター：OS内タブ（card.tab）
  const tabStats = buildTabStats(allCards, 7);
  const tabs = tabStats.tabs;

  const state = { tab: "", expandedId: "" };

  view.innerHTML = `
    <div class="list-layout has-mobile-sidebar">
      <aside class="list-side" id="listSide">
        ${renderCompactSidebar(currentOS)}
      </aside>

      <div class="list-main">
        <div class="mobile-side-toggle">
          <button class="btn ghost" id="btnSideToggle" aria-expanded="false" aria-controls="listSide" aria-label="Toggle OS menu">
            メニュー
          </button>
        </div>

        <div class="card section" style="padding:0;">
          <div class="list-headline">
            <div class="title">${escapeHtml(meta?.title ?? "人生OS")}</div>
            <div class="count">
              表示：<span id="countShown">0</span> 件
              <span class="count-sep">/</span>
              全<span id="countAll">${allCards.length}</span> 件
            </div>
          </div>
        </div>

        <div class="card section" style="padding:0;">
          <div class="tabbar-wrap">
            <div class="tabbar-label">分類（OS内タブ）</div>
            <div class="tabbar" id="tabbar">
              <button class="tabbtn active" data-tab="">すべて</button>
              ${tabs.map(t=>`
                <button class="tabbtn" data-tab="${escapeHtml(t.key)}">
                  ${escapeHtml(t.label)}
                  <span class="tabcount">${t.count}</span>
                </button>
              `).join("")}
            </div>
          </div>
        </div>

        <div class="cards-grid" id="cards"></div>
      </div>
    </div>
  `;

  // sidebar wiring
  const sideEl = $("#listSide");
  const sideToggleBtn = $("#btnSideToggle");
  const setSideOpen = (open)=>{
    if (!sideEl) return;
    let next = !sideEl.classList.contains("isOpen");
    if (typeof open === "boolean") next = open;
    sideEl.classList.toggle("isOpen", next);
    if (sideToggleBtn) sideToggleBtn.setAttribute("aria-expanded", String(next));
  };

  if (sideToggleBtn) sideToggleBtn.onclick = ()=> setSideOpen();
  const closeSidebar = ()=> setSideOpen(false);

  $("#osbar").querySelectorAll("[data-os]").forEach(el=> el.onclick = ()=>{
    closeSidebar();
    nav(`#list?os=${el.getAttribute("data-os")}`);
  });

  $("#goSearch").onclick = ()=>{
    closeSidebar();
    nav("#search");
  };
  $("#goSearch").onkeydown = (e)=>{
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      closeSidebar();
      nav("#search");
    }
  };

  const isInOther = (c)=>{
    const k = String(c.tab || "").trim() || "未分類";
    return !tabStats.shownKeys.has(k);
  };

  const draw = ()=>{
    let cards = allCards;

    // tab filter
    if (state.tab){
      if (state.tab === "__other__") cards = cards.filter(isInOther);
      else cards = cards.filter(c => (String(c.tab || "").trim() || "未分類") === state.tab);
    }

    $("#countShown").textContent = String(cards.length);

    const fav = loadFavorites();

    $("#cards").innerHTML = cards.map(c=>{
      const isOpen = c.id === state.expandedId;
      const isFav = fav.has(c.id);

      const essenceBullets = splitToBullets(c.essence);
      const pitfallsBullets = splitToBullets(c.pitfalls);
      const strategyBullets = splitToBullets(c.strategy);

      const cls = `${osClass(c.os || currentOS)}`;

      return `
        <div class="scard ${cls}">
          <div class="scard-top scard-click" data-toggle="${escapeHtml(c.id)}">
            <div class="scard-icon scard-icon-id">${escapeHtml(c.id)}</div>

            <div class="scard-head">
              <h3 class="scard-title">${escapeHtml(c.title)}</h3>
              <p class="scard-summary">${escapeHtml(c.summary)}</p>
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

              <h4>やりがちな落とし穴</h4>
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

    // tag chips → 検索へ（探索導線）
    $("#cards").querySelectorAll("[data-tag]").forEach(el=>{
      el.onclick = (e)=>{
        e.stopPropagation();
        const t = el.getAttribute("data-tag");
        nav(`#search?tag=${encodeURIComponent(t)}`);
      };
    });

    // expand
    $("#cards").querySelectorAll("[data-toggle]").forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute("data-toggle");
        state.expandedId = (state.expandedId === id) ? "" : id;
        draw();
      };
    });

    // favorite
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

  // tab buttons
  $("#tabbar").querySelectorAll("[data-tab]").forEach(b=>{
    b.onclick = ()=>{
      state.tab = b.getAttribute("data-tab");
      $("#tabbar").querySelectorAll("[data-tab]").forEach(x=>{
        x.classList.toggle("active", x === b);
      });
      state.expandedId = "";
      draw();
    };
  });

  draw();
}

// ========== OS横断検索 ==========
function renderSearch(initial = {}){
  renderShell("list");
  const view = $("#view");

  const state = { q: "", tag: "", expandedId: "" };

  if (initial.q) state.q = String(initial.q).trim();
  if (initial.tag) state.tag = String(initial.tag).trim();

  const allCards = sortById(DATA.all ?? []);
  const tags = buildTagSet(allCards);

  view.innerHTML = `
    <div class="list-layout">
      <aside class="list-side">
        ${renderCompactSidebar("search")}
      </aside>

      <div class="list-main">
        <div class="card section" style="padding:14px;">
          <div style="font-weight:900; font-size:15px;">検索（OS横断）</div>
          <div style="color:var(--muted); font-size:12px; margin-top:4px;">タイトル・要約・本質・戦略・タグを対象に検索</div>

          <div style="display:grid; gap:10px; margin-top:10px;">
            <input class="input" id="q" placeholder="例：不安、交渉、習慣、AI など" />
          </div>
        </div>

        <div class="card section" style="padding:0;">
          <div class="tagbar-wrap">
            <div class="tagbar-label">タグ（探索ツール）</div>
            <div class="tagbar" id="tagbar">
              <button class="tagbtn active" data-tag="">すべて</button>
              ${tags.map(t=>`<button class="tagbtn" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("")}
            </div>
          </div>
        </div>

        <div class="card section" style="padding:0;">
          <div class="list-headline">
            <div class="title">検索結果</div>
            <div class="count">件数：<span id="countAll">0</span> 件</div>
          </div>
        </div>

        <div class="cards-grid" id="cards"></div>
      </div>
    </div>
  `;

  // sidebar wiring
  $("#osbar").querySelectorAll("[data-os]").forEach(el=> el.onclick = ()=> nav(`#list?os=${el.getAttribute("data-os")}`));
  $("#goSearch").onclick = ()=> nav("#search");

  const matchText = (c, q)=>{
    if (!q) return true;
    const s = q.toLowerCase();
    const hay = [
      c.title, c.summary,
      ...(splitToBullets(c.essence)),
      ...(splitToBullets(c.pitfalls)),
      ...(splitToBullets(c.strategy)),
      ...((c.tags||[]).map(String))
    ].join(" ").toLowerCase();
    return hay.includes(s);
  };

  const syncTagbar = ()=>{
    $("#tagbar").querySelectorAll("[data-tag]").forEach(b=>{
      b.classList.toggle("active", b.getAttribute("data-tag") === state.tag);
    });
    const allBtn = $("#tagbar").querySelector('[data-tag=""]');
    if (allBtn) allBtn.classList.toggle("active", state.tag === "");
  };

  const draw = ()=>{
    let cards = allCards.filter(c => matchText(c, state.q));
    if (state.tag) cards = cards.filter(c => (c.tags||[]).includes(state.tag));

    $("#countAll").textContent = String(cards.length);

    const fav = loadFavorites();

    $("#cards").innerHTML = cards.map(c=>{
      const isOpen = c.id === state.expandedId;
      const isFav = fav.has(c.id);
      const cls = `${osClass(c.os)}`;

      const essenceBullets = splitToBullets(c.essence);
      const pitfallsBullets = splitToBullets(c.pitfalls);
      const strategyBullets = splitToBullets(c.strategy);

      return `
        <div class="scard ${cls}">
          <div class="scard-top scard-click" data-toggle="${escapeHtml(c.id)}">
            <div class="scard-icon scard-icon-id">${escapeHtml(c.id)}</div>

            <div class="scard-head">
              <h3 class="scard-title">${escapeHtml(c.title)}</h3>
              <p class="scard-summary">${escapeHtml(c.summary)}</p>
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

              <h4>やりがちな落とし穴</h4>
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

    // tag chips → 検索内タグフィルタとして動作
    $("#cards").querySelectorAll("[data-tag]").forEach(el=>{
      el.onclick = (e)=>{
        e.stopPropagation();
        const t = el.getAttribute("data-tag");
        state.tag = (state.tag === t) ? "" : t;
        syncTagbar();
        draw();
      };
    });

    $("#cards").querySelectorAll("[data-toggle]").forEach(el=>{
      el.onclick = ()=>{
        const id = el.getAttribute("data-toggle");
        state.expandedId = (state.expandedId === id) ? "" : id;
        draw();
      };
    });

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

  // tag buttons
  $("#tagbar").querySelectorAll("[data-tag]").forEach(b=>{
    b.onclick = ()=>{
      state.tag = b.getAttribute("data-tag");
      state.expandedId = "";
      syncTagbar();
      draw();
    };
  });

  const qEl = $("#q");
  qEl.value = state.q;
  qEl.addEventListener("input", ()=>{
    state.q = qEl.value.trim();
    draw();
  });

  syncTagbar();
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
    <div class="card detail" style="background:rgba(255,255,255,.62);">
      <div class="row">
        <div>
          <h2 style="margin:0 0 6px; font-size:18px;">${escapeHtml(card.title)}</h2>
          <div class="meta" style="display:flex; gap:8px; flex-wrap:wrap;">
            <span class="badge id">${escapeHtml(card.id)}</span>
            <span class="badge">${escapeHtml(osTitle)}</span>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn" id="backToList">一覧へ</button>
          <button class="btn primary" id="favBtn">${isFav ? "★ お気に入り" : "☆ お気に入り"}</button>
        </div>
      </div>

      <div class="kv" style="margin-top:10px;">
        <h3 style="margin:0 0 4px; font-size:13px;">要約</h3>
        <p style="margin:0; color:var(--muted);">${escapeHtml(card.summary)}</p>
      </div>

      <div class="kv" style="margin-top:12px;">
        <h3 style="margin:0 0 6px; font-size:13px;">本質</h3>
        <ul style="margin:0 0 0 18px;">${essenceBullets.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>

      <div class="kv" style="margin-top:12px;">
        <h3 style="margin:0 0 6px; font-size:13px;">落とし穴</h3>
        <ul style="margin:0 0 0 18px;">${pitfallsBullets.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>

      <div class="kv" style="margin-top:12px;">
        <h3 style="margin:0 0 6px; font-size:13px;">戦略</h3>
        <ul style="margin:0 0 0 18px;">${strategyBullets.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>

      <div class="tags" style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        ${(card.tags||[]).map(t=>`<span class="badge">#${escapeHtml(t)}</span>`).join("")}
      </div>
    </div>
  `;

  $("#backToList").onclick = ()=> nav(`#list?os=${encodeURIComponent(card.os || "life")}`);
  $("#favBtn").onclick = ()=>{
    const set = loadFavorites();
    if (set.has(card.id)) set.delete(id); else set.add(card.id);
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
      <div style="font-size:18px; margin-bottom:6px; font-weight:900;">マイページ（β）</div>
      <div class="small" style="color:var(--muted); font-size:12px;">お気に入り（localStorage）と、個人追加（ローカル保存）</div>
    </div>

    <div class="card section" style="padding:14px;">
      <div class="row">
        <div style="font-size:14px; color:var(--muted);">お気に入り一覧</div>
        <button class="btn danger" id="clearFav">お気に入り全消去</button>
      </div>
      <div class="section" id="favList" style="margin-top:10px;"></div>
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
          <span class="small" style="color:var(--muted); font-size:12px;">追加カードは extra として一覧に反映</span>
        </div>
      </div>

      <div class="section small" id="personalInfo" style="margin-top:10px; color:var(--muted); font-size:12px;"></div>
    </div>
  `;

  const renderFavList = ()=>{
    $("#favList").innerHTML = favorites.length
      ? favorites.map(c=>`
        <div class="card item" style="display:flex; gap:12px; align-items:flex-start; padding:12px;">
          <div style="flex:1;">
            <div class="meta"><span class="badge id">${escapeHtml(c.id)}</span></div>
            <h4 style="margin:6px 0; font-size:14px;">${escapeHtml(c.title)}</h4>
            <div class="small" style="color:var(--muted); font-size:12px;">${escapeHtml(c.summary)}</div>
          </div>
          <button class="btn primary" data-open="${escapeHtml(c.id)}">詳細</button>
        </div>
      `).join("")
      : `<div class="small" style="color:var(--muted); font-size:12px;">お気に入りはまだありません。</div>`;

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

    if (hash.startsWith("#search")) {
      const q = parseQuery(hash.split("?")[1] || "");
      return renderSearch({ q: q.q || "", tag: q.tag || "" });
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
