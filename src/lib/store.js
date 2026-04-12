// ── Persistent client-side store ──
// Data入れ込み flow was broken because every form/table held state in
// plain useState and never persisted anywhere. This module provides a
// small localStorage wrapper plus React hooks so that MonthlyLedger,
// JournalLedger and FileBox all survive navigation/reload and share a
// single source of truth that charts can derive from.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const NS = "ze:";
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB per file previewUrl cap

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

export function loadState(key, fallback) {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(NS + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveState(key, value) {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(NS + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// useState that persists to localStorage. Reads happen after mount to
// avoid SSR/hydration mismatches.
export function usePersistentState(key, initial) {
  const [state, setState] = useState(initial);
  const hydrated = useRef(false);

  useEffect(() => {
    const stored = loadState(key, undefined);
    if (stored !== undefined) setState(stored);
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated.current) return;
    saveState(key, state);
  }, [key, state]);

  return [state, setState];
}

// ── Monthly ledger (月別経費帳) ──
// Matches BooksPage.jsx initData shape: { 収入:{row:[12]}, 経費:{row:[12]} }
const EMPTY_MONTHLY_LEDGER = {
  "収入": {
    "現金売上":  [0,0,0,0,0,0,0,0,0,0,0,0],
    "掛売上":    [0,0,0,0,0,0,0,0,0,0,0,0],
    "家事消費等": [0,0,0,0,0,0,0,0,0,0,0,0],
  },
  "経費": {
    "現金仕入":  [0,0,0,0,0,0,0,0,0,0,0,0],
    "掛仕入":    [0,0,0,0,0,0,0,0,0,0,0,0],
    "租税公課":  [0,0,0,0,0,0,0,0,0,0,0,0],
    "荷造運賃":  [0,0,0,0,0,0,0,0,0,0,0,0],
    "水道光熱費": [0,0,0,0,0,0,0,0,0,0,0,0],
    "旅費交通費": [0,0,0,0,0,0,0,0,0,0,0,0],
    "通信費":    [0,0,0,0,0,0,0,0,0,0,0,0],
    "広告宣伝費": [0,0,0,0,0,0,0,0,0,0,0,0],
    "接待交際費": [0,0,0,0,0,0,0,0,0,0,0,0],
    "損害保険料": [0,0,0,0,0,0,0,0,0,0,0,0],
    "修繕費":    [0,0,0,0,0,0,0,0,0,0,0,0],
    "減価償却費": [0,0,0,0,0,0,0,0,0,0,0,0],
    "福利厚生費": [0,0,0,0,0,0,0,0,0,0,0,0],
    "給料賃金":  [0,0,0,0,0,0,0,0,0,0,0,0],
    "外注工賃":  [0,0,0,0,0,0,0,0,0,0,0,0],
    "利子割引料": [0,0,0,0,0,0,0,0,0,0,0,0],
    "地代家賃":  [0,0,0,0,0,0,0,0,0,0,0,0],
    "貸倒金":    [0,0,0,0,0,0,0,0,0,0,0,0],
    "雑費":      [0,0,0,0,0,0,0,0,0,0,0,0],
  },
};

export function useMonthlyLedger() {
  return usePersistentState("monthlyLedger:v1", EMPTY_MONTHLY_LEDGER);
}

// ── Journal ledger (仕訳帳) ──
export function useJournalRows() {
  const [rows, setRows] = usePersistentState("journalRows:v1", []);
  const addRow = useCallback((row) => {
    setRows(prev => [
      {
        id: Date.now() + Math.random(),
        date: row.date || "2026/02/20",
        debitAcc: row.debitAcc || "雑費",
        creditAcc: row.creditAcc || "現金",
        debit: Number(row.debit) || 0,
        credit: Number(row.credit) || Number(row.debit) || 0,
        memo: row.memo || "",
        st: row.st || "要確認",
        conf: typeof row.conf === "number" ? row.conf : 80,
      },
      ...prev,
    ]);
  }, [setRows]);
  return [rows, setRows, addRow];
}

// ── Uploaded files (ファイルボックス) ──
export function useUploadedFiles() {
  const [files, setFiles] = usePersistentState("uploadedFiles:v1", []);
  const addFile = useCallback((entry) => {
    const trimmed = { ...entry };
    // Drop oversized previews so localStorage doesn't explode.
    if (typeof trimmed.previewUrl === "string" && trimmed.previewUrl.length > MAX_FILE_BYTES) {
      trimmed.previewUrl = null;
      trimmed.isImage = false;
    }
    setFiles(prev => [...prev, trimmed]);
  }, [setFiles]);
  return [files, setFiles, addFile];
}

// ── Derived: expense breakdown for ChartMorphRing ──
// Sums MonthlyLedger 経費 rows and bucket them into the 6 pie slices
// Charts.jsx/Home.jsx expect. Values are in 百万 (millions) to match the
// existing display code (which multiplies by 100 to render as 万).
const EXPENSE_BUCKETS = [
  { label:"人件費", color:"rgba(168,155,255,.8)",  sources:["給料賃金","福利厚生費"] },
  { label:"外注費", color:"rgba(139,123,244,.55)", sources:["外注工賃"] },
  { label:"地代家賃",color:"rgba(120,108,220,.4)",  sources:["地代家賃"] },
  { label:"通信費", color:"rgba(100,90,200,.35)",  sources:["通信費"] },
  { label:"交際費", color:"rgba(80,70,180,.3)",    sources:["接待交際費"] },
  { label:"その他", color:"rgba(60,55,160,.25)",   sources:["現金仕入","掛仕入","租税公課","荷造運賃","水道光熱費","旅費交通費","広告宣伝費","損害保険料","修繕費","減価償却費","利子割引料","貸倒金","雑費"] },
];

const sumRow = (arr) => (arr || []).reduce((a, b) => a + (Number(b) || 0), 0);

export function useExpenseBreakdown() {
  const [ledger] = useMonthlyLedger();
  return useMemo(() => {
    const exp = (ledger && ledger["経費"]) || {};
    return EXPENSE_BUCKETS.map(b => ({
      label: b.label,
      color: b.color,
      value: b.sources.reduce((s, name) => s + sumRow(exp[name]), 0) / 1_000_000,
    }));
  }, [ledger]);
}

// ── Derived: 12 / 6 month revenue series ──
// MonthlyLedger months start at 4月 (index 0) and end at 3月 (index 11).
const LEDGER_MONTHS = ["4月","5月","6月","7月","8月","9月","10月","11月","12月","1月","2月","3月"];

function seriesFromLedger(ledger) {
  const inc = (ledger && ledger["収入"]) || {};
  const exp = (ledger && ledger["経費"]) || {};
  const rev = LEDGER_MONTHS.map((_, i) =>
    Object.values(inc).reduce((s, r) => s + (Number(r[i]) || 0), 0)
  );
  const ex = LEDGER_MONTHS.map((_, i) =>
    Object.values(exp).reduce((s, r) => s + (Number(r[i]) || 0), 0)
  );
  return LEDGER_MONTHS.map((label, i) => ({
    label,
    revenue: rev[i] / 1_000_000,
    expense: ex[i] / 1_000_000,
    profit: (rev[i] - ex[i]) / 1_000_000,
    clients: 0,
  }));
}

export function useChartSeries12() {
  const [ledger] = useMonthlyLedger();
  return useMemo(() => seriesFromLedger(ledger), [ledger]);
}

export function useChartSeries6() {
  const full = useChartSeries12();
  // Last 6 months chronologically. LEDGER_MONTHS is 4→3 (fiscal year),
  // so "last 6" = indices 6..11 = 10月〜3月.
  return useMemo(() => full.slice(6), [full]);
}
