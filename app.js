// =========================================================
// 処世術禄 app.js
// - サイドバー（OS）は左固定
// - 2次フィルター（タブ）= card.tab 参照
// - タグ検索 = card.tags のまま
// - JSONファイル名：life/internal/relation/operation/exection/adapt
// =========================================================

// ========== 設定 ==========
const OS_META = [
  { key: "life",      title: "人生OS",       subtitle: "①迷わない行き方", desc: "判断基準（方向性・価値観・決断・意味）。", file: "./data/life.json" },
  { key: "internal",  title: "内部心理OS",   subtitle: "②心の扱い方",     desc: "不安・自己否定・怒り・疲れ・回復。",       file: "./data/internal.json" },
  { key: "relation",  title: "対人関係OS",   subtitle: "③人との関わり方", desc: "印象・距離感・信頼・境界線。",             file: "./data/relation.json" },
  { key: "operation", title: "環境操作OS",   subtitle: "④影響力を行使する技術", desc: "報告・会議・交渉・評価・根回し。",         file: "./data/operation.json" },
  { key: "exection",  title: "行動OS",       subtitle: "⑤行動・習慣の技術", desc: "着手・集中・習慣化・継続・仕組み化。",     file: "./data/exection.json" },
  { key: "adapt",     title: "適応OS",       subtitle: "⑥キャッチアップの極意", desc: "変化察知・AI・キャリア・資産・撤退。",     file: "./data/adapt.json" },
  { key: "extra",     title: "追加OS（仮）", subtitle: "⑦追加・実験枠",   desc: "調整枠・実験枠。",                          file: "./data/extra.json" }
];

const LS_FAV = "shoseijutsu:favorites";
const LS_PERSONAL = "shoseijutsu:personalCards";

// ========== 2次フィルター（タブ）の表示順序 ==========
// 各OSごとに指定した順番でタブを表示、その他は右端に配置
const TAB_ORDER = {
  life: ["方向性", "価値観", "選択", "優先度", "時間感覚", "学び", "限界認識", "意味", "関係", "健康"],
  internal: ["不安", "自己否定", "怒り", "疲れ・回復", "焦り", "モヤモヤ", "無力感", "自責", "先延ばし", "自己信頼", "納得感", "感情鈍化", "内的ブレーキ", "再起動"],
  relation: ["①距離感", "②印象", "③雑談・やり取り", "④信頼・期待", "⑤衝突・違和感", "⑥維持・選択"],
  operation: ["報告・合意", "交渉術", "構造", "承認・制度", "管理", "判断"],
  exection: ["着手", "分解", "集中", "継続", "ペース", "計画", "整理", "停滞", "摩耗", "寿命", "終了", "中断", "再開", "再起動", "再設計", "完走"],
  adapt: ["変化", "学習", "技術変化", "キャリア", "役割", "リスク", "選択肢", "柔軟性", "不確実性", "前提崩壊", "陳腐化", "速度", "疲労", "視野", "撤退", "判断"],
  extra: []
};

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
          <button class="hamburger-btn" id="hamburgerBtn" aria-label="メニュー">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
          </button>
          <h1>処世術禄</h1>
          <small>Shoseijutsu OS</small>
        </div>

        <div class="header-actions">
          <button class="btn ghost ${activeTab === "list" ? "active" : ""}" id="btnList">処世術一覧</button>
          <button class="btn ghost ${activeTab === "my" ? "active" : ""}" id="btnMy">マイページ</button>
        </div>
      </div>
    </div>

    <!-- モバイルOS選択メニュー -->
    <div class="mobile-menu-overlay" id="mobileMenuOverlay">
      <div class="mobile-menu-panel" id="mobileMenuPanel">
        <div class="mobile-menu-header">
          <span class="mobile-menu-title">処世術OS</span>
          <button class="mobile-menu-close" id="mobileMenuClose" aria-label="閉じる">×</button>
        </div>
        <div class="mobile-menu-list">
          ${OS_META.map((m) => `
            <button class="mobile-menu-item" data-os-nav="${escapeHtml(m.key)}">
              <span class="mobile-menu-subtitle">${escapeHtml(m.subtitle)}</span>
              <span class="mobile-menu-main">${escapeHtml(m.title)}</span>
              <span class="mobile-menu-desc">${escapeHtml(m.desc)}</span>
            </button>
          `).join("")}
        </div>
        <div class="mobile-menu-footer">
          <button class="mobile-menu-search" id="mobileMenuSearch">
            <span class="mobile-menu-search-icon">🔍</span>
            <span>検索（OS横断）</span>
          </button>
        </div>
      </div>
    </div>

    <div class="container" id="view"></div>
  `;

  $("#btnList").onclick = () => nav("#list?os=life");
  $("#btnMy").onclick = () => nav("#my");

  // ハンバーガーメニューの開閉
  const overlay = $("#mobileMenuOverlay");
  const panel = $("#mobileMenuPanel");

  $("#hamburgerBtn").onclick = () => {
    overlay.classList.add("is-open");
    panel.classList.add("is-open");
  };

  const closeMenu = () => {
    overlay.classList.remove("is-open");
    panel.classList.remove("is-open");
  };

  $("#mobileMenuClose").onclick = closeMenu;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeMenu();
  };

  // OS選択
  overlay.querySelectorAll("[data-os-nav]").forEach((btn) => {
    btn.onclick = () => {
      const osKey = btn.getAttribute("data-os-nav");
      closeMenu();
      nav(`#list?os=${encodeURIComponent(osKey)}`);
    };
  });

  // 検索
  $("#mobileMenuSearch").onclick = () => {
    closeMenu();
    nav("#search?q=");
  };
}


// ========== 一覧 ==========
function sortById(cards) {
  return [...cards].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function buildTabStats(cards, maxTabs = 7, osKey = null) {
  const counts = new Map();
  cards.forEach((c) => {
    const k = String(c.tab || "").trim();
    if (!k) return;
    counts.set(k, (counts.get(k) || 0) + 1);
  });

  // 「その他」タブかどうかを判定するヘルパー関数
  const isOtherTab = (key) => key === "その他" || key.endsWith("その他");

  // 指定した順番でタブをソート（その他は右端に配置）
  const order = TAB_ORDER[osKey] ?? [];
  const sorted = [...counts.entries()].sort((a, b) => {
    const aKey = a[0];
    const bKey = b[0];
    const aIsOther = isOtherTab(aKey);
    const bIsOther = isOtherTab(bKey);
    
    // その他は常に最後
    if (aIsOther && !bIsOther) return 1;
    if (!aIsOther && bIsOther) return -1;
    if (aIsOther && bIsOther) return String(aKey).localeCompare(String(bKey), "ja");
    
    // 指定順序があればその順番を使用
    const aIndex = order.indexOf(aKey);
    const bIndex = order.indexOf(bKey);
    
    // 両方とも順序リストにある場合
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    // 片方だけ順序リストにある場合（リストにある方を先に）
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    // どちらも順序リストにない場合は日本語順
    return String(aKey).localeCompare(String(bKey), "ja");
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

function osSubtitle(osKey) {
  const meta = OS_META.find((m) => m.key === osKey);
  return meta ? meta.subtitle : "";
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
              <div class="sidebarCompactSub">${escapeHtml(osSubtitle(k))}</div>
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
  if (goSearch) goSearch.onclick = () => nav(`#search?q=`);
}

function renderList(osKey) {
  renderShell("list");
  const view = $("#view");

  const currentOS = OS_META.find((m) => m.key === osKey) ? osKey : "life";
  const meta = OS_META.find((m) => m.key === currentOS);

  const allCards = sortById(DATA.byOS[currentOS] ?? []);

  // ★タブ（OS内分類 / 2次フィルター）
  const tabStats = buildTabStats(allCards, 7, currentOS);
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
  const heroSubtitle = "自己啓発・心理学・行動科学・対人術・キャリア論などを ７つのOS・200の項目に集約した「処世術の体系書」";

  view.innerHTML = `
    <div class="list-layout has-mobile-sidebar">
      <div class="list-side">
        ${renderCompactSidebar(currentOS)}
      </div>

      <div class="list-main">
        <div class="list-hero">
          <div class="list-hero-title">処世術禄</div>
          <div class="list-hero-subtitle">${escapeHtml(heroSubtitle)}</div>
        </div>

        <div class="list-headline">
          <div class="title">${escapeHtml(meta?.title || currentOS)} の処世術一覧</div>
          <div class="count">
            件数：<b>${filtered.length}</b>
            <span class="count-sep">/</span>
            全体：<b>${allCards.length}</b>
          </div>
        </div>

        <div class="tabbar-wrap">
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
      <div class="scard-top">
        <div class="scard-head scard-click" data-open="${escapeHtml(c.id)}">
          <div class="scard-title-row">
            <span class="scard-num">${escapeHtml(c.id)}</span>
            <h3 class="scard-title">${title}</h3>
          </div>
          <p class="scard-summary">${summary}</p>
        </div>

        <div class="scard-side">
          <div class="favmini ${isFav ? "is-fav" : ""}" data-fav="${escapeHtml(c.id)}">
            <span class="star">${isFav ? "★" : "☆"}</span>
          </div>
        </div>
      </div>

      ${tags.length ? `
        <div class="scard-tags">
          ${tags.map((t) => { const escaped = escapeHtml(t); return `<span class="tagchip" data-tagchip="${escaped}">#${escaped}</span>`; }).join("")}
        </div>
      ` : ""}

      ${hasExpand ? `
        <div class="scard-expand" style="display:none;" data-expand="${escapeHtml(c.id)}">
          ${ess.length ? `<h4>要点</h4><ul>${ess.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
          ${pit.length ? `<h4>落とし穴</h4><ul>${pit.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
          ${strat.length ? `<h4>戦略</h4><ul>${strat.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
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
      nav(`#search?q=${encodeURIComponent(t)}`);
    };
  });
}

// ========== 検索 ==========
function renderSearch({ q }) {
  renderShell("list");
  const view = $("#view");

  const all = sortById(DATA.all);

  const query = String(q || "").trim().toLowerCase();

  let filtered = all;

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

  view.innerHTML = `
    <div class="list-layout has-mobile-sidebar">
      <div class="list-side">
        ${renderCompactSidebar(null)}
      </div>

      <div class="list-main">
        <div class="list-headline">
          <div class="title">検索（OS横断）</div>
          <div class="count">件数：<b>${filtered.length}</b><span class="count-sep">/</span>全体：<b>${all.length}</b></div>
        </div>

        <div class="search-form-wrap">
          <div class="grid">
            <input class="input" id="q" placeholder="キーワード（例：疲れ / 交渉 / 先延ばし）" value="${escapeHtml(q || "")}" />
            <div class="row">
              <button class="btn primary" id="doSearch">検索</button>
              <button class="btn ghost" id="clearSearch">クリア</button>
            </div>
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
    nav(`#search?q=${encodeURIComponent(nq)}`);
  };
  $("#clearSearch").onclick = () => nav(`#search?q=`);

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
        <div style="font-weight:900; margin-bottom:8px;">戦略</div>
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

  // OS別お気に入り統計
  const osFavStats = OS_META.map((m) => {
    const count = favList.filter((c) => c.os === m.key).length;
    return { key: m.key, title: m.title, subtitle: m.subtitle, count };
  }).filter((s) => s.count > 0);

  view.innerHTML = `
    <!-- マイページヒーロー -->
    <div class="mypage-hero">
      <div class="mypage-hero-icon">📚</div>
      <div class="mypage-hero-content">
        <h2 class="mypage-hero-title">マイページ</h2>
        <p class="mypage-hero-subtitle">お気に入りの処世術と個人カードを管理</p>
      </div>
    </div>

    <!-- 統計カード -->
    <div class="mypage-stats">
      <div class="mypage-stat-card stat-favorites">
        <div class="mypage-stat-icon">★</div>
        <div class="mypage-stat-info">
          <div class="mypage-stat-value">${favList.length}</div>
          <div class="mypage-stat-label">お気に入り</div>
        </div>
      </div>
      <div class="mypage-stat-card stat-personal">
        <div class="mypage-stat-icon">✎</div>
        <div class="mypage-stat-info">
          <div class="mypage-stat-value">${personal.length}</div>
          <div class="mypage-stat-label">個人カード</div>
        </div>
      </div>
    </div>

    ${osFavStats.length ? `
    <!-- OS別お気に入り分布 -->
    <div class="mypage-section">
      <div class="mypage-section-header">
        <span class="mypage-section-icon">📊</span>
        <span class="mypage-section-title">OS別お気に入り分布</span>
      </div>
      <div class="mypage-os-stats">
        ${osFavStats.map((s) => `
          <button class="mypage-os-stat-item" data-os-link="${escapeHtml(s.key)}">
            <span class="mypage-os-stat-sub">${escapeHtml(s.subtitle)}</span>
            <span class="mypage-os-stat-name">${escapeHtml(s.title)}</span>
            <span class="mypage-os-stat-count">${s.count}件</span>
          </button>
        `).join("")}
      </div>
    </div>
    ` : ""}

    <!-- お気に入り一覧 -->
    <div class="mypage-section">
      <div class="mypage-section-header">
        <span class="mypage-section-icon">★</span>
        <span class="mypage-section-title">お気に入り一覧</span>
        <span class="mypage-section-count">${favList.length}件</span>
      </div>
      <div class="cards-grid">
        ${favList.length ? favList.map((c) => renderCard(c)).join("") : `
          <div class="mypage-empty">
            <div class="mypage-empty-icon">☆</div>
            <div class="mypage-empty-text">まだお気に入りがありません</div>
            <div class="mypage-empty-hint">カード右上の☆をタップして追加</div>
          </div>
        `}
      </div>
    </div>

    <!-- 個人カード追加 -->
    <div class="mypage-section">
      <div class="mypage-section-header">
        <span class="mypage-section-icon">✎</span>
        <span class="mypage-section-title">個人カード追加</span>
      </div>
      <div class="mypage-form">
        <div class="mypage-form-row">
          <div class="mypage-form-field">
            <label class="mypage-form-label">ID *</label>
            <input class="input" id="pid" placeholder="例：X-001" />
          </div>
          <div class="mypage-form-field">
            <label class="mypage-form-label">タイトル *</label>
            <input class="input" id="ptitle" placeholder="1行で入力" />
          </div>
        </div>

        <div class="mypage-form-field">
          <label class="mypage-form-label">要約</label>
          <input class="input" id="psummary" placeholder="カードの概要（1行）" />
        </div>

        <div class="mypage-form-field">
          <label class="mypage-form-label">要点</label>
          <textarea class="input" id="pessence" placeholder="改行区切りで入力"></textarea>
        </div>

        <div class="mypage-form-field">
          <label class="mypage-form-label">落とし穴</label>
          <textarea class="input" id="ppitfalls" placeholder="改行区切りで入力"></textarea>
        </div>

        <div class="mypage-form-field">
          <label class="mypage-form-label">戦略</label>
          <textarea class="input" id="pstrategy" placeholder="改行区切りで入力"></textarea>
        </div>

        <div class="mypage-form-field">
          <label class="mypage-form-label">タグ</label>
          <input class="input" id="ptags" placeholder="カンマ区切り（例：習慣,生産性）" />
        </div>

        <div class="mypage-form-actions">
          <button class="btn primary" id="savePersonal">
            <span>カードを保存</span>
          </button>
          <span id="personalInfo" class="mypage-form-info"></span>
        </div>
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

  $("#personalInfo").textContent = `保存済み：${personal.length}件`;
  
  // OS別統計のクリックイベント
  view.querySelectorAll("[data-os-link]").forEach((btn) => {
    btn.onclick = () => {
      const osKey = btn.getAttribute("data-os-link");
      nav(`#list?os=${encodeURIComponent(osKey)}`);
    };
  });

  bindCardEvents();
}

// ========== ルーティング ==========
async function boot() {
  await loadAll();

  const onRoute = () => {
    const hash = location.hash || "#list?os=life";

    if (hash.startsWith("#list")) {
      const q = parseQuery(hash.split("?")[1] || "");
      const os = q.os || "life";
      return renderList(os);
    }

    if (hash.startsWith("#search")) {
      const q = parseQuery(hash.split("?")[1] || "");
      return renderSearch({ q: q.q || "" });
    }

    if (hash.startsWith("#detail")) {
      const q = parseQuery(hash.split("?")[1] || "");
      return renderDetail(q.id || "");
    }

    if (hash.startsWith("#my")) return renderMy();

    // Default: redirect to list
    renderList("life");
  };

  window.addEventListener("hashchange", onRoute);
  onRoute();
}

boot();
