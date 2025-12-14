// ========== 設定 ==========
const OS_META = [
  { key: "life", title: "人生OS", desc: "入口。全体像を掴む。", file: "./data/life.json" },
  { key: "internal", title: "心の扱い方（内部OS）", desc: "感情・思考・自己調整。", file: "./data/internal.json" },
  { key: "relation", title: "コミュニケーションの極意（対人OS）", desc: "距離感・交渉・信頼。", file: "./data/relation.json" },
  { key: "social", title: "社会での立ち回り（社会OS）", desc: "組織・政治・意思決定。", file: "./data/social.json" },
  { key: "action", title: "行動・習慣の技術（行動OS）", desc: "実行・習慣化・継続。", file: "./data/action.json" },
  { key: "future", title: "未来への対応策（未来OS）", desc: "AI時代の備え。", file: "./data/future.json" },
  { key: "extra", title: "追加OS（仮）", desc: "調整枠・実験枠。", file: "./data/extra.json" },
];

const LS_FAV = "shoseijutsu:favorites";
const LS_PERSONAL = "shoseijutsu:personalCards";

// ========== ユーティリティ ==========
const $ = (sel) => document.querySelector(sel);
const escapeHtml = (s) => (s ?? "").replace(/[&<>"']/g, c => ({
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

// ========== データ読み込み ==========
let DATA = {
  byOS: {},     // { life: [cards], ... }
  all: [],      // 全カード
};

async function fetchOS(osKey){
  const meta = OS_META.find(x => x.key === osKey);
  if (!meta) return [];
  try {
    const res = await fetch(meta.file, { cache: "no-store" });
    if (!res.ok) throw new Error(`${meta.file} ${res.status}`);
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch (e) {
    console.error("fetchOS error:", e);
    return [];
  }
}

async function loadAll(){
  const personal = loadPersonalCards();
  const results = await Promise.all(OS_META.map(m => fetchOS(m.key)));
  OS_META.forEach((m, i) => { DATA.byOS[m.key] = results[i]; });

  // personal を extra として混ぜる（要件：extra / personal 扱い）
  const mergedExtra = [...(DATA.byOS.extra ?? []), ...personal.map(x => ({...x, os:"extra"}))];
  DATA.byOS.extra = mergedExtra;

  DATA.all = OS_META.flatMap(m => (DATA.byOS[m.key] ?? []));
}

// ========== ルーター ==========
const Routes = {
  HOME: "home",
  LIST: "list",       // #list?os=internal
  DETAIL: "detail",   // #detail?id=L-001
  MY: "my",           // #my
};

function nav(hash){
  location.hash = hash;
}

function parseQuery(qs){
  const out = {};
  (qs || "").replace(/^\?/, "").split("&").filter(Boolean).forEach(kv=>{
    const [k,v] = kv.split("=");
    out[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  });
  return out;
}

// ========== UI レンダリング ==========
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
          <button class="btn ghost" id="btnHome">Home</button>
          <button class="btn ghost" id="btnMy">My</button>
        </div>
      </div>
    </div>

    <div class="container" id="view"></div>

    <div class="bottom-nav">
      <div class="inner">
        <button class="navbtn ${activeTab==="home"?"active":""}" data-nav="#home">Home</button>
        <button class="navbtn ${activeTab==="life"?"active":""}" data-nav="#list?os=life">人生OS</button>
        <button class="navbtn ${activeTab==="list"?"active":""}" data-nav="#list?os=internal">一覧</button>
        <button class="navbtn ${activeTab==="my"?"active":""}" data-nav="#my">My</button>
      </div>
    </div>
  `;

  $("#btnHome").onclick = ()=> nav("#home");
  $("#btnMy").onclick = ()=> nav("#my");
  document.querySelectorAll("[data-nav]").forEach(b=>{
    b.onclick = ()=> nav(b.getAttribute("data-nav"));
  });
}

function renderHome(){
  renderShell("home");
  const view = $("#view");

  const copy = `情報の洪水に終止符。これが決定版。
自己啓発・心理学・行動科学・対人術・キャリア論などを 5つのOS・195の項目 に集約した「処世術の体系書」`;

  view.innerHTML = `
    <div class="card hero">
      <div class="hero-title">処世術禄</div>
      <p class="hero-copy">${escapeHtml(copy)}</p>
      <div class="row">
        <button class="btn primary" id="goLife">人生OSへ</button>
        <span class="subtle">※「7つのOS・200項目」は将来の目標値として固定表示</span>
      </div>
      <div class="section subtle">7つのOS・200項目（目標）</div>
    </div>

    <div class="section card" style="padding:14px;">
      <div class="row">
        <div>
          <div style="font-size:14px; color:var(--muted); margin-bottom:6px;">OSを選ぶ</div>
          <div class="small">辞書機能が主役。Myはβです。</div>
        </div>
      </div>

      <div class="grid os section">
        ${OS_META.map(m => `
          <div class="card os-tile" data-os="${m.key}">
            <h3>${escapeHtml(m.title)}</h3>
            <p>${escapeHtml(m.desc)}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  $("#goLife").onclick = ()=> nav("#list?os=life");
  view.querySelectorAll("[data-os]").forEach(el=>{
    el.onclick = ()=> nav(`#list?os=${el.getAttribute("data-os")}`);
  });
}

function buildTagSet(cards){
  const set = new Set();
  cards.forEach(c => (c.tags||[]).forEach(t => set.add(t)));
  return [...set].sort((a,b)=>a.localeCompare(b, "ja"));
}

function sortById(cards){
  return [...cards].sort((a,b)=> String(a.id).localeCompare(String(b.id)));
}

function matchCard(card, q){
  if (!q) return true;
  const s = (q||"").toLowerCase();
  const hay = [
    card.title, card.summary,
    ...(card.tags||[])
  ].join(" ").toLowerCase();
  return hay.includes(s);
}

function renderList(osKey){
  renderShell(osKey === "life" ? "life" : "list");
  const view = $("#view");

  const meta = OS_META.find(m=>m.key===osKey);
  const baseCards = DATA.byOS[osKey] ?? [];
  let cards = sortById(baseCards);

  const tags = buildTagSet(cards);

  view.innerHTML = `
    <div class="card" style="padding:14px;">
      <div class="row">
        <div>
          <div style="font-size:18px; margin-bottom:4px;">${escapeHtml(meta?.title ?? "一覧")}</div>
          <div class="small">検索（タイトル/要約/タグ）、タグフィルタ、ソート（id順）</div>
        </div>
        <button class="btn" id="backHome">Homeへ</button>
      </div>
    </div>

    <div class="card section toolbar">
      <input class="input" id="q" placeholder="検索：タイトル / 要約 / タグ" />
      <select id="tag">
        <option value="">タグ（すべて）</option>
        ${tags.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")}
      </select>
      <select id="sort">
        <option value="id">ソート：id順（デフォルト）</option>
      </select>
    </div>

    <div class="card section list" id="list"></div>
  `;

  $("#backHome").onclick = ()=> nav("#home");

  const state = { q:"", tag:"" };

  const draw = ()=>{
    let filtered = cards.filter(c => matchCard(c, state.q));
    if (state.tag) filtered = filtered.filter(c => (c.tags||[]).includes(state.tag));
    filtered = sortById(filtered);

    const fav = loadFavorites();

    $("#list").innerHTML = filtered.map(c=>`
      <div class="card item">
        <div style="flex:1;">
          <div class="meta">
            <span class="badge id">${escapeHtml(c.id)}</span>
            <span class="badge">${escapeHtml(meta?.title ?? c.os)}</span>
          </div>
          <h4>${escapeHtml(c.title)}</h4>
          <div class="small">${escapeHtml(c.summary)}</div>
          <div class="tags">
            ${(c.tags||[]).map(t=>`<span class="badge tag ${t===state.tag?"active":""}" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`).join("")}
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; min-width:120px; align-items:flex-end;">
          <button class="btn primary" data-open="${escapeHtml(c.id)}">詳細</button>
          <button class="btn" data-fav="${escapeHtml(c.id)}">${fav.has(c.id) ? "★ お気に入り" : "☆ お気に入り"}</button>
        </div>
      </div>
    `).join("") || `<div class="small" style="padding:14px;">該当するカードがありません。</div>`;

    $("#list").querySelectorAll("[data-open]").forEach(b=>{
      b.onclick = ()=> nav(`#detail?id=${encodeURIComponent(b.getAttribute("data-open"))}`);
    });
    $("#list").querySelectorAll("[data-fav]").forEach(b=>{
      b.onclick = ()=>{
        const id = b.getAttribute("data-fav");
        const set = loadFavorites();
        if (set.has(id)) set.delete(id); else set.add(id);
        saveFavorites(set);
        draw();
      };
    });
    $("#list").querySelectorAll("[data-tag]").forEach(t=>{
      t.onclick = ()=>{
        const v = t.getAttribute("data-tag");
        state.tag = (state.tag === v) ? "" : v;
        $("#tag").value = state.tag;
        draw();
      };
    });
  };

  $("#q").addEventListener("input", (e)=>{ state.q = e.target.value; draw(); });
  $("#tag").addEventListener("change", (e)=>{ state.tag = e.target.value; draw(); });

  draw();
}

function findCardById(id){
  return DATA.all.find(c => c.id === id);
}

function renderDetail(id){
  renderShell("list");
  const view = $("#view");
  const card = findCardById(id);
  if (!card) {
    view.innerHTML = `<div class="card detail">カードが見つかりません：${escapeHtml(id)}</div>`;
    return;
  }
  const osTitle = (OS_META.find(m=>m.key===card.os)?.title) ?? card.os;
  const fav = loadFavorites();
  const isFav = fav.has(card.id);

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
          <button class="btn" id="backToList">戻る</button>
          <button class="btn primary" id="favBtn">${isFav ? "★ お気に入り" : "☆ お気に入り"}</button>
        </div>
      </div>

      <div class="kv">
        <h3>要約</h3>
        <p>${escapeHtml(card.summary)}</p>
      </div>

      <div class="kv">
        <h3>本質</h3>
        <p>${escapeHtml(card.essence)}</p>
      </div>

      <div class="kv">
        <h3>落とし穴</h3>
        <p>${escapeHtml(card.pitfalls)}</p>
      </div>

      <div class="kv">
        <h3>戦略</h3>
        <p>${escapeHtml(card.strategy)}</p>
      </div>

      <div class="tags">
        ${(card.tags||[]).map(t=>`<span class="badge">#${escapeHtml(t)}</span>`).join("")}
      </div>

      <div class="endcap">このカードはここで完結します</div>
    </div>
  `;

  $("#backToList").onclick = ()=>{
    nav(`#list?os=${encodeURIComponent(card.os || "life")}`);
  };
  $("#favBtn").onclick = ()=>{
    const set = loadFavorites();
    if (set.has(card.id)) set.delete(card.id); else set.add(card.id);
    saveFavorites(set);
    renderDetail(card.id);
  };
}

function renderMy(){
  renderShell("my");
  const view = $("#view");
  const fav = loadFavorites();
  const favorites = DATA.all.filter(c => fav.has(c.id));
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
          <span class="small">追加カードは extra として一覧に反映されます</span>
        </div>
      </div>

      <div class="section small" id="personalInfo"></div>
    </div>
  `;

  const renderFavList = ()=>{
    const html = favorites.length
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
    $("#favList").innerHTML = html;
    $("#favList").querySelectorAll("[data-open]").forEach(b=>{
      b.onclick = ()=> nav(`#detail?id=${encodeURIComponent(b.getAttribute("data-open"))}`);
    });
  };

  $("#clearFav").onclick = ()=>{
    saveFavorites(new Set());
    nav("#my"); // 再描画
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
    const card = {
      id,
      title,
      summary: $("#psummary").value.trim(),
      essence: $("#pessence").value.trim(),
      pitfalls: $("#ppitfalls").value.trim(),
      strategy: $("#pstrategy").value.trim(),
      tags: $("#ptags").value.split(",").map(s=>s.trim()).filter(Boolean),
      os: "extra"
    };
    const cards = loadPersonalCards();
    cards.push(card);
    savePersonalCards(cards);
    await loadAll();
    nav("#list?os=extra");
  };

  $("#personalInfo").textContent = `保存済みの個人追加カード：${personal.length}件`;

  renderFavList();
}

// ========== 起動 ==========
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
    // fallback
    renderHome();
  };

  window.addEventListener("hashchange", onRoute);
  onRoute();
}

boot();
