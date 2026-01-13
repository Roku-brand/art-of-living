// =========================================================
// 処世術禄 app.js
// - サイドバー（OS）は左固定
// - 2次フィルター（タブ）= card.tab 参照
// - タグ検索 = card.tags のまま
// - JSONファイル名：life/internal/relation/operation/exection/adapt
// =========================================================

// ========== 設定 ==========
const OS_META = [
  { key: "life",      osId: "OS-01", title: "人生OS",       subtitle: "①迷わない行き方", desc: "判断基準（方向性・価値観・決断・意味）。", file: "./data/life.json" },
  { key: "internal",  osId: "OS-02", title: "内部心理OS",   subtitle: "②心の扱い方",     desc: "不安・自己否定・怒り・疲れ・回復。",       file: "./data/internal.json" },
  { key: "relation",  osId: "OS-03", title: "対人関係OS",   subtitle: "③人との関わり方", desc: "印象・距離感・信頼・境界線。",             file: "./data/relation.json" },
  { key: "operation", osId: "OS-04", title: "環境操作OS",   subtitle: "④影響力を行使する技術", desc: "報告・会議・交渉・評価・根回し。",         file: "./data/operation.json" },
  { key: "exection",  osId: "OS-05", title: "行動OS",       subtitle: "⑤行動・習慣の技術", desc: "着手・集中・習慣化・継続・仕組み化。",     file: "./data/exection.json" },
  { key: "adapt",     osId: "OS-06", title: "適応OS",       subtitle: "⑥キャッチアップの極意", desc: "変化察知・AI・キャリア・資産・撤退。",     file: "./data/adapt.json" },
  { key: "extra",     osId: "OS-07", title: "追加OS（仮）", subtitle: "⑦追加・実験枠",   desc: "調整枠・実験枠。",                          file: "./data/extra.json" }
];

// OS-ID to OS key mapping
const OS_ID_MAP = {};
OS_META.forEach(m => { OS_ID_MAP[m.osId] = m.key; });

const LS_FAV = "shoseijutsu:favorites";
const LS_PERSONAL = "shoseijutsu:personalCards";
const LS_USER = "shoseijutsu:user";

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

function createPersonalId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizePersonalData(raw) {
  if (!raw || typeof raw !== "object") return { folders: [] };
  if (!Array.isArray(raw.folders)) return { folders: [] };
  return {
    folders: raw.folders.map((folder) => ({
      id: String(folder.id ?? createPersonalId("folder")),
      name: String(folder.name ?? "未設定フォルダー").trim() || "未設定フォルダー",
      items: Array.isArray(folder.items)
        ? folder.items.map((item) => ({
          id: String(item.id ?? createPersonalId("tip")),
          text: String(item.text ?? "").trim()
        })).filter((item) => item.text)
        : []
    }))
  };
}

function migratePersonalCards(cards) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return { folders: [] };
  }
  const items = cards.map((card, index) => {
    const text = String(card?.title || card?.summary || "").trim();
    return {
      id: String(card?.id ?? `legacy-${index + 1}`),
      text: text || "（無題）"
    };
  });
  return {
    folders: [
      {
        id: "legacy-folder",
        name: "移行済みカード",
        items
      }
    ]
  };
}

function loadPersonalData() {
  const raw = readJSONSafe(localStorage.getItem(LS_PERSONAL));
  if (Array.isArray(raw)) {
    const migrated = migratePersonalCards(raw);
    savePersonalData(migrated);
    return migrated;
  }
  return normalizePersonalData(raw);
}

function savePersonalData(data) {
  localStorage.setItem(LS_PERSONAL, JSON.stringify(normalizePersonalData(data)));
}

// ========== ユーザー認証（ローカルストレージベース） ==========
function loadUser() {
  return readJSONSafe(localStorage.getItem(LS_USER)) ?? null;
}
function saveUser(user) {
  if (user) {
    localStorage.setItem(LS_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(LS_USER);
  }
}
function isLoggedIn() {
  return loadUser() !== null;
}
function login(username) {
  const user = {
    username: username,
    createdAt: new Date().toISOString()
  };
  saveUser(user);
  return user;
}
function logout() {
  saveUser(null);
}

// ページを再描画するためのヘルパー関数
function refreshPage() {
  const h = location.hash || "#my";
  nav("#temp");
  nav(h);
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
let DATA = { byOS: {}, all: [], situations: [], situationTips: [] };

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
  const results = await Promise.all(OS_META.map((m) => fetchOS(m.key)));

  OS_META.forEach((m, i) => { DATA.byOS[m.key] = results[i]; });

  DATA.all = OS_META.flatMap((m) => (DATA.byOS[m.key] ?? []));

  // シチュエーション別ページを読み込み
  try {
    const sitRes = await fetch("./data/situations.json", { cache: "no-store" });
    if (sitRes.ok) {
      DATA.situations = await sitRes.json();
    }
  } catch (e) {
    console.error("fetchSituations error:", e);
    DATA.situations = [];
  }

  // 状況別処世術データを読み込み
  try {
    const tipsRes = await fetch("./data/situation-tips.json", { cache: "no-store" });
    if (tipsRes.ok) {
      DATA.situationTips = await tipsRes.json();
    }
  } catch (e) {
    console.error("fetchSituationTips error:", e);
    DATA.situationTips = [];
  }
}

// ========== UI シェル ==========
function renderShell(activeTab) {
  const app = $("#app");
  const user = loadUser();
  const loggedIn = user !== null;

  app.innerHTML = `
    <div class="header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-main">
            <button class="hamburger-btn" id="hamburgerBtn" aria-label="メニュー">
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
            </button>
            <img class="brand-icon" src="./assets/icons/logo-compass-circuit.svg" alt="処世術禄の羅針盤アイコン" />
            <h1 class="brand-title" id="brandTitle">処世術禄</h1>
          </div>
        </div>
        <nav class="header-nav">
          <button class="header-nav-item ${activeTab === 'home' ? 'active' : ''}" data-nav="#home">トップ</button>
          <button class="header-nav-item ${activeTab === 'tips' ? 'active' : ''}" data-nav="#tips">ケース別処世術</button>
          <button class="header-nav-item ${activeTab === 'list' ? 'active' : ''}" data-nav="#list?os=life">体系処世術・OS</button>
          <button class="header-nav-item ${activeTab === 'my' ? 'active' : ''}" data-nav="#my">マイページ</button>
        </nav>
        <div class="header-right">
          <div class="header-search" id="headerSearch">
            <span class="header-search-icon" aria-hidden="true">🔍</span>
            <input class="header-search-input" id="headerSearchInput" type="text" placeholder="検索..." aria-label="検索" />
          </div>
          <button class="header-notification-btn" id="headerNotificationBtn" aria-label="通知">
            <span class="header-notification-icon">🔔</span>
            <span class="header-notification-badge" id="notificationBadge">3</span>
          </button>
          <button class="header-account-btn" id="headerAccountBtn" aria-label="アカウント">
            ${loggedIn ? `<span class="header-account-icon logged-in">👤</span>` : `<span class="header-account-icon">👤</span>`}
          </button>
        </div>
      </div>
    </div>

    <!-- アカウントモーダル -->
    <div class="login-modal-overlay" id="loginModalOverlay">
      <div class="login-modal" id="loginModal">
        ${loggedIn ? `
          <div class="login-modal-header">
            <span class="login-modal-title">アカウント管理</span>
            <button class="login-modal-close" id="loginModalClose" aria-label="閉じる">×</button>
          </div>
          <div class="login-modal-body">
            <div class="account-modal-info">
              <div class="account-modal-icon">👤</div>
              <div class="account-modal-details">
                <div class="account-modal-label">ユーザー名</div>
                <div class="account-modal-value">${escapeHtml(user?.username || "")}</div>
              </div>
            </div>
            <div class="account-modal-actions">
              <button class="btn ghost danger" id="btnModalLogout">ログアウト</button>
            </div>
          </div>
        ` : `
          <div class="login-modal-header">
            <span class="login-modal-title">ログイン</span>
            <button class="login-modal-close" id="loginModalClose" aria-label="閉じる">×</button>
          </div>
          <div class="login-modal-body">
            <div class="login-form-field">
              <label class="login-form-label">ユーザー名</label>
              <input class="input" id="loginUsername" placeholder="ユーザー名を入力" />
            </div>
            <div class="login-form-info" id="loginInfo"></div>
            <div class="login-form-actions">
              <button class="btn primary" id="btnDoLogin">ログイン</button>
            </div>
            <div class="login-form-note">
              ※ このアプリはデモ版です。任意のユーザー名でログインできます。
            </div>
          </div>
        `}
      </div>
    </div>

    <!-- モバイルメニュー -->
    <div class="mobile-menu-overlay" id="mobileMenuOverlay">
      <div class="mobile-menu-panel" id="mobileMenuPanel">
        <div class="mobile-menu-header">
          <span class="mobile-menu-title">メニュー</span>
          <button class="mobile-menu-close" id="mobileMenuClose" aria-label="閉じる">×</button>
        </div>
        <div class="mobile-menu-list">
          <button class="mobile-menu-item" id="mobileMenuHome">
            <span class="mobile-menu-subtitle">入口・俯瞰</span>
            <span class="mobile-menu-main">トップ</span>
            <span class="mobile-menu-desc">全体像と入口の選択</span>
          </button>
          <button class="mobile-menu-item" id="mobileMenuTips">
            <span class="mobile-menu-subtitle">即効性・具体論</span>
            <span class="mobile-menu-main">ケース別処世術</span>
            <span class="mobile-menu-desc">すぐに使える箇条書きの処世術</span>
          </button>
          <button class="mobile-menu-item" id="mobileMenuList">
            <span class="mobile-menu-subtitle">体系的に学ぶ</span>
            <span class="mobile-menu-main">体系処世術・OS</span>
            <span class="mobile-menu-desc">7つのOSで構成された処世術体系</span>
          </button>
          <button class="mobile-menu-item" id="mobileMenuMy">
            <span class="mobile-menu-subtitle">個人設定</span>
            <span class="mobile-menu-main">マイページ</span>
            <span class="mobile-menu-desc">お気に入り・ログイン管理</span>
          </button>
        </div>
      </div>
    </div>

    <div class="container" id="view"></div>
    <div class="page-end-band" aria-hidden="true"></div>
  `;

  // ログインモーダルの開閉（マイページから呼び出される）
  const loginOverlay = $("#loginModalOverlay");
  const loginModal = $("#loginModal");

  const closeLoginModal = () => {
    loginOverlay.classList.remove("is-open");
    loginModal.classList.remove("is-open");
    const usernameInput = $("#loginUsername");
    const loginInfo = $("#loginInfo");
    if (usernameInput) usernameInput.value = "";
    if (loginInfo) loginInfo.textContent = "";
  };

  const openAccountModal = () => {
    loginOverlay.classList.add("is-open");
    loginModal.classList.add("is-open");
  };

  const loginModalClose = $("#loginModalClose");
  if (loginModalClose) loginModalClose.onclick = closeLoginModal;

  loginOverlay.onclick = (e) => {
    if (e.target === loginOverlay) closeLoginModal();
  };

  // ヘッダーのアカウントボタン
  const headerAccountBtn = $("#headerAccountBtn");
  if (headerAccountBtn) {
    headerAccountBtn.onclick = openAccountModal;
  }

  // モーダル内のログアウトボタン
  const btnModalLogout = $("#btnModalLogout");
  if (btnModalLogout) {
    btnModalLogout.onclick = () => {
      logout();
      closeLoginModal();
      refreshPage();
    };
  }

  // ログイン処理
  const btnDoLogin = $("#btnDoLogin");
  if (btnDoLogin) {
    btnDoLogin.onclick = () => {
      const username = $("#loginUsername").value.trim();
      if (!username) {
        $("#loginInfo").textContent = "ユーザー名を入力してください。";
        return;
      }
      login(username);
      closeLoginModal();
      refreshPage();
    };
  }

  // ヘッダー検索機能
  const headerSearchInput = $("#headerSearchInput");
  if (headerSearchInput) {
    headerSearchInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        const query = headerSearchInput.value.trim();
        nav(`#search?q=${encodeURIComponent(query)}`);
      }
    };
  }

  // 通知ボタン（将来の機能拡張用）
  const headerNotificationBtn = $("#headerNotificationBtn");
  if (headerNotificationBtn) {
    headerNotificationBtn.onclick = () => {
      // 将来的に通知一覧を表示する機能を追加予定
      // 現時点では、この機能はプレースホルダーとして実装されています
      console.info("通知機能は準備中です。");
    };
  }

  // ハンバーガーメニューの開閉
  const overlay = $("#mobileMenuOverlay");
  const panel = $("#mobileMenuPanel");

  $("#hamburgerBtn").onclick = () => {
    overlay.classList.add("is-open");
    panel.classList.add("is-open");
  };

  // ブランドタイトルでトップページへ戻る
  const brandTitle = $("#brandTitle");
  if (brandTitle) {
    brandTitle.onclick = () => nav("#home");
  }

  // ヘッダーナビゲーション
  document.querySelectorAll(".header-nav-item[data-nav]").forEach((el) => {
    el.onclick = () => {
      const target = el.getAttribute("data-nav");
      if (target) nav(target);
    };
  });

  const closeMenu = () => {
    overlay.classList.remove("is-open");
    panel.classList.remove("is-open");
  };

  $("#mobileMenuClose").onclick = closeMenu;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeMenu();
  };

  // トップページ
  const mobileMenuHome = $("#mobileMenuHome");
  if (mobileMenuHome) {
    mobileMenuHome.onclick = () => {
      closeMenu();
      nav("#home");
    };
  }

  // ケース別処世術
  const mobileMenuTips = $("#mobileMenuTips");
  if (mobileMenuTips) {
    mobileMenuTips.onclick = () => {
      closeMenu();
      nav("#tips");
    };
  }

  // 体系処世術
  const mobileMenuList = $("#mobileMenuList");
  if (mobileMenuList) {
    mobileMenuList.onclick = () => {
      closeMenu();
      nav("#list?os=life");
    };
  }

  // マイページ
  const mobileMenuMy = $("#mobileMenuMy");
  if (mobileMenuMy) {
    mobileMenuMy.onclick = () => {
      closeMenu();
      nav("#my");
    };
  }
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

function renderCompactSidebar(currentOS, activeSituation = false, focusOsId = null) {
  const items = [
    "life", "internal", "relation", "operation", "exection", "adapt", "extra"
  ];
  
  // If focusOsId is provided, highlight that OS in the sidebar
  const focusedKey = focusOsId && OS_ID_MAP[focusOsId] ? OS_ID_MAP[focusOsId] : null;

  return `
    <div class="sidebarCompact">
      <div class="sidebarCompactTitle">処世術OS</div>

      <div class="sidebarCompactList" id="osbar">
        ${items.map((k) => {
          const isActive = (k === currentOS || k === focusedKey) && !activeSituation;
          return `
          <div class="sidebarCompactItem ${isActive ? "isActive" : ""}" data-os="${escapeHtml(k)}">
            <div class="sidebarCompactLeft">
              <div class="sidebarCompactSub">${escapeHtml(osSubtitle(k))}</div>
              <div class="sidebarCompactMain">${escapeHtml(osLabel(k))}</div>
            </div>
          </div>
        `;}).join("")}
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

function renderList(osKey, focusOsId = null) {
  renderShell("list");
  const view = $("#view");

  // If focus is provided, navigate to the corresponding OS
  let currentOS = OS_META.find((m) => m.key === osKey) ? osKey : "life";
  
  // If focusOsId is provided, find the corresponding OS
  if (focusOsId && OS_ID_MAP[focusOsId]) {
    currentOS = OS_ID_MAP[focusOsId];
  }
  
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
  const heroSubtitle = "行き方・心の扱い・対人関係などを7つのOSで整理した処世術一覧。";
  const showSystemHero = osKey === "life" && !focusOsId;
  const heroTitle = showSystemHero ? "体系処世術" : (meta?.title || currentOS);
  const heroDescription = showSystemHero ? "" : (meta?.desc || heroSubtitle);

  view.innerHTML = `
    <div class="list-hero-fullwidth ${focusOsId ? 'list-hero-focused' : ''}">
      <div class="list-hero-title">${escapeHtml(heroTitle)}</div>
      ${heroDescription ? `<div class="list-hero-subtitle">${escapeHtml(heroDescription)}</div>` : ""}
    </div>

    <div class="list-layout has-mobile-sidebar">
      <div class="list-side">
        ${renderCompactSidebar(currentOS, false, focusOsId)}
      </div>

      <div class="list-main">
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

  // If focus was provided, scroll to highlight the hero and remove focus class after animation
  if (focusOsId) {
    const hero = view.querySelector(".list-hero-focused");
    if (hero) {
      setTimeout(() => {
        hero.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      setTimeout(() => {
        hero.classList.remove("list-hero-focused");
      }, 3000);
    }
  }
}

function renderCard(c) {
  const favs = loadFavorites();
  const isFav = favs.has(String(c.id));
  const osKey = c.os || "extra";

  const title = escapeHtml(c.title || "");
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
        </div>

        <div class="scard-side">
          <div class="favmini ${isFav ? "is-fav" : ""}" data-fav="${escapeHtml(c.id)}">
            <span class="star">${isFav ? "★" : "☆"}</span>
          </div>
        </div>
      </div>

      ${hasExpand ? `
        <div class="scard-expand" style="display:none;" data-expand="${escapeHtml(c.id)}">
          ${ess.length ? `<h4>要点</h4><ul>${ess.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
          ${pit.length ? `<h4>落とし穴</h4><ul>${pit.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
          ${strat.length ? `<h4>戦略</h4><ul>${strat.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : ""}
          ${tags.length ? `
            <div class="scard-tags">
              ${tags.map((t) => { const escaped = escapeHtml(t); return `<span class="tagchip" data-tagchip="${escaped}">#${escaped}</span>`; }).join("")}
            </div>
          ` : ""}
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
  const personalData = loadPersonalData();
  const totalPersonalTips = personalData.folders.reduce((sum, folder) => sum + folder.items.length, 0);
  const folderOptions = personalData.folders.map((folder) => `
    <option value="${escapeHtml(folder.id)}">${escapeHtml(folder.name)}</option>
  `).join("");

  view.innerHTML = `
    <!-- マイページヒーロー -->
    <div class="mypage-hero">
      <div class="mypage-hero-icon">📚</div>
      <div class="mypage-hero-content">
        <h2 class="mypage-hero-title">マイページ</h2>
        <p class="mypage-hero-subtitle">お気に入りの処世術とマイ処世術を管理</p>
      </div>
    </div>

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

    <!-- マイ処世術一覧 -->
    <div class="mypage-section">
      <div class="mypage-section-header">
        <span class="mypage-section-icon">📚</span>
        <span class="mypage-section-title">マイ処世術一覧</span>
        <span class="mypage-section-count">${totalPersonalTips}件</span>
        <button class="mypage-add-folder-btn" id="showFolderForm" aria-label="フォルダーを追加">＋</button>
      </div>
      
      <!-- フォルダー作成フォーム（デフォルト非表示） -->
      <div class="mypage-folder-form" id="folderFormContainer" style="display: none;">
        <div class="mypage-folder-form-inner">
          <input class="input" id="folderName" placeholder="フォルダー名を入力" />
          <div class="mypage-folder-form-actions">
            <button class="btn primary" id="addFolder">作成</button>
            <button class="btn ghost" id="cancelFolderForm">キャンセル</button>
          </div>
        </div>
      </div>

      <div class="mypage-folders">
        ${personalData.folders.length ? personalData.folders.map((folder) => `
          <div class="mypage-folder-card" data-folder="${escapeHtml(folder.id)}">
            <button class="mypage-folder-header-btn" data-folder-toggle="${escapeHtml(folder.id)}" aria-expanded="false">
              <div class="mypage-folder-header-left">
                <span class="mypage-folder-icon">📁</span>
                <div class="mypage-folder-info">
                  <div class="mypage-folder-name">${escapeHtml(folder.name)}</div>
                  <div class="mypage-folder-count">${folder.items.length}件</div>
                </div>
              </div>
              <span class="mypage-folder-chevron">⌄</span>
            </button>
            <div class="mypage-folder-content" data-folder-content="${escapeHtml(folder.id)}" style="display: none;">
              <div class="mypage-folder-actions">
                <button class="btn ghost" data-folder-edit="${escapeHtml(folder.id)}">フォルダー名編集</button>
                <button class="btn ghost danger" data-folder-delete="${escapeHtml(folder.id)}">削除</button>
              </div>
              <div class="mypage-folder-tips">
                ${folder.items.length ? folder.items.map((item) => `
                  <div class="mypage-tip-item">
                    <span class="mypage-tip-text">${escapeHtml(item.text)}</span>
                    <div class="mypage-tip-actions">
                      <button class="btn ghost small" data-tip-edit="${escapeHtml(folder.id)}:${escapeHtml(item.id)}">編集</button>
                      <button class="btn ghost danger small" data-tip-delete="${escapeHtml(folder.id)}:${escapeHtml(item.id)}">削除</button>
                    </div>
                  </div>
                `).join("") : `
                  <div class="mypage-empty-small">
                    <div class="mypage-empty-text">まだ処世術がありません</div>
                  </div>
                `}
              </div>
              <div class="mypage-add-tip-form">
                <input class="input" data-tip-input="${escapeHtml(folder.id)}" placeholder="新しい処世術を入力..." />
                <button class="btn primary" data-add-tip="${escapeHtml(folder.id)}">追加</button>
              </div>
            </div>
          </div>
        `).join("") : `
          <div class="mypage-empty">
            <div class="mypage-empty-icon">📁</div>
            <div class="mypage-empty-text">フォルダーがまだありません</div>
            <div class="mypage-empty-hint">右上の＋をタップしてフォルダーを作成</div>
          </div>
        `}
      </div>
    </div>
  `;

  // フォルダー作成フォームの表示/非表示
  const showFolderFormBtn = $("#showFolderForm");
  const folderFormContainer = $("#folderFormContainer");
  const cancelFolderFormBtn = $("#cancelFolderForm");

  if (showFolderFormBtn && folderFormContainer) {
    showFolderFormBtn.onclick = () => {
      folderFormContainer.style.display = folderFormContainer.style.display === "none" ? "block" : "none";
    };
  }

  if (cancelFolderFormBtn && folderFormContainer) {
    cancelFolderFormBtn.onclick = () => {
      folderFormContainer.style.display = "none";
      const folderNameInput = $("#folderName");
      if (folderNameInput) folderNameInput.value = "";
    };
  }

  // フォルダー追加
  const addFolderBtn = $("#addFolder");
  if (addFolderBtn) {
    addFolderBtn.onclick = () => {
      const folderNameInput = $("#folderName");
      const name = folderNameInput?.value.trim();
      if (!name) {
        alert("フォルダー名を入力してください。");
        return;
      }
      const data = loadPersonalData();
      data.folders.push({
        id: createPersonalId("folder"),
        name,
        items: []
      });
      savePersonalData(data);
      refreshPage();
    };
  }

  // フォルダー展開/折りたたみ
  view.querySelectorAll("[data-folder-toggle]").forEach((btn) => {
    btn.onclick = () => {
      const folderId = btn.getAttribute("data-folder-toggle");
      const content = view.querySelector(`[data-folder-content="${CSS.escape(folderId)}"]`);
      if (content) {
        const isHidden = content.style.display === "none";
        content.style.display = isHidden ? "block" : "none";
        btn.setAttribute("aria-expanded", String(isHidden));
        btn.querySelector(".mypage-folder-chevron").style.transform = isHidden ? "rotate(180deg)" : "";
      }
    };
  });

  // フォルダー名編集
  view.querySelectorAll("[data-folder-edit]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const folderId = btn.getAttribute("data-folder-edit");
      const data = loadPersonalData();
      const folder = data.folders.find((f) => f.id === folderId);
      if (!folder) {
        alert("フォルダーが見つかりません。");
        return;
      }
      const newName = prompt("フォルダー名を編集してください", folder.name);
      if (!newName || !newName.trim()) return;
      folder.name = newName.trim();
      savePersonalData(data);
      refreshPage();
    };
  });

  // フォルダー削除
  view.querySelectorAll("[data-folder-delete]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const folderId = btn.getAttribute("data-folder-delete");
      const data = loadPersonalData();
      const folder = data.folders.find((f) => f.id === folderId);
      if (!folder) {
        alert("フォルダーが見つかりません。");
        return;
      }
      if (!confirm(`「${folder.name}」を削除しますか？\n（中の処世術${folder.items.length}件も削除されます）`)) return;
      data.folders = data.folders.filter((f) => f.id !== folderId);
      savePersonalData(data);
      refreshPage();
    };
  });

  // 処世術追加
  view.querySelectorAll("[data-add-tip]").forEach((btn) => {
    btn.onclick = () => {
      const folderId = btn.getAttribute("data-add-tip");
      const input = view.querySelector(`[data-tip-input="${CSS.escape(folderId)}"]`);
      const text = input?.value.trim();
      if (!text) {
        alert("処世術の内容を入力してください。");
        return;
      }
      const data = loadPersonalData();
      const folder = data.folders.find((f) => f.id === folderId);
      if (!folder) {
        alert("フォルダーが見つかりません。");
        return;
      }
      folder.items.push({
        id: createPersonalId("tip"),
        text
      });
      savePersonalData(data);
      refreshPage();
    };
  });

  // 処世術編集
  view.querySelectorAll("[data-tip-edit]").forEach((btn) => {
    btn.onclick = () => {
      const [folderId, tipId] = btn.getAttribute("data-tip-edit").split(":");
      const data = loadPersonalData();
      const folder = data.folders.find((f) => f.id === folderId);
      const tip = folder?.items?.find((item) => item.id === tipId);
      if (!tip) {
        alert("処世術が見つかりません。");
        return;
      }
      const nextText = prompt("処世術を編集してください（1行）", tip.text);
      if (!nextText) return;
      tip.text = nextText.trim();
      if (!tip.text) {
        alert("空欄にはできません。");
        return;
      }
      savePersonalData(data);
      refreshPage();
    };
  });

  // 処世術削除
  view.querySelectorAll("[data-tip-delete]").forEach((btn) => {
    btn.onclick = () => {
      const [folderId, tipId] = btn.getAttribute("data-tip-delete").split(":");
      const data = loadPersonalData();
      const folder = data.folders.find((f) => f.id === folderId);
      if (!folder) {
        alert("フォルダーが見つかりません。");
        return;
      }
      const tip = folder.items.find((item) => item.id === tipId);
      if (!tip) {
        alert("処世術が見つかりません。");
        return;
      }
      if (!confirm("この処世術を削除しますか？")) return;
      folder.items = folder.items.filter((item) => item.id !== tipId);
      savePersonalData(data);
      refreshPage();
    };
  });

  bindCardEvents();
}

// ========== 状況別処世術ページ（新規） ==========
// インデックススタイルで分類ごとに表示、処世術群ごとにページ遷移

function renderSituationTips() {
  renderShell("tips");
  const view = $("#view");

  const situationTipsData = DATA.situationTips || {};
  const categories = situationTipsData.categories || [];

  const sectionMap = [
    { title: "思考術", categoryIds: ["C-MENTAL", "C-ADAPT"] },
    { title: "対人術", categoryIds: ["C-RELATION"] },
    { title: "仕事術", categoryIds: ["C-BUSINESS"] },
    { title: "成功術", categoryIds: ["C-GOAL"] },
    { title: "人生術", categoryIds: ["C-LIFE"] }
  ];

  const buildSectionTopics = (ids) =>
    categories
      .filter((cat) => ids.includes(cat.categoryId))
      .flatMap((cat) => cat.topics || []);

  view.innerHTML = `
    <div class="tips-simple-layout">
      <div class="tips-simple-hero">ケース別処世術</div>
      ${sectionMap.map((section) => {
        const topics = buildSectionTopics(section.categoryIds);
        return `
          <section class="tips-simple-section">
            <h2 class="tips-simple-title">≪${escapeHtml(section.title)}≫</h2>
            <ul class="tips-simple-topics">
              ${topics.map((topic) => `
                <li class="tips-simple-topic">
                  <button class="tips-simple-topic-link" type="button" data-topic-id="${escapeHtml(topic.topicId)}">
                    <span class="tips-simple-topic-name">${escapeHtml(topic.name)}</span>
                    <span class="tips-simple-topic-meta">
                      <span class="tips-simple-topic-count">${(topic.items || []).length}件</span>
                      <span class="tips-simple-topic-arrow" aria-hidden="true">→</span>
                    </span>
                  </button>
                </li>
              `).join("")}
            </ul>
          </section>
        `;
      }).join("")}
    </div>
  `;

  // Handle click on topic links to navigate to the topic group page
  view.querySelectorAll(".tips-simple-topic-link[data-topic-id]").forEach((btn) => {
    btn.onclick = () => {
      const topicId = btn.getAttribute("data-topic-id");
      if (topicId) {
        nav(`#topic-group?id=${encodeURIComponent(topicId)}`);
      }
    };
  });
}

// ========== 処世術群詳細ページ ==========
function renderTopicGroupPage(topicId) {
  renderShell("tips");
  const view = $("#view");

  const situationTipsData = DATA.situationTips || {};
  const categories = situationTipsData.categories || [];

  // Find the topic by topicId
  let topic = null;
  let parentCategory = null;
  for (const cat of categories) {
    const found = (cat.topics || []).find((t) => t.topicId === topicId);
    if (found) {
      topic = found;
      parentCategory = cat;
      break;
    }
  }

  if (!topic) {
    view.innerHTML = `
      <div class="card section">
        <div class="title" style="font-weight:900;">処世術群が見つかりません</div>
        <div style="margin-top:10px;"><button class="btn" id="back">戻る</button></div>
      </div>
    `;
    $("#back").onclick = () => nav("#tips");
    return;
  }

  const items = topic.items || [];

  view.innerHTML = `
    <div class="topic-group-page">
      <div class="topic-group-header">
        <button class="btn ghost topic-group-back" id="backToTips">← ケース別処世術</button>
        <div class="topic-group-title-wrap">
          <h1 class="topic-group-title">${escapeHtml(topic.name)}</h1>
          <span class="topic-group-count">${items.length}件</span>
        </div>
      </div>
      <div class="topic-group-list">
        ${items.map((item, idx) => `
          <div class="topic-group-item">
            <span class="topic-group-item-num">${idx + 1}</span>
            <span class="topic-group-item-text">${escapeHtml(item.text)}</span>
            <div class="topic-group-item-refs">
              ${(item.refs || []).map(ref => `
                <button class="topic-group-ref-btn" data-card-ref="${escapeHtml(ref)}">${escapeHtml(ref)}</button>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  $("#backToTips").onclick = () => nav("#tips");

  // Handle card reference clicks
  view.querySelectorAll("[data-card-ref]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const cardId = btn.getAttribute("data-card-ref");
      nav(`#detail?id=${encodeURIComponent(cardId)}`);
    };
  });
}

// ========== ケース別処世術 カテゴリ詳細ページ ==========
function renderTipsCategoryDetail(categoryId) {
  renderShell("tips");
  const view = $("#view");

  const situationTipsData = DATA.situationTips || {};
  const categories = situationTipsData.categories || [];
  const category = categories.find((cat) => cat.categoryId === categoryId);

  if (!category) {
    view.innerHTML = `
      <div class="card section">
        <div class="title" style="font-weight:900;">カテゴリが見つかりません</div>
        <div style="margin-top:10px;"><button class="btn" id="back">戻る</button></div>
      </div>
    `;
    $("#back").onclick = () => nav("#tips");
    return;
  }

  const topics = category.topics || [];

  view.innerHTML = `
    <div class="tips-fullscreen">
      <div class="tips-fullscreen-header">
        <button class="btn ghost tips-back" id="backToTips">← 戻る</button>
        <div class="tips-category-badge">
          <span class="tips-category-badge-icon">${escapeHtml(category.icon || '📁')}</span>
          <span class="tips-category-badge-name">${escapeHtml(category.name)}</span>
        </div>
      </div>
      <div class="tips-topics-fullscreen-grid">
        ${topics.map((topic, topicIdx) => `
          <button class="tips-topic-btn" data-topic-nav="${escapeHtml(categoryId)}:${escapeHtml(topic.topicId || topicIdx)}">
            <span class="tips-topic-btn-name">${escapeHtml(topic.name)}</span>
            <span class="tips-topic-btn-count">${(topic.items || []).length}件</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;

  $("#backToTips").onclick = () => nav("#tips");

  // トピックボタンのクリックで詳細ページに遷移
  view.querySelectorAll("[data-topic-nav]").forEach((btn) => {
    btn.onclick = () => {
      const navId = btn.getAttribute("data-topic-nav");
      nav(`#tips-detail?id=${encodeURIComponent(navId)}`);
    };
  });
}

// ========== 状況別処世術 トピック詳細ページ ==========
function renderTipsTopicDetail(topicNavId) {
  renderShell("tips");
  const view = $("#view");

  const situationTipsData = DATA.situationTips || {};
  const categories = situationTipsData.categories || [];

  // topicNavId is in format "categoryId:topicId" or "categoryId:index"
  const [categoryId, topicId] = (topicNavId || "").split(":");
  
  // Find the category and topic
  const category = categories.find((cat) => cat.categoryId === categoryId);
  // Try to find by topicId first, fall back to index if it's a number
  let topic = category?.topics?.find((t) => t.topicId === topicId);
  if (!topic && category?.topics && !isNaN(parseInt(topicId))) {
    topic = category.topics[parseInt(topicId)];
  }

  if (!category || !topic) {
    view.innerHTML = `
      <div class="card section">
        <div class="title" style="font-weight:900;">トピックが見つかりません</div>
        <div style="margin-top:10px;"><button class="btn" id="back">戻る</button></div>
      </div>
    `;
    $("#back").onclick = () => nav("#tips");
    return;
  }

  const items = topic.items || [];

  view.innerHTML = `
    <div class="tips-fullscreen tips-detail-fullscreen">
      <div class="tips-fullscreen-header">
        <button class="btn ghost tips-back" id="backToCategory">← ${escapeHtml(category.name)}</button>
        <div class="tips-detail-title-wrap">
          <h1 class="tips-detail-title-simple">${escapeHtml(topic.name)}</h1>
          <span class="tips-detail-count-simple">${items.length}件</span>
        </div>
      </div>
      <div class="tips-detail-toggle-wrap">
        <button class="tips-detail-toggle" type="button" aria-expanded="false">一覧を開く</button>
      </div>
      <div class="tips-detail-list" hidden>
        ${items.map((item, idx) => `
          <div class="tips-detail-item">
            <span class="tips-detail-item-num">${idx + 1}</span>
            <span class="tips-detail-item-text">${escapeHtml(item.text)}</span>
            <div class="tips-detail-item-refs">
              ${(item.refs || []).map(ref => `
                <button class="tips-ref-btn" data-card-ref="${escapeHtml(ref)}">${escapeHtml(ref)}</button>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  $("#backToCategory").onclick = () => nav(`#tips-category?id=${encodeURIComponent(categoryId)}`);

  // カードIDクリックハンドラ - カード詳細を開く
  view.querySelectorAll("[data-card-ref]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const cardId = btn.getAttribute("data-card-ref");
      nav(`#detail?id=${encodeURIComponent(cardId)}`);
    };
  });

  const detailToggle = view.querySelector(".tips-detail-toggle");
  const detailList = view.querySelector(".tips-detail-list");
  if (detailToggle && detailList) {
    detailToggle.onclick = () => {
      const isHidden = detailList.hasAttribute("hidden");
      if (isHidden) {
        detailList.removeAttribute("hidden");
        detailToggle.textContent = "一覧を閉じる";
      } else {
        detailList.setAttribute("hidden", "");
        detailToggle.textContent = "一覧を開く";
      }
      detailToggle.setAttribute("aria-expanded", String(isHidden));
    };
  }
}

// ========== シチュエーション別ページ ==========
// カテゴリ順序と表示設定
const SITUATION_CATEGORIES = [
  { key: "成功・仕事力", icon: "🏆", desc: "成功と仕事で成果を出すための処世術" },
  { key: "対人関係・印象", icon: "🤝", desc: "人との関わり方と印象形成の処世術" },
  { key: "人間力・器量", icon: "🌟", desc: "人としての魅力と信頼を高める処世術" },
  { key: "組織・環境", icon: "🏢", desc: "組織の中で上手く立ち回る処世術" },
  { key: "内面・感情", icon: "💭", desc: "心と感情を整える処世術" },
  { key: "人生設計", icon: "🧭", desc: "人生の方向性と意思決定の処世術" }
];

function groupSituationsByCategory(situations) {
  const grouped = new Map();
  SITUATION_CATEGORIES.forEach((cat) => grouped.set(cat.key, []));
  
  situations.forEach((s) => {
    const cat = s.category || "";
    // Only add to existing categories (ignore uncategorized items)
    if (grouped.has(cat)) {
      grouped.get(cat).push(s);
    }
  });
  
  return grouped;
}

function renderSituationsList() {
  renderShell("list");
  const view = $("#view");

  const situations = DATA.situations || [];
  const grouped = groupSituationsByCategory(situations);

  view.innerHTML = `
    <div class="list-layout has-mobile-sidebar">
      <div class="list-side">
        ${renderCompactSidebar(null, true)}
      </div>

      <div class="list-main">
        <div class="list-hero situation-hero">
          <div class="list-hero-title">シチュエーション別まとめ</div>
          <div class="list-hero-subtitle">既存の処世術カードを「悩み」「なりたい状態」「詰まり感」から直接アクセスできる入口として再編成。抽象論ではなく、判断・行動・立ち回りの集合体として処世術を再提示する。</div>
        </div>

        <div class="list-headline">
          <div class="title">シチュエーション一覧</div>
          <div class="count">全 <b>${situations.length}</b> テーマ</div>
        </div>

        ${SITUATION_CATEGORIES.map((cat) => {
          const catSituations = grouped.get(cat.key);
          if (catSituations.length === 0) return "";
          return `
            <div class="situation-category-section">
              <div class="situation-category-header">
                <span class="situation-category-icon">${cat.icon}</span>
                <div class="situation-category-info">
                  <span class="situation-category-title">${escapeHtml(cat.key)}</span>
                  <span class="situation-category-desc">${escapeHtml(cat.desc)}</span>
                </div>
                <span class="situation-category-count">${catSituations.length}件</span>
              </div>
              <div class="situations-grid">
                ${catSituations.map((s) => {
                  const cardCount = (s.cards || []).length;
                  return `
                    <button class="situation-card" data-situation="${escapeHtml(s.id)}">
                      <div class="situation-card-num">${escapeHtml(s.id)}</div>
                      <div class="situation-card-title">${escapeHtml(s.title)}</div>
                      <div class="situation-card-aim">${escapeHtml(s.aim)}</div>
                      <div class="situation-card-meta">関連カード：${cardCount}件</div>
                    </button>
                  `;
                }).join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  bindSidebarActions(view);

  // シチュエーションカードのクリックイベント
  view.querySelectorAll("[data-situation]").forEach((el) => {
    el.onclick = () => {
      const id = el.getAttribute("data-situation");
      nav(`#situation?id=${encodeURIComponent(id)}`);
    };
  });
}

function renderSituationDetail(situationId) {
  renderShell("list");
  const view = $("#view");

  const situation = (DATA.situations || []).find((s) => s.id === situationId);

  if (!situation) {
    view.innerHTML = `
      <div class="card section">
        <div class="title" style="font-weight:900;">シチュエーションが見つかりません</div>
        <div style="margin-top:10px;"><button class="btn" id="back">戻る</button></div>
      </div>
    `;
    $("#back").onclick = () => history.back();
    return;
  }

  // カード情報を取得
  const cardIds = situation.cards || [];
  const cards = cardIds.map((id) => DATA.all.find((c) => c.id === id)).filter(Boolean);

  // 「人生を後悔させない人の処世術」特別対応
  const hasTheme = situation.theme && situation.theme.sections;

  view.innerHTML = `
    <div class="list-layout has-mobile-sidebar">
      <div class="list-side">
        ${renderCompactSidebar(null, true)}
      </div>

      <div class="list-main">
        <div class="situation-detail-hero">
          <button class="btn ghost situation-back" id="backToList">← シチュエーション一覧</button>
          <div class="situation-detail-num">${escapeHtml(situation.id)}</div>
          <h1 class="situation-detail-title">${escapeHtml(situation.title)}</h1>
          <p class="situation-detail-aim">${escapeHtml(situation.aim)}</p>
        </div>

        ${hasTheme ? renderThemeSections(situation.theme, cards) : ""}

        <div class="situation-cards-section">
          <div class="situation-section-header">
            <span class="situation-section-icon">📋</span>
            <span class="situation-section-title">該当する処世術カード</span>
            <span class="situation-section-count">${cards.length}件</span>
          </div>
          <div class="cards-grid" id="cards">
            ${cards.map((c) => renderCard(c)).join("")}
          </div>
        </div>
      </div>
    </div>
  `;

  bindSidebarActions(view);
  bindCardEvents();

  // Theme section card references - scroll to and expand the corresponding card
  view.querySelectorAll(".situation-theme-card-ref[data-open]").forEach((el) => {
    el.onclick = () => {
      const id = el.getAttribute("data-open");
      const box = view.querySelector(`[data-expand="${CSS.escape(id)}"]`);
      if (box) {
        // Show the expand box
        box.style.display = "block";
        // Scroll to the card
        const card = box.closest(".scard");
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    };
  });

  $("#backToList").onclick = () => nav("#situations");
}

function renderThemeSections(theme, allCards) {
  if (!theme || !theme.sections) return "";

  return `
    <div class="situation-theme-sections">
      ${theme.sections.map((section) => {
        const sectionCards = (section.cards || [])
          .map((id) => allCards.find((c) => c.id === id) || DATA.all.find((c) => c.id === id))
          .filter(Boolean);

        return `
          <div class="situation-theme-section">
            <h3 class="situation-theme-title">${escapeHtml(section.title)}</h3>
            <p class="situation-theme-desc">${escapeHtml(section.description)}</p>
            ${sectionCards.length > 0 ? `
              <div class="situation-theme-cards">
                ${sectionCards.map((c) => `
                  <div class="situation-theme-card-ref" data-open="${escapeHtml(c.id)}">
                    <span class="situation-theme-card-id">${escapeHtml(c.id)}</span>
                    <span class="situation-theme-card-title">${escapeHtml(c.title)}</span>
                  </div>
                `).join("")}
              </div>
            ` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// ========== トップページ（入口・俯瞰ハブ） ==========
function renderTopPage() {
  renderShell("home");
  const view = $("#view");

  // 数値データ（固定表示）
  const totalCases = 17;
  const totalTips = 203;
  const osCount = 7;

  view.innerHTML = `
    <div class="top-page top-page-classic">
      <section class="top-hero">
        <div class="top-hero-inner">
          <p class="top-hero-eyebrow">判断・立ち回りに特化した</p>
          <h1 class="top-hero-title">構造化ポータル</h1>
          <p class="top-hero-desc">社会科学と心理学を束ね、情報過多の時代に判断を構造化する。</p>
        </div>
      </section>

      <section class="top-stats-section classic">
        <div class="top-stat-item">
          <span class="top-stat-num">${totalCases}</span>
          <span class="top-stat-label">ケース</span>
        </div>
        <div class="top-stat-divider"></div>
        <div class="top-stat-item">
          <span class="top-stat-num">${totalTips}</span>
          <span class="top-stat-label">処世術</span>
        </div>
        <div class="top-stat-divider"></div>
        <div class="top-stat-item">
          <span class="top-stat-num">${osCount}</span>
          <span class="top-stat-label">OS</span>
        </div>
      </section>

      <section class="top-content-grid">
        <div class="top-content-main">
          <div class="top-panel">
            <div class="top-panel-header">
              <span class="top-panel-icon">📋</span>
              <span class="top-panel-title">ケース別処世術</span>
              <button class="top-panel-link" data-nav="#tips">一覧へ →</button>
            </div>
            <div class="top-panel-grid">
              <button class="top-panel-card" data-nav="#tips">
                <span class="top-panel-card-title">なぜか好かれる<span class="top-panel-card-arrow">→</span></span>
                <span class="top-panel-card-meta">対人印象・信頼</span>
              </button>
              <button class="top-panel-card" data-nav="#tips">
                <span class="top-panel-card-title">冷静でいられる<span class="top-panel-card-arrow">→</span></span>
                <span class="top-panel-card-meta">メンタル・思考</span>
              </button>
              <button class="top-panel-card" data-nav="#tips">
                <span class="top-panel-card-title">なめられない<span class="top-panel-card-arrow">→</span></span>
                <span class="top-panel-card-meta">対人・境界線</span>
              </button>
            </div>
          </div>

          <div class="top-panel">
            <div class="top-panel-header">
              <span class="top-panel-icon">🧩</span>
              <span class="top-panel-title">体系処世術・OS</span>
              <button class="top-panel-link" data-nav="#list?os=life">OS一覧 →</button>
            </div>
            <div class="top-panel-note">
              <p>OSとは、判断・行動を支える「処世術のフレームワーク」です。7つのOS体系で、迷わず動ける自分を構築します。</p>
            </div>
            <div class="top-panel-grid">
              <button class="top-panel-card" data-nav="#list?os=internal">
                <span class="top-panel-card-title">OS-02 内部心理OS<span class="top-panel-card-arrow">→</span></span>
                <span class="top-panel-card-meta">心の扱い方</span>
              </button>
              <button class="top-panel-card" data-nav="#list?os=adapt">
                <span class="top-panel-card-title">OS-06 適応OS<span class="top-panel-card-arrow">→</span></span>
                <span class="top-panel-card-meta">キャッチアップの極意</span>
              </button>
            </div>
          </div>
        </div>

        <div class="top-content-side">
          <div class="top-panel">
            <div class="top-panel-header">
              <span class="top-panel-icon">📌</span>
              <span class="top-panel-title">今週の注目処世術</span>
            </div>
            <div class="top-panel-list">
              <button class="top-panel-list-item" data-nav="#tips">なめられない人の処世術</button>
              <button class="top-panel-list-item" data-nav="#tips">変化に強い人の処世術</button>
              <button class="top-panel-list-item" data-nav="#tips">自信がある人の処世術</button>
            </div>
          </div>

          <div class="top-panel">
            <div class="top-panel-header">
              <span class="top-panel-icon">📘</span>
              <span class="top-panel-title">処世術禄について</span>
            </div>
            <div class="top-panel-note">
              <p>ケース別に「立ち回り」を整理し、体系処世術で判断の構造を学べるポータルです。情報過多の時代に、迷わない判断軸を提供します。</p>
              <button class="top-panel-link inline" data-nav="#list?os=life">体系処世術を読む →</button>
            </div>
          </div>
        </div>
      </section>

      <footer class="top-footer">
        <div class="top-footer-links">
          <a href="#" class="top-footer-link">プライバシー</a>
          <a href="#" class="top-footer-link">再頒布</a>
          <a href="#" class="top-footer-link">お問い合わせ</a>
        </div>
        <div class="top-footer-copy">© 処世術禄</div>
      </footer>
    </div>
  `;

  // クリックナビゲーション
  view.querySelectorAll("[data-nav]").forEach((el) => {
    el.onclick = () => {
      const target = el.getAttribute("data-nav");
      if (target) nav(target);
    };
  });
}

// ========== ルーティング ==========
async function boot() {
  await loadAll();

  const onRoute = () => {
    const hash = location.hash || "#home";

    if (hash.startsWith("#list")) {
      const q = parseQuery(hash.split("?")[1] || "");
      const os = q.os || "life";
      return renderList(os, q.focus || null);
    }

    if (hash.startsWith("#search")) {
      const q = parseQuery(hash.split("?")[1] || "");
      return renderSearch({ q: q.q || "" });
    }

    if (hash.startsWith("#detail")) {
      const q = parseQuery(hash.split("?")[1] || "");
      return renderDetail(q.id || "");
    }

    if (hash.startsWith("#situations")) return renderSituationsList();

    if (hash.startsWith("#situation")) {
      const q = parseQuery(hash.split("?")[1] || "");
      return renderSituationDetail(q.id || "");
    }

    if (hash.startsWith("#tips-category")) {
      const q = parseQuery(hash.split("?")[1] || "");
      return renderTipsCategoryDetail(q.id || "");
    }

    if (hash.startsWith("#tips-detail")) {
      const q = parseQuery(hash.split("?")[1] || "");
      return renderTipsTopicDetail(q.id || "");
    }

    if (hash.startsWith("#topic-group")) {
      const q = parseQuery(hash.split("?")[1] || "");
      return renderTopicGroupPage(q.id || "");
    }

    if (hash.startsWith("#tips")) {
      return renderSituationTips();
    }

    if (hash.startsWith("#my")) return renderMy();

    // Default: render top page (handles #home, #, empty hash, and any unknown routes)
    renderTopPage();
  };

  window.addEventListener("hashchange", onRoute);
  onRoute();
}

boot();
