// =========================================================
// 処世術禄 app.js
// - サイドバー（OS）は左固定
// - 2次フィルター（タブ）= card.tab 参照
// - タグ検索 = card.tags のまま
// - JSONファイル名：life/internal/relation/operation/exection/adapt
// =========================================================

// ========== 設定 ==========
const OS_META = [
  { key: "life",      title: "人生OS",       desc: "判断基準（方向性・価値観・決断・意味）。", file: "./data/life.json" },
  { key: "internal",  title: "内部心理OS",   desc: "不安・自己否定・怒り・疲れ・回復。",       file: "./data/internal.json" },
  { key: "relation",  title: "対人関係OS",   desc: "印象・距離感・信頼・境界線。",             file: "./data/relation.json" },
  { key: "operation", title: "環境操作OS",   desc: "報告・会議・交渉・評価・根回し。",         file: "./data/operation.json" },
  { key: "exection",  title: "行動OS",       desc: "着手・集中・習慣化・継続・仕組み化。",     file: "./data/exection.json" },
  { key: "adapt",     title: "適応OS",       desc: "変化察知・AI・キャリア・資産・撤退。",     file: "./data/adapt.json" },
  { key: "extra",     title: "追加OS（仮）", desc: "調整枠・実験枠。",                          file: "./data/extra.json" }
];

const LS_FAV = "shoseijutsu:favorites";
const LS_PERSONAL = "shoseijutsu:personalCards";

// ========== ユーティリティ ==========
const $ = (sel) => document.querySelector(sel);

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

function readJSONSafe(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function loadFavorites() {
  return new Set(readJSONSafe(localStorage.getItem(LS_FAV)) ?? []);
}
function saveFavorites(set) {
  localStorage.setItem(LS_FAV, JSON.stringify([...set]));
}

function loadPersonalCards() {
  return readJSONSafe(localStorage.getItem(LS_PERSONAL)) ?? [];
}
function savePersonalCards(cards) {
  localStorage.setItem(LS_PERSONAL, JSON.stringify(cards));
}

function parseQuery(qs) {
  const out = {};
  (qs || "")
    .replace(/^\?/, "")
    .split("&")
    .filter(Boolean)
    .forEach((kv) => {
      const [k, v] = kv.split("=");
      out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
    });
  return out;
}

function nav(hash) {
  location.hash = hash;
}

/**
 * 文字列/配列/その他を bullets に統一
 */
function splitToBullets(text) {
  if (text == null) return [];
  if (Array.isArray(text)) return text.map((v) => String(v).trim()).filter(Boolean);
  if (typeof text !== "string") text = String(text);
  const t = text.trim();
  if (!t) return [];
  const lines = t
    .split(/\n+/)
    .map((x) => x.replace(/^\s*[・\-]\s*/, "").trim())
    .filter(Boolean);
  return lines.length ? lines : [t];
}

/**
 * データ揺れ吸収：pitfall(単数) 等
 */
function normalizeCard(c) {
  if (!c || typeof c !== "object") return c;
  const out = { ...c };

  if (out.pitfalls == null && out.pitfall != null) out.pitfalls = out.pitfall;

  // 互換：category / group を tab に吸収（あれば）
  if (out.tab == null && out.category != null) out.tab = out.category;
  if (out.tab == null && out.group != null) out.tab = out.group;

  out.tab = String(out.tab ?? "").trim();
  return out;
}

function osClass(osKey) {
  const k = String(osKey || "extra");
  return `os-${k}`;
}

// ========== データ読み込み ==========
let DATA = { byOS: {}, all: [] };

async function fetchOS(osKey) {
  const meta = OS_META.find((x) => x.key === osKey);
  if (!meta) return [];
  try {
    const res = await fetch(meta.file, { cache: "no-store" });
    if (!res.ok) throw new Error(`${meta.file} ${res.status}`);
    const json = await res.json();
    const arr = Array.isArray(json) ? json : [];
    // ★osは必ずOSキーに正規化（JSON内のos表記に依存しない）
    return arr.map((c) => normalizeCard({ ...c, os: osKey }));
  } catch (e) {
    console.error("fetchOS error:", e);
    return [];
  }
}

async function loadAll() {
  const personal = loadPersonalCards();
  const results = await Promise.all(OS_META.map((m) => fetchOS(m.key)));

  OS_META.forEach((m, i) => { DATA.byOS[m.key] = results[i]; });

  // personal を extra に混ぜる
  const mergedExtra = [
    ...(DATA.byOS.extra ?? []),
    ...personal.map((x) => normalizeCard({ ...x, os: "extra" }))
  ];
  DATA.byOS.extra = mergedExtra;

  DATA.all = OS_META.flatMap((m) => (DATA.byOS[m.key] ?? []));
}

// ========== UI シェル ==========
function renderShell(activeTab) {
  const app = $("#app");
  app.innerHTML = `
    <div class="header">
      <div class="header-inner">
        <div class="brand">
          <h1>処世術禄</h1>
          <small>Shoseijutsu OS</small>
        </div>

        <div class="header-actions">
          <button class="btn ghost ${activeTab === "top" ? "active" : ""}" id="btnTop">トップ</button>
          <button class="btn ghost ${activeTab === "list" ? "active" : ""}" id="btnList">処世術一覧</button>
          <button class="btn ghost ${activeTab === "my" ? "active" : ""}" id="btnMy">マイページ</button>
        </div>
      </div>
    </div>

    <div class="container" id="view"></div>
  `;

  $("#btnTop").onclick = () => nav("#home");
  $("#btnList").onclick = () => nav("#list?os=life");
  $("#btnMy").onclick = () => nav("#my");
}

// ========== 画面：トップ ==========
function renderHome() {
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
          <button class="os-mini" data-os="${m.key}" type="button">
            <div class="os-mini-title">${escapeHtml(m.title)}</div>
            <div class="os-mini-desc">${escapeHtml(m.desc)}</div>
          </button>
        `).join("")}
      </div>
    </div>
  `;

  $("#goList").onclick = () => nav("#list?os=life");
  view.querySelectorAll("[data-os]").forEach((el) => {
    el.onclick = () => nav(`#list?os=${el.getAttribute("data-os")}`);
  });
}

// ========== 一覧 ==========
function buildTagSet(cards) {
  const set = new Set();
  cards.forEach((c) => (c.tags || []).forEach((t) => set.add(t)));
  return [...set].sort((a, b) => a.localeCompare(b, "ja"));
}
function sortById(cards) {
  return [...cards].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function buildTabStats(cards, maxTabs = 7) {
  const counts = new Map();
  cards.forEach((c) => {
    const k = String(c.tab || "").trim();
    if (!k) return;
    counts.set(k, (counts.get(k) || 0) + 1);
  });

  const sorted = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return String(a[0]).localeCompare(String(b[0]), "ja");
  });

  // maxTabs を超える場合は「その他」に寄せる（常備）
  let main = sorted;
  let hasOther = false;

  if (sorted.length > maxTabs) {
    const keep = maxTabs - 1; // 「その他」枠を確保
    main = sorted.slice(0, Math.max(0, keep));
    hasOther = true;
  }

  const shown = new Set(main.map(([k]) => k));
  const otherCount = hasOther
    ? sorted.filter(([k]) => !shown.has(k)).reduce((acc, [, n]) => acc + n, 0)
    : 0;

  const tabs = [
    ...main.map(([k, n]) => ({ key: k, label: k, count: n })),
    ...(hasOther ? [{ key: "__other__", label: "その他", count: otherCount }] : [])
  ];

  return { tabs, shownKeys: shown, totalTabs: sorted.length };
}

function osLabel(osKey) {
  const meta = OS_META.find((m) => m.key === osKey);
  return meta ? meta.title : osKey;
}

function renderCompactSidebar(currentOS) {
  const items = [
    "life", "internal", "relation", "operation", "exection", "adapt", "extra"
  ];

  return `
    <div class="sidebarCompact">
      <div class="sidebarCompactTitle">処世術OS</div>

      <div class="sidebarCompactList" id="osbar">
        ${items.map((k) => `
          <div class="sidebarCompactItem ${k === currentOS ? "isActive" : ""}" data-os="${escapeHtml(k)}">
            <div class="sidebarCompactLeft">
              <div class="sidebarCompactMain">${escapeHtml(osLabel(k))}</div>
            </div>
          </div>
        `).join("")}
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

function bindSidebarActions(container) {
  container.querySelectorAll("[data-os]").forEach((el) => {
    el.onclick = () => nav(`#list?os=${el.getAttribute("data-os")}`);
  });
  const goSearch = container.querySelector("#goSearch");
  if (goSearch) goSearch.onclick = () => nav(`#search?q=&tag=`);
}

function renderList(osKey) {
  renderShell("list");
  const view = $("#view");

  const currentOS = OS_META.find((m) => m.key === osKey) ? osKey : "life";
  const meta = OS_META.find((m) => m.key === currentOS);

  const allCards = sortById(DATA.byOS[currentOS] ?? []);

  // ★タブ（OS内分類 / 2次フィルター）
  const tabStats = buildTabStats(allCards, 7);
  const tabs = tabStats.tabs;

  const q = parseQuery(location.hash.split("?")[1] || "");
  const activeTabKey = q.tab || "すべて";

  // tab filter
  let filtered = allCards;

  if (activeTabKey !== "すべて") {
    if (activeTabKey === "__other__") {
      const shown = tabStats.shownKeys;
      filtered = filtered.filter((c) => {
        const t = String(c.tab || "").trim();
        return t && !shown.has(t);
      });
    } else {
      filtered = filtered.filter((c) => String(c.tab || "").trim() === activeTabKey);
    }
  }

  const tabButtons = [
    { key: "すべて", label: "すべて", count: allCards.length },
    ...tabs
  ];

  // ★重要：DOM順を「sidebar → main」にして grid(320px / 1fr) と一致させる
  view.innerHTML = `
    <div class="list-layout has-mobile-sidebar">
      <div class="list-side">
        ${renderCompactSidebar(currentOS)}
      </div>

      <div class="list-main">
        <div class="card section list-headline">
          <div class="title">${escapeHtml(meta?.title || currentOS)} の処世術一覧</div>
          <div class="count">
            件数：<b>${filtered.length}</b>
            <span class="count-sep">/</span>
            全体：<b>${allCards.length}</b>
          </div>
        </div>

        <div class="card section tabbar-wrap">
          <div class="tabbar-label">OS内タブ（2次フィルター）</div>
          <div class="tabbar" id="tabbar">
            ${tabButtons.map((t) => `
              <button class="tabbtn ${t.key === activeTabKey ? "active" : ""}" data-tab="${escapeHtml(t.key)}">
                <span>${escapeHtml(t.label)}</span>
                <span class="tabcount">${t.count}</span>
              </button>
            `).join("")}
          </div>
        </div>

        <div class="cards-grid" id="cards">
          ${filtered.map((c, i) => renderCard(c, i)).join("")}
        </div>
      </div>
    </div>
  `;

  // sidebar click
  bindSidebarActions(view);

  // tab click
  $("#tabbar").querySelectorAll("[data-tab]").forEach((btn) => {
    btn.onclick = () => {
      const t = btn.getAttribute("data-tab");
      const next = t === "すべて" ? "" : `&tab=${encodeURIComponent(t)}`;
      nav(`#list?os=${encodeURIComponent(currentOS)}${next}`);
    };
  });

  // card events
  bindCardEvents();
}

function renderCard(c) {
  const favs = loadFavorites();
  const isFav = favs.has(String(c.id));
  const osKey = c.os || "extra";

  const title = escapeHtml(c.title || "");
  const summary = escapeHtml(c.summary || "");
  const tags = (c.tags || []).map((t) => String(t).trim()).filter(Boolean);

  const ess = splitToBullets(c.essence);
  const pit = splitToBullets(c.pitfalls);
  const strat = splitToBullets(c.strategy);

  const hasExpand = ess.length || pit.length || strat.length;

  return `
    <div class="scard ${osClass(osKey)}" data-cardid="${escapeHtml(c.id)}">
      <div class="scard-num">${escapeHtml(c.id)}</div>

      <div class="scard-top">
        <div class="scard-icon scard-icon-id">${escapeHtml(c.tab || "") || "—"}</div>

        <div class="scard-head scard-click" data-open="${escapeHtml(c.id)}">
          <h3 class="scard-title">${title}</h3>
          <p class="scard-summary">${summary}</p>
        </div>

        <div class="scard-side">
          <div class="favmini" data-fav="${escapeHtml(c.id)}">
            <span>★</span>
            <span class="count">${isFav ? "保存" : "未保存"}</span>
          </div>
        </div>
      </div>

      ${tags.length ? `
        <div class="scard-tags">
          ${tags.map((t) => `<span class="tagchip" data-tagchip="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join("")}
        </div>
      ` : ""}

      ${hasExpand ? `
        <div class="scard-expand" style="display:none;" data-expand="${escapeHtml(c.id)}">
          ${ess.length ? `<h4>要点</h4><ul>${ess.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
          ${pit.length ? `<h4>落とし穴</h4><ul>${pit.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
          ${strat.length ? `<h4>実装</h4><ul>${strat.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
        </div>
      ` : ""}
    </div>
  `;
}

function bindCardEvents() {
  const view = $("#view");

  view.querySelectorAll("[data-open]").forEach((el) => {
    el.onclick = () => {
      const id = el.getAttribute("data-open");
      const box = view.querySelector(`[data-expand="${CSS.escape(id)}"]`);
      if (!box) return;
      box.style.display = (box.style.display === "none" || !box.style.display) ? "block" : "none";
    };
  });

  view.querySelectorAll("[data-fav]").forEach((el) => {
    el.onclick = () => {
      const id = el.getAttribute("data-fav");
      const favs = loadFavorites();
      if (favs.has(id)) favs.delete(id); else favs.add(id);
      saveFavorites(favs);
      const h = location.hash;
      nav("#home"); nav(h);
    };
  });

  view.querySelectorAll("[data-tagchip]").forEach((el) => {
    el.onclick = () => {
      const t = el.getAttribute("data-tagchip");
      const q = parseQuery(location.hash.split("?")[1] || "");
      const currentQuery = q.q || "";
      nav(`#search?q=${encodeURIComponent(currentQuery)}&tag=${encodeURIComponent(t)}`);
    };
  });
}

// ========== 検索 ==========
function renderSearch({ q, tag }) {
  renderShell("list");
  const view = $("#view");

  const all = sortById(DATA.all);

  const query = String(q || "").trim().toLowerCase();
  const tagq = String(tag || "").trim();

  let filtered = all;

  if (tagq) {
    filtered = filtered.filter((c) => (c.tags || []).some((x) => String(x).trim() === tagq));
  }
  if (query) {
    filtered = filtered.filter((c) => {
      const hay = [
        c.id, c.title, c.summary, c.tab,
        ...(c.tags || []),
        ...splitToBullets(c.essence),
        ...splitToBullets(c.pitfalls),
        ...splitToBullets(c.strategy)
      ].map((x) => String(x || "").toLowerCase()).join(" ");
      return hay.includes(query);
    });
  }

  const allTags = buildTagSet(all);

  view.innerHTML = `
    <div class="list-layout has-mobile-sidebar">
      <div class="list-side">
        ${renderCompactSidebar("")}
      </div>

      <div class="list-main">
        <div class="card section">
          <div class="list-headline" style="padding:0;">
            <div class="title">検索（OS横断）</div>
            <div class="count">件数：<b>${filtered.length}</b><span class="count-sep">/</span>全体：<b>${all.length}</b></div>
          </div>
        </div>

        <div class="card section">
          <div class="grid">
            <input class="input" id="q" placeholder="キーワード（例：疲れ / 交渉 / 先延ばし）" value="${escapeHtml(q || "")}" />
            <input class="input" id="tag" placeholder="タグ（任意）" value="${escapeHtml(tag || "")}" />
            <div class="row">
              <button class="btn primary" id="doSearch">検索</button>
              <button class="btn ghost" id="clearSearch">クリア</button>
            </div>
          </div>
        </div>

        <div class="card section tagbar-wrap">
          <div class="tagbar-label">タグ一覧（クリックで絞り込み）</div>
          <div class="tagbar" id="tagbar">
            ${allTags.map((t) => `
              <button class="tagbtn ${t === tagq ? "active" : ""}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>
            `).join("")}
          </div>
        </div>

        <div class="cards-grid" id="cards">
          ${filtered.map((c) => renderCard(c)).join("")}
        </div>
      </div>
    </div>
  `;

  bindSidebarActions(view);

  $("#doSearch").onclick = () => {
    const nq = $("#q").value.trim();
    const nt = $("#tag").value.trim();
    nav(`#search?q=${encodeURIComponent(nq)}&tag=${encodeURIComponent(nt)}`);
  };
  $("#clearSearch").onclick = () => nav(`#search?q=&tag=`);

  $("#tagbar").querySelectorAll("[data-tag]").forEach((btn) => {
    btn.onclick = () => {
      const t = btn.getAttribute("data-tag");
      const next = (t === tagq) ? "" : t;
      nav(`#search?q=${encodeURIComponent($("#q").value.trim())}&tag=${encodeURIComponent(next)}`);
    };
  });

  bindCardEvents();
}

// ========== 詳細 ==========
function renderDetail(id) {
  renderShell("list");
  const view = $("#view");

  const card = DATA.all.find((c) => String(c.id) === String(id));
  if (!card) {
    view.innerHTML = `
      <div class="card section">
        <div class="title" style="font-weight:900;">カードが見つかりません</div>
        <div style="margin-top:10px;"><button class="btn" id="back">戻る</button></div>
      </div>
    `;
    $("#back").onclick = () => history.back();
    return;
  }

  const ess = splitToBullets(card.essence);
  const pit = splitToBullets(card.pitfalls);
  const strat = splitToBullets(card.strategy);

  view.innerHTML = `
    <div class="card section">
      <div class="row">
        <div>
          <div class="badge id">${escapeHtml(card.id)}</div>
          <div style="margin-top:8px; font-weight:900; font-size:18px;">${escapeHtml(card.title || "")}</div>
          <div style="margin-top:6px; color:rgba(10,18,20,.62);">${escapeHtml(card.summary || "")}</div>
        </div>
        <button class="btn ghost" id="back">戻る</button>
      </div>
    </div>

    ${ess.length ? `
      <div class="card section">
        <div style="font-weight:900; margin-bottom:8px;">要点</div>
        <ul>${ess.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>
    ` : ""}

    ${pit.length ? `
      <div class="card section">
        <div style="font-weight:900; margin-bottom:8px;">落とし穴</div>
        <ul>${pit.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>
    ` : ""}

    ${strat.length ? `
      <div class="card section">
        <div style="font-weight:900; margin-bottom:8px;">実装</div>
        <ul>${strat.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>
    ` : ""}
  `;

  $("#back").onclick = () => history.back();
}

// ========== マイページ ==========
function renderMy() {
  renderShell("my");
  const view = $("#view");

  const favs = loadFavorites();
  const all = sortById(DATA.all);
  const favList = all.filter((c) => favs.has(String(c.id)));
  const personal = loadPersonalCards();

  view.innerHTML = `
    <div class="card section">
      <div class="list-headline" style="padding:0;">
        <div class="title">マイページ</div>
        <div class="count">お気に入り：<b>${favList.length}</b>件</div>
      </div>
    </div>

    <div class="card section">
      <div style="font-weight:900; margin-bottom:10px;">お気に入り</div>
      <div class="cards-grid">
        ${favList.length ? favList.map((c) => renderCard(c)).join("") : `<div style="color:rgba(10,18,20,.60);">まだ保存がありません。</div>`}
      </div>
    </div>

    <div class="card section">
      <div style="font-weight:900; margin-bottom:10px;">個人追加カード（追加OS）</div>

      <div class="grid" style="grid-template-columns:1fr 1fr; gap:10px;">
        <input class="input" id="pid" placeholder="ID（例：X-001）" />
        <input class="input" id="ptitle" placeholder="タイトル（1行）" />
      </div>

      <input class="input" id="psummary" placeholder="要約（1行）" style="margin-top:10px;" />

      <textarea class="input" id="pessence" placeholder="要点（改行区切り）" style="margin-top:10px;"></textarea>
      <textarea class="input" id="ppitfalls" placeholder="落とし穴（改行区切り）" style="margin-top:10px;"></textarea>
      <textarea class="input" id="pstrategy" placeholder="実装（改行区切り）" style="margin-top:10px;"></textarea>

      <input class="input" id="ptags" placeholder="タグ（カンマ区切り）" style="margin-top:10px;" />

      <div class="row" style="margin-top:12px;">
        <button class="btn primary" id="savePersonal">保存</button>
        <span id="personalInfo" style="color:rgba(10,18,20,.55); font-size:12px;"></span>
      </div>
    </div>
  `;

  $("#savePersonal").onclick = async () => {
    const id = $("#pid").value.trim();
    const title = $("#ptitle").value.trim();
    if (!id || !title) {
      alert("ID と タイトル は必須です。");
      return;
    }
    const card = normalizeCard({
      id,
      title,
      summary: $("#psummary").value.trim(),
      essence: $("#pessence").value.trim(),
      pitfalls: $("#ppitfalls").value.trim(),
      strategy: $("#pstrategy").value.trim(),
      tags: $("#ptags").value.split(",").map((s) => s.trim()).filter(Boolean),
      os: "extra"
    });

    const cards = loadPersonalCards();
    cards.push(card);
    savePersonalCards(cards);

    await loadAll();
    nav("#list?os=extra");
  };

  $("#personalInfo").textContent = `保存済みの個人追加カード：${personal.length}件`;
  bindCardEvents();
}

// ========== ルーティング ==========
async function boot() {
  await loadAll();

  const onRoute = () => {
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
