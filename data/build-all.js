/**
 * 処世術禄 – all.json / all_index.json 自動生成スクリプト
 * --------------------------------------------------
 * - 編集対象：OS別JSONのみ
 * - 出力物：all.json / all_index.json
 * - 方針：軽量・非重複・完全互換
 */

const fs = require("fs");
const path = require("path");

/* ===== 設定 ===== */

const SOURCE_FILES = [
  { file: "life.json", os: "life" },
  { file: "internal.json", os: "internal" },
  { file: "relation.json", os: "relation" },
  { file: "social.json", os: "social" },
  { file: "action.json", os: "action" },
  { file: "future.json", os: "future" }
];

const OUTPUT_ALL = "all.json";
const OUTPUT_INDEX = "all_index.json";

/* ===== タグ正規化辞書 ===== */

const TAG_NORMALIZE_MAP = {
  "意思決定": "意思決定",
  "判断": "意思決定",
  "選択": "意思決定",

  "不安": "不安",
  "不確実性": "不安",

  "感情": "感情",
  "感情処理": "感情",

  "人間関係": "人間関係",
  "関係性": "人間関係",
  "対人": "人間関係",

  "戦略": "戦略",
  "設計": "設計",

  "更新": "更新",
  "メタ": "更新"
};

/* ===== ユーティリティ ===== */

function normalizeTags(tags = []) {
  const normalized = tags.map(t => TAG_NORMALIZE_MAP[t] || t);
  return [...new Set(normalized)];
}

function validateCard(card, os) {
  const requiredFields = [
    "id",
    "title",
    "summary",
    "essence",
    "strategy"
  ];

  requiredFields.forEach(field => {
    if (!(field in card)) {
      throw new Error(
        `❌ フィールド不足: ${field} (${card.id || "unknown"})`
      );
    }
  });

  if (!Array.isArray(card.essence)) {
    throw new Error(`❌ essence は配列である必要があります: ${card.id}`);
  }
  if (!Array.isArray(card.strategy)) {
    throw new Error(`❌ strategy は配列である必要があります: ${card.id}`);
  }

  card.os = os;
  card.tags = normalizeTags(card.tags || []);
  return card;
}

/* ===== メイン処理 ===== */

function build() {
  const allCards = [];
  const idSet = new Set();

  SOURCE_FILES.forEach(({ file, os }) => {
    if (!fs.existsSync(file)) return;

    const raw = fs.readFileSync(file, "utf-8");
    const cards = JSON.parse(raw);

    cards.forEach(card => {
      if (idSet.has(card.id)) {
        throw new Error(`❌ ID重複検出: ${card.id}`);
      }
      idSet.add(card.id);

      const validated = validateCard(card, os);
      allCards.push(validated);
    });
  });

  /* ===== all.json ===== */

  const allJson = {
    meta: {
      name: "処世術禄",
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      cardCount: allCards.length
    },
    cards: allCards
  };

  fs.writeFileSync(
    OUTPUT_ALL,
    JSON.stringify(allJson, null, 2),
    "utf-8"
  );

  /* ===== all_index.json ===== */

  const indexJson = {
    meta: {
      version: "1.0.0",
      generatedAt: new Date().toISOString()
    },
    index: allCards.map(card => ({
      id: card.id,
      os: card.os,
      title: card.title,
      tags: card.tags
    }))
  };

  fs.writeFileSync(
    OUTPUT_INDEX,
    JSON.stringify(indexJson, null, 2),
    "utf-8"
  );

  console.log("✅ all.json / all_index.json を生成しました");
  console.log(`   総カード数: ${allCards.length}`);
}

/* ===== 実行 ===== */

try {
  build();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
