/* =========================================================
   Shoseijutsu Roku – Minimal SPA (no build)
   - Top: OS selection (4x2)
   - OS list: reads /data/*.json
   - Detail
   - Favorites (localStorage)
   ========================================================= */

const $ = (sel) => document.querySelector(sel);

const COPY = `情報の洪水に惑わされないためには、点在する情報ではなく“構造化された知恵”が必要。
本書は、自己啓発・心理学・行動科学・対人術・キャリア論などを 5つのOS・195の項目 に集約した「処世術の体系書」です。`;

const OS_META = [
  { key: "life",          name: "人生OS",                 note: "前提を整える起動画面", file: "life.json" },
  { key: "internal",      name: "心の持ち方（内部OS）",   note: "感情・思考・判断軸",   file: "internal.json" },
  { key: "interpersonal", name: "人との関わり方（対人OS）", note:"距離感・衝突・信頼",    file: "interpersonal.json" },
  { key: "social",        name: "社会との向き合い方（社会OS）", note:"組織・制度・暗黙知", file: "social.json" },
  { key: "action",        name: "行動の選び方（行動OS）", note:"動く／待つ／やめる",      file: "action.json" },
  { key: "future",        name: "未来への備え方（未来OS）", note:"不確実性・長期戦略",     file: "future.json" },
  { key: "extra",         name: "追加OS（仮）",           note:"実験・遊び枠",             file: "extra.json" },
  { key: "mypage",        name: "マイページ（β）",        note:"お気に入り／個人追加",     file: null }
];

const STORAGE_KEY_FAV = "shoseijutsu_favorites_v1";
const STORAGE_KEY_PERSONAL = "shoseijutsu_personal_cards_v1";

function loadJSON(path){
  return fetch(path).then(r => {
    if(!r.ok) throw new Error(`Failed to load: ${path}`);
    return r.json();
  });
}

function getFavs(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_FAV) || "[]"); }
  catch { return []; }
}
function setFavs(ids){
  localStorage.setItem(STORAGE_KEY_FAV, JSON.stringify(ids));
}
function toggleFav(id){
  const favs = new Set(getFavs());
  if(favs.has(id)) favs.delete(id); else favs.add(id);
  setFavs([...favs]);
}

function getPersonal(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_PERSONAL) || "[]"); }
  catch { return []; }
}
function setPersonal(cards){
  localStorage.setItem(STORAGE_KEY_PERSONAL, JSON.stringify(cards));
}

/* ---------------- State ---------------- */
const state = {
  route: { page: "top", os: null, id: null },
  data: {},        // osKey -> cards[]
  loading: false,
  error: null,
};

function parseHash(){
  const h = (location.hash || "#top").replace(/^#/, "");
  // patterns:
  // top
  // os/internal
  // card/internal/I-001
  // mypage
  const parts = h.split("/").filter(Boolean);
  if(parts.length === 0 || parts[0] === "top") return { page:"top" };
  if(parts[0] === "mypage") return { page:"mypage" };
  if(parts[0] === "os" && parts[1]) return { page:"os", os: parts[1] };
  if(parts[0] === "card" && parts[1] && parts[2]) return { page:"card", os: parts[1], id: parts[2] };
  return { page:"top" };
}

function setHash(next){
  if(next.page === "top") location.hash = "#top";
  else if(next.page === "mypage") location.hash = "#mypage";
  else if(next.page === "os") location.hash = `#os/${next.os}`;
  else if(next.page === "card") location.hash = `#card/${next.os}/${next.id}`;
  else location.hash = "#top";
}

/* ---------------- Data Loading ---------------- */
async function ensureOSLoaded(osKey){
  if(osKey === "mypage") return;
  if(state.data[osKey]) return;

  const meta = OS_META.find(m => m.key === osKey);
  if(!meta || !meta.file) return;

  state.loading = true;
  state.error = null;
  render();

  try{
    const cards = await loadJSON(`./data/${meta.file}`);
    // merge personal into extra? keep personal separate, but show in mypage.
    state.data[osKey] = Array.isArray(cards) ? cards : [];
  }catch(e){
    state.error = e.message || String(e);
  }finally{
    state.loading = false;
    render();
  }
}

async function ensureAllLoaded(){
  // load all OS json except mypage (lightweight)
  for(const m of OS_META){
    if(m.file) await ensureOSLoaded(m.key);
  }
}

/* ---------------- UI Helpers ---------------- */
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function headerHTML(){
  const page = state.route.page;
  const active = (p) => page === p ? "active" : "";
  return `
    <header>
      <div class="header-inner">
        <div class="brand">
          <div class="title">処世術禄</div>
          <div class="sub">構造化された知恵の体系書</div>
        </div>
        <div class="nav">
          <button class="${active("top")}"   data-nav="top">トップ</button>
          <button class="${active("os")}"    data-nav="os">処世術一覧</button>
          <button class="${active("mypage")}" data-nav="mypage">マイページ</button>
        </div>
      </div>
    </header>
  `;
}

/* ---------------- Pages ---------------- */
function topPageHTML(){
  // 8 tiles fixed: 4×2
  const tiles = OS_META.map(m => `
    <div class="os-tile" data-open="${m.key}">
      <div class="os-name">${escapeHtml(m.name)}</div>
      <div class="os-note">${escapeHtml(m.note)}</div>
    </div>
  `).join("");

  return `
    <div class="card">
      <h1 style="margin:0 0 8px 0;">処世術禄</h1>
      <p style="white-space:pre-line;margin:0;">${escapeHtml(COPY)}</p>
    </div>

    <div class="section">
      <div class="section-title">OSを選択</div>
      <div class="os-grid">
        ${tiles}
      </div>
    </div>
  `;
}

function osPageHTML(osKey){
  const meta = OS_META.find(m => m.key === osKey);
  const cards = state.data[osKey] || [];

  // search + tag filter
  const allTags = [...new Set(cards.flatMap(c => Array.isArray(c.tags) ? c.tags : []))].sort();
  const q = state.route.q || "";
  const tag = state.route.tag || "";

  const filtered = cards.filter(c => {
    const hay = `${c.id||""} ${c.title||""} ${c.summary||""} ${(c.tags||[]).join(" ")}`.toLowerCase();
    const okQ = !q || hay.includes(q.toLowerCase());
    const okT = !tag || (Array.isArray(c.tags) && c.tags.includes(tag));
    return okQ && okT;
  }).sort((a,b)=> String(a.id||"").localeCompare(String(b.id||"")));

  const tagOptions = [`<option value="">（タグ）</option>`]
    .concat(allTags.map(t => `<option value="${escapeHtml(t)}" ${t===tag?"selected":""}>${escapeHtml(t)}</option>`))
    .join("");

  const list = filtered.map(c => {
    const favs = new Set(getFavs());
    const isFav = favs.has(c.id);
    const tags = (c.tags||[]).slice(0,6).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("");
    return `
      <div class="card">
        <div class="card-id">${escapeHtml(c.id||"")}</div>
        <div class="card-title">${escapeHtml(c.title||"")}</div>
        <div class="card-summary">${escapeHtml(c.summary||"")}</div>
        ${tags ? `<div class="tags">${tags}</div>` : ""}
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <button class="primary" data-card-open="${osKey}::${escapeHtml(c.id)}">開く</button>
          <button class="ghost" data-fav="${escapeHtml(c.id)}">${isFav ? "★ お気に入り解除" : "☆ お気に入り"}</button>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="card">
      <h2 style="margin:0 0 6px 0;">${escapeHtml(meta?.name || osKey)}</h2>
      <p style="margin:0;" class="muted">${escapeHtml(meta?.note || "")}</p>
      <hr/>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input id="searchInput" type="search" placeholder="検索（タイトル／要約／タグ）"
          value="${escapeHtml(q)}"
          style="flex:1;min-width:220px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,.18);"/>
        <select id="tagSelect"
          style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,.18);">
          ${tagOptions}
        </select>
        <button class="ghost" data-clear-filters="1">クリア</button>
      </div>
      <p class="muted" style="margin:10px 0 0 0;">表示：${filtered.length}件</p>
    </div>
    ${list || `<div class="card"><p class="muted" style="margin:0;">該当カードがありません。</p></div>`}
  `;
}

function cardDetailHTML(osKey, id){
  const meta = OS_META.find(m => m.key === osKey);
  const cards = state.data[osKey] || [];
  const c = cards.find(x => String(x.id) === String(id));
  if(!c){
    return `<div class="card"><p class="muted" style="margin:0;">カードが見つかりません。</p></div>`;
  }
  const favs = new Set(getFavs());
  const isFav = favs.has(c.id);
  const tags = (c.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("");

  const section = (title, body) => `
    <div class="section">
      <div class="section-title">${escapeHtml(title)}</div>
      <div class="card" style="margin-bottom:0;">
        <div style="white-space:pre-wrap;">${escapeHtml(body || "")}</div>
      </div>
    </div>
  `;

  return `
    <div class="card">
      <div class="card-id">${escapeHtml(c.id||"")}</div>
      <h2 style="margin:0 0 8px 0;">${escapeHtml(c.title||"")}</h2>
      <p style="margin:0;" class="muted">${escapeHtml(meta?.name || osKey)} / ${escapeHtml(meta?.note || "")}</p>

      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        <button class="ghost" data-back-os="${osKey}">← 一覧へ</button>
        <button class="ghost" data-fav="${escapeHtml(c.id)}">${isFav ? "★ お気に入り解除" : "☆ お気に入り"}</button>
      </div>

      ${tags ? `<div class="tags" style="margin-top:12px;">${tags}</div>` : ""}
    </div>

    ${section("分かりやすい要約", c.summary)}
    ${section("本質", c.essence)}
    ${section("落とし穴", c.pitfalls)}
    ${section("戦略", c.strategy)}

    <div class="card" style="margin-top:18px;">
      <p class="muted" style="margin:0;">このカードはここで完結します。</p>
    </div>
  `;
}

function myPageHTML(){
  const favIds = getFavs();
  const personal = getPersonal();

  const favCards = [];
  for(const m of OS_META){
    if(!m.file) continue;
    const cards = state.data[m.key] || [];
    for(const c of cards){
      if(favIds.includes(c.id)) favCards.push({ os: m.key, ...c });
    }
  }
  favCards.sort((a,b)=> String(a.id||"").localeCompare(String(b.id||"")));

  const favList = favCards.map(c => `
    <div class="card">
      <div class="card-id">${escapeHtml(c.id)}</div>
      <div class="card-title">${escapeHtml(c.title)}</div>
      <div class="card-summary">${escapeHtml(c.summary)}</div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        <button class="primary" data-card-open="${c.os}::${escapeHtml(c.id)}">開く</button>
        <button class="ghost" data-fav="${escapeHtml(c.id)}">★ 解除</button>
      </div>
    </div>
  `).join("");

  const personalList = personal.map((c, idx) => `
    <div class="card">
      <div class="card-id">${escapeHtml(c.id || `P-${String(idx+1).padStart(3,"0")}`)}</div>
      <div class="card-title">${escapeHtml(c.title||"")}</div>
      <div class="card-summary">${escapeHtml(c.summary||"")}</div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        <button class="ghost" data-personal-del="${idx}">削除</button>
      </div>
    </div>
  `).join("");

  return `
    <div class="card">
      <h2 style="margin:0 0 6px 0;">マイページ（β）</h2>
      <p class="muted" style="margin:0;">お気に入りと個人追加（ローカル保存）</p>
    </div>

    <div class="section">
      <div class="section-title">お気に入り</div>
      ${favList || `<div class="card"><p class="muted" style="margin:0;">まだありません。</p></div>`}
    </div>

    <div class="section">
      <div class="section-title">個人追加（β）</div>
      <div class="card">
        <p class="muted" style="margin:0 0 10px 0;">※ ローカル保存（localStorage）です。</p>
        <div style="display:grid;gap:10px;">
          <input id="pTitle" placeholder="タイトル" style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,.18);" />
          <input id="pId" placeholder="ID（任意：例 P-001）" style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,.18);" />
          <textarea id="pSummary" placeholder="要約" rows="2" style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,.18);"></textarea>
          <textarea id="pEssence" placeholder="本質" rows="3" style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,.18);"></textarea>
          <textarea id="pPitfalls" placeholder="落とし穴" rows="3" style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,.18);"></textarea>
          <textarea id="pStrategy" placeholder="戦略" rows="3" style="padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,.18);"></textarea>
          <button class="primary" data-personal-add="1">追加</button>
        </div>
      </div>
      ${personalList || `<div class="card"><p class="muted" style="margin:0;">まだありません。</p></div>`}
    </div>
  `;
}

/* ---------------- Render ---------------- */
function render(){
  const root = $("#app");
  if(!root) return;

  root.innerHTML = `
    ${headerHTML()}
    <main>
      ${state.error ? `<div class="card"><p class="muted" style="margin:0;">Error: ${escapeHtml(state.error)}</p></div>` : ""}
      ${state.loading ? `<div class="card"><p class="muted" style="margin:0;">読み込み中...</p></div>` : ""}
      <div id="page"></div>
    </main>
    <div class="footer">処世術禄 – Shoseijutsu OS</div>
  `;

  const page = $("#page");
  const r = state.route;

  if(r.page === "top"){
    page.innerHTML = topPageHTML();
  }else if(r.page === "os"){
    page.innerHTML = `<div class="card"><p class="muted" style="margin:0;">OSを選択してください（トップのOSカードから入れます）。</p></div>`;
    // if os not set, show shortcut grid
    page.innerHTML = topPageHTML();
  }else if(r.page === "mypage"){
    page.innerHTML = myPageHTML();
  }else if(r.page === "card"){
    page.innerHTML = cardDetailHTML(r.os, r.id);
  }else{
    page.innerHTML = topPageHTML();
  }

  bindEvents();
}

function bindEvents(){
  // nav
  document.querySelectorAll("[data-nav]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const to = btn.getAttribute("data-nav");
      if(to === "top") setHash({page:"top"});
      if(to === "os") setHash({page:"top"});   // 一覧はトップのOS選択から入る
      if(to === "mypage") setHash({page:"mypage"});
    });
  });

  // open OS from tile
  document.querySelectorAll("[data-open]").forEach(el=>{
    el.addEventListener("click", async ()=>{
      const key = el.getAttribute("data-open");
      if(key === "mypage") return setHash({page:"mypage"});
      await ensureOSLoaded(key);
      // OS一覧を表示
      state.route = { page:"os", os:key, q:"", tag:"" };
      setHash({ page:"os", os:key });
    });
  });

  // if current route is os -> render list
  if(state.route.page === "os" && state.route.os){
    // ensure loaded then replace content with list
    (async ()=>{
      await ensureOSLoaded(state.route.os);
      const page = $("#page");
      if(page) page.innerHTML = osPageHTML(state.route.os);

      // bind list events after injection
      bindListAndDetailEvents();
    })();
  }else if(state.route.page === "card"){
    // detail page actions
    bindListAndDetailEvents();
  }else if(state.route.page === "mypage"){
    bindMyPageEvents();
  }
}

function bindListAndDetailEvents(){
  // open card
  document.querySelectorAll("[data-card-open]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const v = btn.getAttribute("data-card-open");
      const [os,id] = v.split("::");
      setHash({ page:"card", os, id });
    });
  });

  // favorites
  document.querySelectorAll("[data-fav]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-fav");
      toggleFav(id);
      // re-render current page
      routeChanged();
    });
  });

  // back to list
  document.querySelectorAll("[data-back-os]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const os = btn.getAttribute("data-back-os");
      setHash({ page:"os", os });
    });
  });

  // list filters
  const searchInput = $("#searchInput");
  const tagSelect = $("#tagSelect");
  const clearBtn = document.querySelector("[data-clear-filters]");
  if(searchInput){
    searchInput.addEventListener("input", ()=>{
      state.route.q = searchInput.value || "";
      const page = $("#page");
      if(page) page.innerHTML = osPageHTML(state.route.os);
      bindListAndDetailEvents();
    });
  }
  if(tagSelect){
    tagSelect.addEventListener("change", ()=>{
      state.route.tag = tagSelect.value || "";
      const page = $("#page");
      if(page) page.innerHTML = osPageHTML(state.route.os);
      bindListAndDetailEvents();
    });
  }
  if(clearBtn){
    clearBtn.addEventListener("click", ()=>{
      state.route.q = "";
      state.route.tag = "";
      const page = $("#page");
      if(page) page.innerHTML = osPageHTML(state.route.os);
      bindListAndDetailEvents();
    });
  }
}

function bindMyPageEvents(){
  // add personal
  const addBtn = document.querySelector("[data-personal-add]");
  if(addBtn){
    addBtn.addEventListener("click", ()=>{
      const title = ($("#pTitle")?.value || "").trim();
      if(!title) return alert("タイトルは必須です。");

      const card = {
        id: ($("#pId")?.value || "").trim() || null,
        title,
        summary: ($("#pSummary")?.value || "").trim(),
        essence: ($("#pEssence")?.value || "").trim(),
        pitfalls: ($("#pPitfalls")?.value || "").trim(),
        strategy: ($("#pStrategy")?.value || "").trim()
      };
      const list = getPersonal();
      list.unshift(card);
      setPersonal(list);
      routeChanged();
    });
  }

  // delete personal
  document.querySelectorAll("[data-personal-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = Number(btn.getAttribute("data-personal-del"));
      const list = getPersonal();
      list.splice(idx,1);
      setPersonal(list);
      routeChanged();
    });
  });

  // open fav card
  document.querySelectorAll("[data-card-open]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const v = btn.getAttribute("data-card-open");
      const [os,id] = v.split("::");
      setHash({ page:"card", os, id });
    });
  });

  // fav remove
  document.querySelectorAll("[data-fav]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-fav");
      toggleFav(id);
      routeChanged();
    });
  });
}

/* ---------------- Router ---------------- */
async function routeChanged(){
  state.route = parseHash();

  // If it's OS list, ensure data loaded
  if(state.route.page === "os" && state.route.os){
    await ensureOSLoaded(state.route.os);
  }
  // If it's card, ensure OS loaded
  if(state.route.page === "card" && state.route.os){
    await ensureOSLoaded(state.route.os);
  }
  // MyPage needs all to show favs reliably (load lazily once)
  if(state.route.page === "mypage"){
    // load all once (light)
    if(Object.keys(state.data).length === 0){
      await ensureAllLoaded();
    }
  }

  render();
}

window.addEventListener("hashchange", routeChanged);

/* ---------------- Boot ---------------- */
function boot(){
  // Ensure root container exists
  if(!$("#app")){
    const d = document.createElement("div");
    d.id = "app";
    document.body.appendChild(d);
  }
  routeChanged();
}
boot();
