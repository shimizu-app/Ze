import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, hd, bd, mono } from "../lib/theme";
import { Rv, Mag, BtnApprove, Card3, PageShell } from "./ui";
import { ChartMorphRing } from "./Charts";
import { useMonthlyLedger, useJournalRows, useExpenseBreakdown } from "../lib/store";

function JournalLedger({ compact, acctFilter, onAcctFilter }) {
  const [editRow, setEditRow] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState({ k: "date", d: "desc" });
  const [periodMode, setPeriodMode] = useState("month"); // month | year
  const [selectedMonth, setSelectedMonth] = useState("02");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [acctOpen, setAcctOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const closeAll = () => { setAcctOpen(false); setStatusOpen(false); setPeriodMode("month"); };

  const accounts = ["会議費","交際費","旅費交通費","消耗品費","通信費","外注費","広告宣伝費","地代家賃","水道光熱費","給料手当","法定福利費","福利厚生費","工具器具備品","雑費","研究開発費","支払手数料","新聞図書費","諸会費","租税公課","減価償却費"];

  const [rows, setRows] = useJournalRows();

  // acctFilter is now an array
  const acctArr = acctFilter || [];
  const toggleAcct = (acc) => {
    if (!onAcctFilter) return;
    if (acctArr.includes(acc)) onAcctFilter(acctArr.filter(a => a !== acc));
    else onAcctFilter([...acctArr, acc]);
  };

  const filtered = rows.filter(r => {
    // Period filter
    const yr = r.date.split("/")[0];
    const mon = r.date.split("/")[1];
    if (periodMode === "month" && selectedMonth !== "all" && mon !== selectedMonth) return false;
    if (periodMode === "month" && yr !== selectedYear) return false;
    // Status filter
    if (filter === "review" && r.st !== "要確認") return false;
    if (filter === "auto" && r.st !== "自動確定") return false;
    if (filter === "done" && r.st !== "承認済") return false;
    // Account filter (multi)
    if (acctArr.length > 0 && !acctArr.includes(r.debitAcc)) return false;
    return true;
  }).sort((a, b) => {
    if (sort.k === "date") return sort.d === "desc" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    if (sort.k === "amount") return sort.d === "desc" ? b.debit - a.debit : a.debit - b.debit;
    if (sort.k === "conf") return sort.d === "desc" ? b.conf - a.conf : a.conf - b.conf;
    return 0;
  });

  const toggleSort = (k) => setSort(prev => ({ k, d: prev.k === k && prev.d === "desc" ? "asc" : "desc" }));
  const stColor = (st) => st === "要確認" ? C.b1 : st === "自動確定" ? C.b4 : C.b2;
  const confColor = (c) => c >= 95 ? C.b4 : c >= 75 ? C.b3 : C.b1;
  const fmt = (n) => "¥" + n.toLocaleString();

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const approveRow = (id) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, st: "承認済" } : r));
    setEditRow(null);
  };

  const SortIcon = ({ k: key }) => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={sort.k === key ? C.blue : C.textMut} strokeWidth="2.5" style={{ marginLeft: 4, cursor: "pointer" }} onClick={() => toggleSort(key)}>
      <path d={sort.k === key && sort.d === "asc" ? "M2 6l3-3 3 3" : "M2 4l3 3 3-3"} />
    </svg>
  );

  return (
    <Card3 s={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
      {/* Header + Filter dropdowns */}
      <div style={{ padding: "18px 28px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 9, color: C.textMut, fontWeight: 500, letterSpacing: ".16em", textTransform: "uppercase", marginRight: 4 }}>仕訳帳</span>

        {/* Period dropdown */}
        <div style={{ position: "relative" }}>
          <Mag onClick={() => { const next = periodMode === "open" ? "month" : "open"; closeAll(); if (next === "open") setPeriodMode("open"); }} s={{ padding: "7px 14px", borderRadius: 18, border: `1.5px solid ${C.border}`, background: C.surface, color: C.dark, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: bd, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMut} strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="4"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            {selectedMonth === "all" ? `${selectedYear}年 全月` : `${selectedYear}年${Number(selectedMonth)}月`}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.textMut} strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </Mag>
          {periodMode === "open" && (
            <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 20, boxShadow: "0 8px 28px rgba(0,0,0,.5), 0 0 0 1px rgba(139,123,244,.06)", zIndex: 20, padding: "8px 0", minWidth: 160 }}>
              <div style={{ padding: "5px 14px", fontSize: 9, color: C.textMut, fontWeight: 500, letterSpacing: ".1em" }}>年度</div>
              {["2024","2025","2026"].map(y => (
                <Mag key={y} onClick={() => setSelectedYear(y)} s={{ display: "block", width: "100%", padding: "7px 14px", border: "none", background: selectedYear === y ? `${C.blue}08` : "transparent", color: selectedYear === y ? C.blue : C.dark, fontSize: 12, fontWeight: selectedYear === y ? 700 : 500, cursor: "pointer", fontFamily: bd, textAlign: "left" }}>{y}年</Mag>
              ))}
              <div style={{ borderTop: `1px solid ${C.borderLt}`, margin: "4px 0" }} />
              <div style={{ padding: "5px 14px", fontSize: 9, color: C.textMut, fontWeight: 500, letterSpacing: ".1em" }}>月</div>
              <Mag onClick={() => { setSelectedMonth("all"); setPeriodMode("month"); }} s={{ display: "block", width: "100%", padding: "7px 14px", border: "none", background: selectedMonth === "all" ? `${C.blue}08` : "transparent", color: selectedMonth === "all" ? C.blue : C.dark, fontSize: 12, fontWeight: selectedMonth === "all" ? 700 : 500, cursor: "pointer", fontFamily: bd, textAlign: "left" }}>全月</Mag>
              {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
                <Mag key={m} onClick={() => { setSelectedMonth(m); setPeriodMode("month"); }} s={{ display: "block", width: "100%", padding: "7px 14px", border: "none", background: selectedMonth === m ? `${C.blue}08` : "transparent", color: selectedMonth === m ? C.blue : C.dark, fontSize: 12, fontWeight: selectedMonth === m ? 700 : 500, cursor: "pointer", fontFamily: bd, textAlign: "left" }}>{Number(m)}月</Mag>
              ))}
            </div>
          )}
        </div>

        {/* Account dropdown */}
        <div style={{ position: "relative" }}>
          <Mag onClick={() => { const next = !acctOpen; closeAll(); if (next) setAcctOpen(true); }} s={{ padding: "7px 14px", borderRadius: 18, border: `1.5px solid ${acctArr.length > 0 ? "rgba(139,123,244,.35)" : C.border}`, background: acctArr.length > 0 ? "rgba(139,123,244,.06)" : C.surface, color: acctArr.length > 0 ? C.blue : C.dark, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: bd, display: "flex", alignItems: "center", gap: 6, boxShadow: acctArr.length > 0 ? "0 0 28px rgba(255,255,255,.2), 0 0 64px rgba(255,255,255,.08)" : "none", transition: "all .2s" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={acctArr.length > 0 ? C.blue : C.textMut} strokeWidth="2.5"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
            {acctArr.length === 0 ? "科目" : acctArr.length === 1 ? acctArr[0] : `${acctArr.length}科目`}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.textMut} strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </Mag>
          {acctOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 20, boxShadow: "0 8px 28px rgba(0,0,0,.5), 0 0 0 1px rgba(139,123,244,.06)", zIndex: 20, padding: "8px 0", minWidth: 200, maxHeight: 320, overflowY: "auto" }}>
              <Mag onClick={() => { if (onAcctFilter) onAcctFilter([]); }} s={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 14px", border: "none", background: acctArr.length === 0 ? `${C.blue}08` : "transparent", color: acctArr.length === 0 ? C.blue : C.dark, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: bd, textAlign: "left" }}>
                <div style={{ width: 15, height: 15, borderRadius: 10, border: `1.5px solid ${acctArr.length === 0 ? C.blue : C.border}`, background: acctArr.length === 0 ? C.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {acctArr.length === 0 && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                </div>すべて
              </Mag>
              <div style={{ borderTop: `1px solid ${C.borderLt}`, margin: "4px 0" }} />
              {[...new Set(rows.map(r => r.debitAcc))].sort().map(acc => {
                const on = acctArr.includes(acc);
                const cnt = rows.filter(r => r.debitAcc === acc).length;
                return (
                  <Mag key={acc} onClick={() => toggleAcct(acc)} s={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 14px", border: "none", background: on ? `${C.blue}08` : "transparent", color: on ? C.blue : C.dark, fontSize: 12, fontWeight: on ? 600 : 500, cursor: "pointer", fontFamily: bd, textAlign: "left" }}>
                    <div style={{ width: 15, height: 15, borderRadius: 10, border: `1.5px solid ${on ? C.blue : C.border}`, background: on ? C.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    <span style={{ flex: 1 }}>{acc}</span>
                    <span style={{ fontSize: 10, color: C.textMut }}>{cnt}</span>
                  </Mag>
                );
              })}
            </div>
          )}
        </div>

        {/* Status dropdown */}
        <div style={{ position: "relative" }}>
          <Mag onClick={() => { const next = !statusOpen; closeAll(); if (next) setStatusOpen(true); }} s={{ padding: "7px 14px", borderRadius: 18, border: `1.5px solid ${filter !== "all" ? "rgba(139,123,244,.35)" : C.border}`, background: filter !== "all" ? "rgba(139,123,244,.06)" : C.surface, color: filter !== "all" ? C.blue : C.dark, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: bd, display: "flex", alignItems: "center", gap: 6, boxShadow: filter !== "all" ? "0 0 28px rgba(255,255,255,.2), 0 0 64px rgba(255,255,255,.08)" : "none", transition: "all .2s" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={filter !== "all" ? C.blue : C.textMut} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 12l2.5 2.5L16 9"/></svg>
            {filter === "all" ? "ステータス" : filter === "review" ? "要確認" : filter === "auto" ? "自動確定" : "承認済"}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.textMut} strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </Mag>
          {statusOpen && (
            <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 20, boxShadow: "0 8px 28px rgba(0,0,0,.5), 0 0 0 1px rgba(139,123,244,.06)", zIndex: 20, padding: "8px 0", minWidth: 150 }}>
              {[{ id: "all", l: "すべて", cnt: rows.length }, { id: "review", l: "要確認", cnt: rows.filter(r => r.st === "要確認").length }, { id: "auto", l: "自動確定", cnt: rows.filter(r => r.st === "自動確定").length }, { id: "done", l: "承認済", cnt: rows.filter(r => r.st === "承認済").length }].map(f => (
                <Mag key={f.id} onClick={() => { setFilter(f.id); setStatusOpen(false); }} s={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 14px", border: "none", background: filter === f.id ? `${C.blue}08` : "transparent", color: filter === f.id ? C.blue : C.dark, fontSize: 12, fontWeight: filter === f.id ? 600 : 500, cursor: "pointer", fontFamily: bd, textAlign: "left" }}>
                  <span>{f.l}</span><span style={{ fontSize: 10, color: C.textMut }}>{f.cnt}</span>
                </Mag>
              ))}
            </div>
          )}
        </div>

        {/* Result count */}
        <span style={{ fontSize: 11, color: C.textMut, marginLeft: "auto" }}>{filtered.length} / {rows.length} 件</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: bd }}>
          <thead>
            <tr style={{ borderTop: `1px solid ${C.borderLt}`, borderBottom: `1px solid ${C.border}` }}>
              {[
                { l: "日付", k: "date", w: 90 }, { l: "摘要", w: 170 }, { l: "借方科目", w: 100 }, { l: "借方金額", k: "amount", w: 100 },
                { l: "貸方科目", w: 100 }, { l: "貸方金額", w: 100 }, { l: "証憑", w: 36 }, { l: "信頼度", k: "conf", w: 60 }, { l: "ステータス", w: 72 }, { l: "メモ", w: 90 }
              ].map((h, i) => (
                <th key={i} style={{ padding: "10px 8px", textAlign: i >= 3 && i <= 6 ? "right" : "left", fontSize: 9, fontWeight: 600, color: C.textMut, letterSpacing: ".1em", textTransform: "uppercase", width: h.w, whiteSpace: "nowrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    {h.l}{h.k && <SortIcon k={h.k} />}
                  </span>
                </th>
              ))}
              <th style={{ width: 50, padding: "10px 8px" }} />
            </tr>
          </thead>
          <tbody>
            {(compact ? filtered.slice(0, 6) : filtered).map(r => {
              const isEditing = editRow === r.id;
              return (
                <tr key={r.id} onClick={() => !isEditing && setEditRow(r.id)}
                  style={{ borderBottom: `1px solid ${C.borderLt}`, background: isEditing ? `${C.blue}06` : r.st === "要確認" ? `${C.b3}05` : "transparent", cursor: "pointer", transition: "background .15s" }}
                  onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = `${C.blue}04`; }}
                  onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = r.st === "要確認" ? `${C.b3}05` : "transparent"; }}>
                  <td style={{ padding: "10px 8px", color: C.textMut, fontWeight: 600 }}>{r.date}</td>
                  <td style={{ padding: "10px 8px", color: C.dark, fontWeight: 600 }}>{r.desc}</td>
                  <td style={{ padding: "10px 8px" }}>
                    {isEditing ? (
                      <select value={r.debitAcc} onChange={e => updateRow(r.id, "debitAcc", e.target.value)} onClick={e => e.stopPropagation()}
                        style={{ border: `1px solid ${C.blue}`, padding: "4px 8px", fontSize: 11, fontFamily: bd, width: "100%", background: "rgba(139,123,244,.04)", color: "#E0DAFF", borderRadius: 12, outline: "none" }}>
                        {accounts.map(a => <option key={a} value={a} style={{ background: "#1a1a2e", color: "#E0DAFF" }}>{a}</option>)}
                      </select>
                    ) : <span style={{ color: C.dark }}>{r.debitAcc}</span>}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>
                    {isEditing ? (
                      <input type="number" value={r.debit} onChange={e => { const v = parseInt(e.target.value) || 0; updateRow(r.id, "debit", v); updateRow(r.id, "credit", v); }} onClick={e => e.stopPropagation()}
                        style={{ border: `1px solid ${C.blue}`, padding: "4px 8px", fontSize: 11, fontFamily: bd, width: 80, textAlign: "right", background: "rgba(139,123,244,.04)", color: "#E0DAFF", borderRadius: 12, outline: "none" }} />
                    ) : <span style={{ fontWeight: 600 }}>{fmt(r.debit)}</span>}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {isEditing ? (
                      <select value={r.creditAcc} onChange={e => updateRow(r.id, "creditAcc", e.target.value)} onClick={e => e.stopPropagation()}
                        style={{ border: `1px solid ${C.blue}`, padding: "4px 8px", fontSize: 11, fontFamily: bd, width: "100%", background: "rgba(139,123,244,.04)", color: "#E0DAFF", borderRadius: 12, outline: "none" }}>
                        {["現金","普通預金","法人カード","売掛金","買掛金","未払金",...accounts].map(a => <option key={a} value={a} style={{ background: "#1a1a2e", color: "#E0DAFF" }}>{a}</option>)}
                      </select>
                    ) : <span style={{ color: C.textSec }}>{r.creditAcc}</span>}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right", color: C.textSec }}>{fmt(r.credit)}</td>
                  <td style={{ padding: "10px 8px", textAlign: "center" }}>
                    {r.doc ? (
                      <span title="証憑添付済" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 6, background: "rgba(123,224,160,.08)", border: "1px solid rgba(123,224,160,.2)" }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7BE0A0" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      </span>
                    ) : (
                      <span title="証憑未添付" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 6, background: "rgba(232,184,75,.06)", border: "1px solid rgba(232,184,75,.15)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#E8B84B" strokeWidth="2.5"><path d="M12 9v4M12 17h.01"/></svg>
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>
                    <span style={{ fontSize: 10, color: confColor(r.conf), fontWeight: 800 }}>{r.conf}%</span>
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <span style={{ fontSize: 9, color: stColor(r.st), fontWeight: 800, letterSpacing: ".04em", padding: "2px 8px", border: `1px solid ${stColor(r.st)}30`, background: `${stColor(r.st)}08` }}>{r.st}</span>
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {isEditing ? (
                      <input value={r.memo} onChange={e => updateRow(r.id, "memo", e.target.value)} onClick={e => e.stopPropagation()} placeholder="メモ..."
                        style={{ border: `1px solid ${C.blue}`, padding: "4px 8px", fontSize: 11, fontFamily: bd, width: "100%", background: "rgba(139,123,244,.04)", color: "#E0DAFF", borderRadius: 12, outline: "none" }} />
                    ) : <span style={{ fontSize: 11, color: C.textMut }}>{r.memo}</span>}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {isEditing && (
                      <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={() => approveRow(r.id)} style={{ border: "none", background: "rgba(139,123,244,.12)", color: "#C4B8FF", border: "1px solid rgba(139,123,244,.3)", fontSize: 9, fontWeight: 700, padding: "4px 8px", cursor: "pointer", fontFamily: bd }}>OK</button>
                        <button type="button" onClick={() => setEditRow(null)} style={{ border: `1px solid ${C.border}`, background: "transparent", color: C.textMut, fontSize: 9, fontWeight: 600, padding: "4px 6px", cursor: "pointer", fontFamily: bd }}>
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 2l6 6M8 2l-6 6"/></svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ padding: "14px 28px", borderTop: `1px solid ${C.borderLt}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: C.textMut }}>合計: {fmt(filtered.reduce((s, r) => s + r.debit, 0))}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => { setRows(prev => prev.map(r => r.st === "要確認" ? { ...r, st: "承認済" } : r)); }}
            style={{ padding: "6px 16px", border: "none", background: "rgba(139,123,244,.12)", color: "#C4B8FF", border: "1px solid rgba(139,123,244,.3)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: bd }}>要確認を全て承認</button>
          <Mag s={{ padding: "6px 16px", border: `1px solid ${C.border}`, background: "transparent", color: C.textSec, fontSize: 10, cursor: "pointer", fontFamily: bd, fontWeight: 700 }}>CSV出力</Mag>
        </div>
      </div>
    </Card3>
  );
}

/* ════════════════════════════════ FILING FORMS ════════════════════════════════ */
const FORM_DEFS = {
    shinkoku: {
      title: "確定申告書B（第一表）", subtitle: "所得税及び復興特別所得税の申告書",
      sections: [
        { heading: "収入金額等", rows: [
          { sec: "ア", l: "事業 営業等", v: 0, auto: true, note: "売上高合計から自動" },
          { sec: "イ", l: "事業 農業", v: 0, auto: true },
          { sec: "ウ", l: "不動産", v: 0, auto: true },
          { sec: "エ", l: "利子", v: 0, auto: true, note: "" },
          { sec: "オ", l: "配当", v: 0, auto: true },
          { sec: "カ", l: "給与", v: 0, auto: false, note: "" },
          { sec: "キ", l: "雑（公的年金等）", v: 0, auto: true },
          { sec: "ク", l: "雑（その他）", v: 0, auto: false, note: "" },
          { sec: "ケ", l: "総合譲渡（短期）", v: 0, auto: true },
          { sec: "コ", l: "総合譲渡（長期）", v: 0, auto: true },
          { sec: "サ", l: "一時", v: 0, auto: true },
        ]},
        { heading: "所得金額等", rows: [
          { sec: "①", l: "事業 営業等", v: 0, auto: true, note: "収入-必要経費", calc: true },
          { sec: "②", l: "事業 農業", v: 0, auto: true },
          { sec: "③", l: "不動産", v: 0, auto: true },
          { sec: "④", l: "利子", v: 0, auto: true },
          { sec: "⑤", l: "配当", v: 0, auto: true },
          { sec: "⑥", l: "給与", v: 0, auto: true, note: "給与所得控除後", calc: true },
          { sec: "⑦", l: "雑", v: 0, auto: true },
          { sec: "⑧", l: "総合譲渡", v: 0, auto: true },
          { sec: "⑨", l: "一時", v: 0, auto: true },
          { sec: "⑫", l: "合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "所得から差し引かれる金額", rows: [
          { sec: "⑬", l: "雑損控除", v: 0, auto: true },
          { sec: "⑭", l: "医療費控除", v: 0, auto: false },
          { sec: "⑮", l: "社会保険料控除", v: 0, auto: true, note: "" },
          { sec: "⑯", l: "小規模企業共済等掛金控除", v: 0, auto: false, note: "" },
          { sec: "⑰", l: "生命保険料控除", v: 0, auto: false },
          { sec: "⑱", l: "地震保険料控除", v: 0, auto: false },
          { sec: "⑲", l: "寄附金控除", v: 0, auto: false, note: "" },
          { sec: "⑳", l: "寡婦、ひとり親控除", v: 0, auto: true },
          { sec: "㉑", l: "勤労学生、障害者控除", v: 0, auto: true },
          { sec: "㉒", l: "配偶者控除", v: 0, auto: false },
          { sec: "㉓", l: "配偶者特別控除", v: 0, auto: true },
          { sec: "㉔", l: "扶養控除", v: 0, auto: false, note: "" },
          { sec: "㉕", l: "基礎控除", v: 0, auto: true, note: "" },
          { sec: "㉙", l: "合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "税金の計算", rows: [
          { sec: "㉚", l: "課税される所得金額", v: 0, auto: true, calc: true, bold: true },
          { sec: "㉛", l: "上の㉚に対する税額", v: 0, auto: true, calc: true },
          { sec: "㉜", l: "配当控除", v: 0, auto: true },
          { sec: "㉝", l: "（特定増改築等）住宅借入金等特別控除", v: 0, auto: false },
          { sec: "㊱", l: "差引所得税額", v: 0, auto: true, calc: true, bold: true },
          { sec: "㊲", l: "復興特別所得税額", v: 0, auto: true, calc: true, note: "㊱×2.1%" },
          { sec: "㊳", l: "所得税及び復興特別所得税の額", v: 0, auto: true, calc: true, bold: true },
          { sec: "㊴", l: "源泉徴収税額", v: 0, auto: false, note: "" },
          { sec: "㊵", l: "予定納税額（第1期）", v: 0, auto: false },
          { sec: "㊶", l: "予定納税額（第2期）", v: 0, auto: false },
          { sec: "㊹", l: "申告納税額", v: 0, auto: true, calc: true, bold: true },
        ]},
      ]
    },
    hojin: {
      title: "法人税 別表一", subtitle: "各事業年度の所得に係る申告書",
      sections: [
        { heading: "所得金額の計算", rows: [
          { sec: "1", l: "所得金額又は欠損金額", v: 0, auto: true, bold: true },
          { sec: "1-2", l: "うち留保金額", v: 0, auto: true, calc: true },
        ]},
        { heading: "法人税額の計算", rows: [
          { sec: "2", l: "法人税額（所得800万以下 15%）", v: 0, auto: true, calc: true },
          { sec: "3", l: "法人税額（所得800万超 23.2%）", v: 0, auto: true, calc: true },
          { sec: "4", l: "法人税額計", v: 0, auto: true, calc: true, bold: true },
          { sec: "5", l: "控除税額（所得税額等）", v: 0, auto: false },
          { sec: "6", l: "差引所得に対する法人税額", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "中間申告・税額の確定", rows: [
          { sec: "7", l: "特定同族会社の特別税率", v: 0, auto: true },
          { sec: "8", l: "中間申告分の法人税額", v: 0, auto: false, note: "" },
          { sec: "9", l: "差引確定法人税額", v: 0, auto: true, calc: true },
          { sec: "10", l: "この申告による還付金額", v: 0, auto: true, calc: true },
        ]},
        { heading: "地方法人税", rows: [
          { sec: "11", l: "課税標準法人税額", v: 0, auto: true, calc: true },
          { sec: "12", l: "地方法人税額（10.3%）", v: 0, auto: true, calc: true, note: "11×10.3%" },
          { sec: "13", l: "控除税額", v: 0, auto: true },
          { sec: "14", l: "差引地方法人税額", v: 0, auto: true, calc: true },
          { sec: "15", l: "中間申告分の地方法人税額", v: 0, auto: false },
          { sec: "16", l: "差引確定地方法人税額", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "合計額", rows: [
          { sec: "17", l: "法人税＋地方法人税 合計納付税額", v: 0, auto: true, calc: true, bold: true },
        ]},
      ]
    },
    shohi: {
      title: "消費税及び地方消費税申告書", subtitle: "第一表（一般用）",
      sections: [
        { heading: "課税標準額等の計算", rows: [
          { sec: "①", l: "課税標準額", v: 0, auto: true, calc: true, note: "税抜売上" },
          { sec: "②", l: "消費税額", v: 0, auto: true, calc: true, note: "①×10%" },
        ]},
        { heading: "控除税額の計算", rows: [
          { sec: "③", l: "控除過大調整税額", v: 0, auto: true },
          { sec: "④", l: "控除対象仕入税額", v: 0, auto: true, note: "" },
          { sec: "⑤", l: "返還等対価に係る税額", v: 0, auto: false },
          { sec: "⑥", l: "貸倒れに係る税額", v: 0, auto: false },
          { sec: "⑦", l: "控除税額小計", v: 0, auto: true, calc: true },
          { sec: "⑧", l: "控除不足還付税額", v: 0, auto: true, calc: true },
        ]},
        { heading: "差引税額", rows: [
          { sec: "⑨", l: "差引税額", v: 0, auto: true, calc: true, bold: true },
          { sec: "⑩", l: "中間納付税額", v: 0, auto: false },
          { sec: "⑪", l: "中間納付還付税額", v: 0, auto: true, calc: true },
          { sec: "⑫", l: "納付税額", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "地方消費税の計算", rows: [
          { sec: "⑬〜⑲", l: "譲渡割額の計算過程", v: null, auto: true, note: "内訳は別紙" },
          { sec: "⑳", l: "差引譲渡割額", v: 0, auto: true, calc: true, note: "消費税額×22/78" },
          { sec: "㉑", l: "中間納付譲渡割額", v: 0, auto: false },
          { sec: "㉒", l: "納付譲渡割額", v: 0, auto: true, calc: true },
        ]},
        { heading: "消費税及び地方消費税の合計", rows: [
          { sec: "㉓", l: "消費税額合計", v: 0, auto: true, calc: true },
          { sec: "㉔", l: "地方消費税額合計", v: 0, auto: true, calc: true },
          { sec: "㉕", l: "中間納付税額合計", v: 0, auto: true, calc: true },
          { sec: "㉖", l: "合計差引納付（還付）税額", v: 0, auto: true, calc: true, bold: true },
        ]},
      ]
    },
    bs: {
      title: "貸借対照表", subtitle: "貸借対照表",
      sections: [
        { heading: "資産の部 — 流動資産", rows: [
          { sec: "A1", l: "現金及び預金", v: 0, auto: true, note: "" },
          { sec: "A2", l: "売掛金", v: 0, auto: true, note: "" },
          { sec: "A3", l: "商品・製品", v: 0, auto: true },
          { sec: "A4", l: "前払費用", v: 0, auto: true, note: "" },
          { sec: "A5", l: "未収入金", v: 0, auto: false, note: "" },
          { sec: "A6", l: "流動資産合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "資産の部 — 固定資産", rows: [
          { sec: "A7", l: "建物（純額）", v: 0, auto: true },
          { sec: "A8", l: "工具器具備品（純額）", v: 0, auto: true, note: "" },
          { sec: "A9", l: "ソフトウェア", v: 0, auto: true, note: "" },
          { sec: "A10", l: "敷金・保証金", v: 0, auto: false, note: "" },
          { sec: "A11", l: "固定資産合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "資産の部 合計", rows: [
          { sec: "A12", l: "資産合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "負債の部 — 流動負債", rows: [
          { sec: "L1", l: "買掛金", v: 0, auto: true, note: "" },
          { sec: "L2", l: "未払金", v: 0, auto: true, note: "" },
          { sec: "L3", l: "未払法人税等", v: 0, auto: true, calc: true, note: "法人税＋地方法人税" },
          { sec: "L4", l: "未払消費税等", v: 0, auto: true, calc: true },
          { sec: "L5", l: "預り金", v: 0, auto: true, note: "" },
          { sec: "L6", l: "流動負債合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "負債の部 — 固定負債", rows: [
          { sec: "L7", l: "長期借入金", v: 0, auto: false, note: "" },
          { sec: "L8", l: "固定負債合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "負債合計", rows: [
          { sec: "L9", l: "負債合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "純資産の部", rows: [
          { sec: "E1", l: "資本金", v: 0, auto: false },
          { sec: "E2", l: "資本剰余金", v: 0, auto: true },
          { sec: "E3", l: "利益剰余金", v: 0, auto: true, calc: true, note: "" },
          { sec: "E4", l: "純資産合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "負債・純資産合計", rows: [
          { sec: "T1", l: "負債及び純資産合計", v: 0, auto: true, calc: true, bold: true },
        ]},
      ]
    },
    pl: {
      title: "損益計算書", subtitle: "損益計算書",
      sections: [
        { heading: "売上高", rows: [
          { sec: "P1", l: "売上高", v: 0, auto: true, bold: true, note: "" },
        ]},
        { heading: "売上原価", rows: [
          { sec: "P2", l: "外注費", v: 0, auto: true, note: "" },
          { sec: "P3", l: "サーバー・インフラ費", v: 0, auto: true, note: "" },
          { sec: "P4", l: "売上原価合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "売上総利益", rows: [
          { sec: "P5", l: "売上総利益", v: 0, auto: true, calc: true, bold: true, note: "粗利率67.5%" },
        ]},
        { heading: "販売費及び一般管理費", rows: [
          { sec: "P6", l: "役員報酬", v: 0, auto: false, note: "" },
          { sec: "P7", l: "給料手当", v: 0, auto: true, note: "" },
          { sec: "P8", l: "法定福利費", v: 0, auto: true, calc: true },
          { sec: "P9", l: "地代家賃", v: 0, auto: false, note: "" },
          { sec: "P10", l: "通信費", v: 0, auto: true },
          { sec: "P11", l: "広告宣伝費", v: 0, auto: true },
          { sec: "P12", l: "減価償却費", v: 0, auto: true, calc: true },
          { sec: "P13", l: "交際費", v: 0, auto: false, note: "" },
          { sec: "P14", l: "その他販管費", v: 0, auto: true },
          { sec: "P15", l: "販管費合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "営業利益", rows: [
          { sec: "P16", l: "営業利益", v: 0, auto: true, calc: true, bold: true, note: "営業利益率16.7%" },
        ]},
        { heading: "営業外損益", rows: [
          { sec: "P17", l: "受取利息", v: 0, auto: true },
          { sec: "P18", l: "支払利息", v: 0, auto: true, note: "借入金利息" },
          { sec: "P19", l: "営業外損益計", v: 0, auto: true, calc: true },
        ]},
        { heading: "経常利益・税引前", rows: [
          { sec: "P20", l: "経常利益", v: 0, auto: true, calc: true, bold: true },
          { sec: "P21", l: "特別利益", v: 0, auto: true },
          { sec: "P22", l: "特別損失", v: 0, auto: true },
          { sec: "P23", l: "税引前当期純利益", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "法人税等・当期純利益", rows: [
          { sec: "P24", l: "法人税・住民税・事業税", v: 0, auto: true, calc: true },
          { sec: "P25", l: "当期純利益", v: 0, auto: true, calc: true, bold: true },
        ]},
      ]
    },
    kotei: {
      title: "固定資産台帳", subtitle: "減価償却資産の明細", cat: "決算整理",
      sections: [
        { heading: "建物", rows: [
          { sec: "K1", l: "該当なし", v: 0, auto: true },
        ]},
        { heading: "工具器具備品", rows: [
          { sec: "K2", l: "サーバー機器", v: 0, auto: true, note: "" },
          { sec: "K3", l: "  取得価額", v: 0, auto: true },
          { sec: "K4", l: "  期首帳簿価額", v: 0, auto: true, calc: true },
          { sec: "K5", l: "  当期償却額", v: 0, auto: true, calc: true, note: "償却率0.400" },
          { sec: "K6", l: "  期末帳簿価額", v: 0, auto: true, calc: true },
          { sec: "K7", l: "ノートPC", v: 0, auto: true, note: "" },
          { sec: "K8", l: "  取得価額", v: 0, auto: false, note: "" },
          { sec: "K9", l: "  当期償却額", v: 0, auto: true, calc: true, note: "償却率0.500" },
          { sec: "K10", l: "  期末帳簿価額", v: 0, auto: true, calc: true },
        ]},
        { heading: "ソフトウェア", rows: [
          { sec: "K11", l: "自社SaaSプラットフォーム開発費", v: 0, auto: true, note: "" },
          { sec: "K12", l: "  取得価額", v: 0, auto: true },
          { sec: "K13", l: "  当期償却額", v: 0, auto: true, calc: true, note: "" },
          { sec: "K14", l: "  期末帳簿価額", v: 0, auto: true, calc: true },
        ]},
        { heading: "償却費合計", rows: [
          { sec: "K15", l: "当期減価償却費合計", v: 0, auto: true, calc: true, bold: true },
          { sec: "K16", l: "固定資産期末残高合計", v: 0, auto: true, calc: true, bold: true },
        ]},
      ]
    },
    kubun: {
      title: "消費税区分別表", subtitle: "課税区分別取引集計", cat: "決算整理",
      sections: [
        { heading: "売上（出力）", rows: [
          { sec: "Z1", l: "課税売上（10%）", v: 0, auto: true, note: "" },
          { sec: "Z2", l: "課税売上（8%軽減）", v: 0, auto: true },
          { sec: "Z3", l: "非課税売上", v: 0, auto: true, note: "受取利息等" },
          { sec: "Z4", l: "不課税売上", v: 0, auto: true },
          { sec: "Z5", l: "売上合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "仕入（入力）", rows: [
          { sec: "Z6", l: "課税仕入（10%）", v: 0, auto: true, note: "" },
          { sec: "Z7", l: "課税仕入（8%軽減）", v: 0, auto: true, note: "" },
          { sec: "Z8", l: "非課税仕入", v: 0, auto: true, note: "" },
          { sec: "Z9", l: "不課税仕入", v: 0, auto: true, note: "" },
          { sec: "Z10", l: "仕入合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "インボイス対応状況", rows: [
          { sec: "Z11", l: "適格請求書あり（控除可能）", v: 0, auto: true, note: "" },
          { sec: "Z12", l: "適格請求書なし（経過措置80%）", v: 0, auto: false, note: "" },
          { sec: "Z13", l: "免税事業者取引", v: 0, auto: true },
          { sec: "Z14", l: "仕入税額控除合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "消費税額サマリー", rows: [
          { sec: "Z15", l: "課税標準額に対する消費税額", v: 0, auto: true, calc: true },
          { sec: "Z16", l: "控除対象仕入税額", v: 0, auto: true, calc: true },
          { sec: "Z17", l: "差引納付消費税額", v: 0, auto: true, calc: true, bold: true },
        ]},
      ]
    },
    uchiwake: {
      title: "内訳書・概況書", subtitle: "勘定科目内訳明細書 / 法人事業概況説明書", cat: "提出書類",
      sections: [
        { heading: "預貯金等の内訳", rows: [
          { sec: "U1", l: "銀行口座1", v: 0, auto: true, note: "" },
          { sec: "U2", l: "銀行口座2", v: 0, auto: true, note: "" },
          { sec: "U3", l: "銀行口座3", v: 0, auto: true, note: "" },
          { sec: "U4", l: "預貯金合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "売掛金の内訳", rows: [
          { sec: "U5", l: "取引先A", v: 0, auto: true, note: "" },
          { sec: "U6", l: "取引先B", v: 0, auto: true, note: "" },
          { sec: "U7", l: "取引先C", v: 0, auto: true, note: "" },
          { sec: "U8", l: "その他", v: 0, auto: true },
          { sec: "U9", l: "売掛金合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "買掛金・未払金の内訳", rows: [
          { sec: "U10", l: "外注先", v: 0, auto: true, note: "" },
          { sec: "U11", l: "クラウドサービス", v: 0, auto: true, note: "" },
          { sec: "U12", l: "その他未払金", v: 0, auto: true },
          { sec: "U13", l: "買掛金・未払金合計", v: 0, auto: true, calc: true, bold: true },
        ]},
        { heading: "事業概況", rows: [
          { sec: "U14", l: "主たる業種", v: null, auto: true, note: "" },
          { sec: "U15", l: "従業員数（期末）", v: 0, auto: false, note: "" },
          { sec: "U16", l: "主要取引先", v: null, auto: true, note: "" },
          { sec: "U17", l: "経理方式", v: null, auto: true, note: "税抜経理方式・発生主義" },
        ]},
      ]
    },
    shokyaku: {
      title: "償却資産申告書", subtitle: "固定資産税（償却資産）申告書", cat: "提出書類",
      sections: [
        { heading: "前年前取得のもの", rows: [
          { sec: "S1", l: "サーバー機器", v: 0, auto: true, note: "" },
          { sec: "S2", l: "  評価額", v: 0, auto: true, calc: true, note: "減価残存率0.658適用" },
        ]},
        { heading: "前年中取得のもの", rows: [
          { sec: "S3", l: "ノートPC", v: 0, auto: true, note: "" },
          { sec: "S4", l: "  評価額（半年償却）", v: 0, auto: true, calc: true, note: "取得価額×0.790" },
        ]},
        { heading: "合計", rows: [
          { sec: "S5", l: "資産の総額（取得価額）", v: 0, auto: true, calc: true, bold: true },
          { sec: "S6", l: "課税標準額", v: 0, auto: true, calc: true, bold: true },
          { sec: "S7", l: "算出税額（1.4%）", v: 0, auto: true, calc: true, note: "4,668,000×1.4%" },
          { sec: "S8", l: "免税点（150万円）", v: null, auto: true, note: "課税標準額 > 150万 → 課税" },
        ]},
      ]
    },
    shiharai: {
      title: "支払調書", subtitle: "報酬・料金等の支払調書", cat: "提出書類",
      sections: [
        { heading: "フリーランスエンジニア", rows: [
          { sec: "H1", l: "支払先1", v: 0, auto: true, note: "" },
          { sec: "H2", l: "  支払金額", v: 0, auto: true },
          { sec: "H3", l: "  源泉徴収税額", v: 0, auto: true, calc: true, note: "" },
          { sec: "H4", l: "支払先2", v: 0, auto: true, note: "" },
          { sec: "H5", l: "  支払金額", v: 0, auto: true },
          { sec: "H6", l: "  源泉徴収税額", v: 0, auto: true, calc: true },
        ]},
        { heading: "デザイナー・コンサルタント", rows: [
          { sec: "H7", l: "支払先3", v: 0, auto: true, note: "" },
          { sec: "H8", l: "  源泉徴収税額", v: 0, auto: true, calc: true },
          { sec: "H9", l: "支払先4", v: 0, auto: true, note: "" },
          { sec: "H10", l: "  源泉徴収税額", v: 0, auto: true, calc: true },
        ]},
        { heading: "合計", rows: [
          { sec: "H11", l: "支払金額合計", v: 0, auto: true, calc: true, bold: true },
          { sec: "H12", l: "源泉徴収税額合計", v: 0, auto: true, calc: true, bold: true },
          { sec: "H13", l: "提出対象者数", v: 0, auto: true, note: "" },
        ]},
      ]
    },
    tsukijime: {
      title: "月締め", subtitle: "月次決算チェックリスト", cat: "締め作業",
      sections: [
        { heading: "仕訳・帳簿", rows: [
          { sec: "M1", l: "全仕訳の入力完了", v: null, auto: true, note: "" },
          { sec: "M2", l: "未承認仕訳の確認", v: 0, auto: true, note: "" },
          { sec: "M3", l: "証憑の添付確認", v: 0, auto: false, note: "" },
          { sec: "M4", l: "消費税区分の確認", v: 0, auto: false, note: "" },
        ]},
        { heading: "残高確認", rows: [
          { sec: "M5", l: "銀行残高照合", v: null, auto: true, note: "" },
          { sec: "M6", l: "売掛金の回収確認", v: null, auto: true, note: "" },
          { sec: "M7", l: "買掛金の支払確認", v: null, auto: true, note: "" },
          { sec: "M8", l: "仮勘定の精算", v: 0, auto: false, note: "" },
        ]},
        { heading: "月次レポート", rows: [
          { sec: "M9", l: "月次試算表の出力", v: null, auto: true, note: "" },
          { sec: "M10", l: "前月比較分析", v: null, auto: true, note: "" },
          { sec: "M11", l: "月次報告の承認", v: null, auto: false, note: "" },
        ]},
      ]
    },
    nendojime: {
      title: "年度締め", subtitle: "決算締め処理", cat: "締め作業",
      sections: [
        { heading: "決算整理仕訳", rows: [
          { sec: "Y1", l: "減価償却費の計上", v: 0, auto: true, calc: true, note: "" },
          { sec: "Y2", l: "貸倒引当金の計上", v: 0, auto: true, calc: true, note: "売掛金×1%" },
          { sec: "Y3", l: "賞与引当金の計上", v: 0, auto: false, note: "" },
          { sec: "Y4", l: "前払費用の振替", v: 0, auto: true, note: "" },
          { sec: "Y5", l: "未払費用の計上", v: 0, auto: true, note: "" },
        ]},
        { heading: "税金計算", rows: [
          { sec: "Y6", l: "法人税等の計上", v: 0, auto: true, calc: true, note: "✓ 確定" },
          { sec: "Y7", l: "消費税の確定", v: 0, auto: true, calc: true, note: "✓ 確定" },
          { sec: "Y8", l: "事業税の計上", v: 0, auto: true, calc: true },
        ]},
        { heading: "締め処理ステータス", rows: [
          { sec: "Y9", l: "残高試算表の確認", v: null, auto: true, note: "" },
          { sec: "Y10", l: "勘定科目内訳書の作成", v: null, auto: true, note: "" },
          { sec: "Y11", l: "税務申告書の作成", v: null, auto: true, note: "" },
          { sec: "Y12", l: "年度締めの確定（ロック）", v: null, auto: false, note: "" },
        ]},
      ]
    },
    denchoho: {
      title: "電子帳簿保存法 対応ステータスレポート", subtitle: "電帳法準拠状況",
      sections: [
        { heading: "電子帳簿等保存（区分1）", rows: [
          { sec: "D1", l: "仕訳帳の電子保存", v: null, auto: true, note: "✓ 対応済" },
          { sec: "D2", l: "総勘定元帳の電子保存", v: null, auto: true, note: "✓ 対応済" },
          { sec: "D3", l: "訂正削除履歴の保持", v: null, auto: true, note: "✓ 対応済" },
          { sec: "D4", l: "相互関連性の確保", v: null, auto: true, note: "✓ 対応済" },
          { sec: "D5", l: "検索機能（日付・金額・取引先）", v: null, auto: true, note: "✓ 対応済" },
          { sec: "D6", l: "ダウンロード要件", v: null, auto: true, note: "✓ 対応済" },
        ]},
        { heading: "スキャナ保存（区分2）", rows: [
          { sec: "S1", l: "解像度 200dpi以上", v: null, auto: true, note: "✓ 自動確認" },
          { sec: "S2", l: "タイムスタンプ付与", v: null, auto: true, note: "✓ 自動付与" },
          { sec: "S3", l: "入力期間制限（概ね7営業日）", v: null, auto: true, note: "" },
          { sec: "S4", l: "適正事務処理要件", v: null, auto: true, note: "✓ 対応済" },
          { sec: "S5", l: "バージョン管理", v: null, auto: true, note: "✓ 対応済" },
        ]},
        { heading: "電子取引データ保存（区分3）", rows: [
          { sec: "E1", l: "電子取引データの電子保存", v: null, auto: true, note: "✓ 義務対応済" },
          { sec: "E2", l: "真実性の確保（改ざん防止）", v: null, auto: true, note: "✓ 対応済" },
          { sec: "E3", l: "可視性の確保", v: null, auto: true, note: "✓ 対応済" },
          { sec: "E4", l: "タイムスタンプ付与", v: null, auto: true, note: "" },
          { sec: "E5", l: "ファイル命名規則の統一", v: null, auto: false, note: "" },
          { sec: "E6", l: "検索要件（3項目）", v: null, auto: true, note: "✓ 対応済" },
        ]},
        { heading: "証憑管理サマリー", rows: [
          { sec: "C1", l: "証憑添付率", v: 0, auto: true, note: "", bold: true },
          { sec: "C2", l: "未添付（要対応）", v: 0, auto: true, note: "" },
          { sec: "C3", l: "タイムスタンプ付与率", v: 0, auto: true, note: "12/12件" },
          { sec: "C4", l: "ファイル命名規則準拠率", v: 0, auto: true, note: "" },
          { sec: "C5", l: "重加算税リスク", v: null, auto: true, note: "✓ 低リスク" },
        ]},
      ]
    },
  };

function FilingForms() {
  const formDefs = FORM_DEFS;

  const [activeForm, setActiveForm] = useState("shinkoku");
  const [edits, setEdits] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [editBuf, setEditBuf] = useState("");

  const form = formDefs[activeForm];
  const allRows = form.sections.flatMap(s => s.rows);
  const filledCount = allRows.filter(r => r.v !== null && r.v !== 0).length;
  const editedCount = Object.keys(edits).filter(k => k.startsWith(activeForm)).length;

  const getVal = (sec) => {
    const key = `${activeForm}:${sec}`;
    return edits[key] !== undefined ? edits[key] : allRows.find(r => r.sec === sec)?.v;
  };

  const startEdit = (sec, val) => {
    setEditingCell(sec);
    setEditBuf(val !== null && val !== undefined ? String(val) : "");
  };

  const commitEdit = (sec) => {
    const key = `${activeForm}:${sec}`;
    const num = editBuf === "" ? null : Number(editBuf.replace(/,/g, ""));
    if (!isNaN(num)) setEdits(prev => ({ ...prev, [key]: num }));
    setEditingCell(null);
  };

  const fmtV = (v) => v === null ? "—" : typeof v === "number" ? v.toLocaleString() : v;

  const formKeys = Object.keys(formDefs);
  const cats = [
    { label: "決算整理", keys: ["kotei", "kubun"] },
    { label: "提出書類", keys: ["bs", "pl", "shinkoku", "hojin", "shohi", "uchiwake", "shokyaku", "shiharai"] },
    { label: "締め作業", keys: ["tsukijime", "nendojime"] },
  ];

  return (
    <Card3 s={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
      <div style={{ display: "flex", minHeight: 600 }}>
        {/* Sidebar */}
        <div style={{ width: 210, borderRight: `1px solid ${C.border}`, background: "rgba(139,123,244,.02)", flexShrink: 0, padding: "12px 0", overflow: "auto" }}>
          {cats.map((cat, ci) => (
            <div key={ci} style={{ marginBottom: 8 }}>
              <div style={{ padding: "8px 18px 4px", fontSize: 9, color: "rgba(168,155,255,.4)", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" }}>{cat.label}</div>
              {cat.keys.map(k => {
                const f = formDefs[k], active = k === activeForm;
                const total = f.sections.flatMap(s => s.rows).length;
                const filled = f.sections.flatMap(s => s.rows).filter(r => r.v !== null && r.v !== 0).length;
                return (
                  <button key={k} type="button" onClick={() => { setActiveForm(k); setEditingCell(null); }}
                    style={{ display: "block", width: "calc(100% - 12px)", margin: "1px 6px", padding: "8px 12px", border: active ? "1px solid rgba(139,123,244,.25)" : "1px solid transparent", borderRadius: 10, background: active ? "rgba(139,123,244,.08)" : "transparent", cursor: "pointer", fontFamily: bd, transition: "all .2s", textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "#C4B8FF" : C.textSec, letterSpacing: "-.01em", textShadow: active ? "0 0 8px rgba(168,155,255,.3)" : "none" }}>
                      {f.title.split("（")[0].split("別表")[0].split("及び")[0].trim()}
                    </div>
                    <div style={{ fontSize: 9, color: active ? "rgba(168,155,255,.5)" : C.textMut, marginTop: 1 }}>
                      {filled}/{total}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

      {/* Form title bar */}
      <div style={{ padding: "16px 28px", background: `${C.blue}04`, borderBottom: `1px solid ${C.borderLt}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: hd, fontSize: 20, fontWeight: 600, color: C.dark, letterSpacing: "-.02em" }}>{form.title}</div>
          <div style={{ fontSize: 10, color: C.textMut, marginTop: 2 }}>{form.subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {editedCount > 0 && (
            <span style={{ fontSize: 9, color: C.b2, fontWeight: 800, letterSpacing: ".06em", padding: "3px 10px", border: `1.5px solid ${C.b2}`, display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>
              {editedCount}件 手動修正
            </span>
          )}
          <Mag s={{ padding: "6px 16px", border: `1px solid ${C.border}`, background: C.surface, color: C.textSec, fontSize: 10, cursor: "pointer", fontFamily: bd, fontWeight: 700 }}>PDF出力</Mag>
          <BtnApprove s={{ padding: "6px 16px", border: "none", background: "rgba(139,123,244,.12)", color: "#C4B8FF", border: "1px solid rgba(139,123,244,.3)", fontSize: 10, cursor: "pointer", fontFamily: bd, fontWeight: 700, boxShadow: "0 0 14px rgba(139,123,244,.3), 0 0 36px rgba(139,123,244,.1)" }}>e-Tax送信</BtnApprove>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 160px 110px", padding: "8px 28px", background: C.surfAlt, borderBottom: `1px solid ${C.border}`, fontSize: 9, color: C.textMut, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase" }}>
        <span>欄</span><span>項目名</span><span style={{ textAlign: "right" }}>金額（円）</span><span style={{ textAlign: "center" }}>ステータス</span>
      </div>

      {/* Form body */}
      <div style={{ maxHeight: 520, overflow: "auto" }}>
        {form.sections.map((sec, si) => (
          <div key={si}>
            {/* Section heading */}
            <div style={{ padding: "10px 28px 8px", background: `${C.blue}05`, borderBottom: `1px solid ${C.borderLt}`, borderTop: si > 0 ? `2px solid ${C.border}` : "none" }}>
              <span style={{ fontSize: 10, color: C.b1, fontWeight: 800, letterSpacing: ".08em" }}>{sec.heading}</span>
            </div>

            {/* Rows */}
            {sec.rows.map((r, ri) => {
              const key = `${activeForm}:${r.sec}`;
              const isEdited = edits[key] !== undefined;
              const displayVal = isEdited ? edits[key] : r.v;
              const isEditing = editingCell === r.sec;

              return (
                <div key={ri}
                  style={{
                    display: "grid", gridTemplateColumns: "44px 1fr 160px 110px", alignItems: "center",
                    padding: "0 28px", minHeight: 40,
                    borderBottom: `1px solid ${C.borderLt}`,
                    background: isEditing ? `${C.blue}08` : isEdited ? `${C.b2}04` : r.bold ? `${C.b1}03` : ri % 2 === 0 ? "transparent" : `${C.blue}01`,
                    transition: "background .15s",
                  }}
                  onMouseEnter={e => { if (!isEditing && !r.calc) e.currentTarget.style.background = `${C.blue}06`; }}
                  onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = isEdited ? `${C.b2}04` : r.bold ? `${C.b1}03` : ri % 2 === 0 ? "transparent" : `${C.blue}01`; }}
                >
                  {/* Section number */}
                  <span style={{ fontSize: 11, color: C.b2, fontWeight: 800, textAlign: "center" }}>{r.sec}</span>

                  {/* Label + note */}
                  <div style={{ padding: "8px 0" }}>
                    <span style={{ fontSize: 12, color: r.bold ? C.b1 : C.dark, fontWeight: r.bold ? 800 : 500 }}>{r.l}</span>
                    {r.note && <span style={{ fontSize: 9, color: C.textMut, marginLeft: 8 }}>— {r.note}</span>}
                  </div>

                  {/* Value — editable cell */}
                  <div style={{ textAlign: "right", padding: "4px 0" }}>
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editBuf}
                        onChange={e => setEditBuf(e.target.value)}
                        onBlur={() => commitEdit(r.sec)}
                        onKeyDown={e => { if (e.key === "Enter") commitEdit(r.sec); if (e.key === "Escape") setEditingCell(null); }}
                        style={{
                          width: "100%", textAlign: "right", padding: "4px 8px",
                          border: `2px solid ${C.blue}`, outline: "none", fontSize: 13, fontWeight: 700,
                          fontFamily: bd, background: C.surface, color: C.dark,
                          boxShadow: "0 0 0 3px rgba(139,123,244,.12)",
                        }}
                      />
                    ) : (
                      <span
                        onClick={() => { if (!r.calc) startEdit(r.sec, displayVal); }}
                        style={{
                          display: "inline-block", padding: "4px 8px", minWidth: 80,
                          fontSize: 13, fontWeight: r.bold ? 800 : 600,
                          fontFamily: r.bold ? mono : bd, letterSpacing: r.bold ? "-.02em" : 0,
                          color: displayVal === null || displayVal === 0 ? C.textMut : r.bold ? C.b1 : C.dark,
                          cursor: r.calc ? "default" : "pointer",
                          borderBottom: r.calc ? "none" : `1px dashed ${C.borderLt}`,
                          transition: "all .15s",
                        }}
                      >
                        {fmtV(displayVal)}
                      </span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div style={{ textAlign: "center" }}>
                    {isEdited ? (
                      <span style={{ fontSize: 8, color: C.b2, fontWeight: 800, letterSpacing: ".06em", padding: "2px 8px", background: "rgba(139,123,244,.03)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>
                        手動修正
                      </span>
                    ) : r.calc ? (
                      <span style={{ fontSize: 8, color: C.b3, fontWeight: 700, letterSpacing: ".06em", padding: "2px 8px", background: `${C.b3}08` }}>自動計算</span>
                    ) : r.v !== null && r.v !== 0 ? (
                      <span style={{ fontSize: 8, color: C.b4, fontWeight: 700, letterSpacing: ".06em", padding: "2px 8px", background: `${C.b5}60` }}>入力済</span>
                    ) : (
                      <span style={{ fontSize: 8, color: C.muted, fontWeight: 700, letterSpacing: ".06em", padding: "2px 8px" }}>未入力</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "14px 28px", borderTop: `2px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: `${C.blue}02` }}>
        <div style={{ display: "flex", gap: 20, fontSize: 10, color: C.textMut }}>
          <span>{filledCount}/{allRows.length} 入力済</span>
          {editedCount > 0 && <span style={{ color: C.b2, fontWeight: 700 }}>{editedCount}件 手動修正済</span>}
          <span>自動計算: {allRows.filter(r => r.calc).length}項目</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {editedCount > 0 && (
            <button type="button" onClick={() => { const next = {}; Object.keys(edits).forEach(k => { if (!k.startsWith(activeForm)) next[k] = edits[k]; }); setEdits(next); }}
              style={{ padding: "6px 16px", border: `1px solid ${C.border}`, background: C.surface, color: C.textSec, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: bd }}>修正をリセット</button>
          )}
          <BtnApprove s={{ padding: "6px 16px", border: "none", background: C.b1, color: "#0A0A0A", fontSize: 10, cursor: "pointer", fontFamily: bd, fontWeight: 700, letterSpacing: ".04em" }}>保存して確定</BtnApprove>
        </div>
      </div>
      </div>{/* end main content */}
      </div>{/* end flex */}
    </Card3>
  );
}

/* ════════════════════════════════ MONTHLY LEDGER ════════════════════════════════ */
function MonthlyLedger() {
  const months = ["4月","5月","6月","7月","8月","9月","10月","11月","12月","1月","2月","3月"];

  const [data, setData] = useMonthlyLedger();
  const [editCell, setEditCell] = useState(null); // "section:row:col"
  const [editBuf, setEditBuf] = useState("");

  const startEdit = (section, row, col) => {
    const key = `${section}:${row}:${col}`;
    setEditCell(key);
    setEditBuf(String(data[section][row][col] || ""));
  };

  const commitEdit = (section, row, col) => {
    const num = editBuf === "" || editBuf === "0" ? 0 : Number(editBuf.replace(/,/g, ""));
    if (!isNaN(num)) {
      setData(prev => {
        const next = { ...prev, [section]: { ...prev[section], [row]: [...prev[section][row]] } };
        next[section][row][col] = num;
        return next;
      });
    }
    setEditCell(null);
  };

  const fmtCell = (v) => v === 0 ? "" : v.toLocaleString();
  const rowSum = (section, row) => data[section][row].reduce((a, b) => a + b, 0);
  const colSum = (section, col) => Object.values(data[section]).reduce((a, r) => a + r[col], 0);
  const totalSum = (section) => Object.values(data[section]).reduce((a, r) => a + r.reduce((s, v) => s + v, 0), 0);

  const cellW = 80;
  const labelW = 110;
  const cs = { fontSize: 11, textAlign: "right", padding: "6px 8px", borderRight: `1px solid ${C.borderLt}`, borderBottom: `1px solid ${C.borderLt}`, fontFamily: mono, whiteSpace: "nowrap", minWidth: cellW, boxSizing: "border-box" };

  const renderSection = (sectionKey, sectionLabel) => {
    const rows = Object.entries(data[sectionKey]);
    return (
      <>
        {/* Section header row */}
        <tr style={{ background: `${C.blue}06` }}>
          <td colSpan={2} style={{ ...cs, textAlign: "left", fontWeight: 800, color: C.b1, fontSize: 10, letterSpacing: ".08em", borderRight: `2px solid ${C.border}` }}>{sectionLabel}</td>
          {months.map((_, ci) => <td key={ci} style={{ ...cs, background: `${C.blue}04` }} />)}
          <td style={{ ...cs, background: `${C.blue}04` }} />
        </tr>
        {/* Data rows */}
        {rows.map(([rowName, vals], ri) => (
          <tr key={rowName} style={{ background: ri % 2 === 0 ? "transparent" : `${C.blue}02` }}
            onMouseEnter={e => e.currentTarget.style.background = `${C.blue}05`}
            onMouseLeave={e => e.currentTarget.style.background = ri % 2 === 0 ? "transparent" : `${C.blue}02`}>
            <td style={{ ...cs, textAlign: "center", width: 28, color: C.textMut, fontSize: 10, fontWeight: 600 }}>{ri + 1}</td>
            <td style={{ ...cs, textAlign: "left", fontWeight: 600, color: C.dark, width: labelW, borderRight: `2px solid ${C.border}`, fontSize: 12 }}>{rowName}</td>
            {vals.map((v, ci) => {
              const cellKey = `${sectionKey}:${rowName}:${ci}`;
              const isEditing = editCell === cellKey;
              return (
                <td key={ci} onClick={() => startEdit(sectionKey, rowName, ci)}
                  style={{ ...cs, cursor: "pointer", color: v === 0 ? C.textMut : C.dark, fontWeight: v === 0 ? 400 : 600, position: "relative", transition: "background .1s" }}>
                  {isEditing ? (
                    <input autoFocus value={editBuf} onChange={e => setEditBuf(e.target.value)}
                      onBlur={() => commitEdit(sectionKey, rowName, ci)}
                      onKeyDown={e => { if (e.key === "Enter") commitEdit(sectionKey, rowName, ci); if (e.key === "Escape") setEditCell(null); if (e.key === "Tab") { e.preventDefault(); commitEdit(sectionKey, rowName, ci); if (ci < 11) startEdit(sectionKey, rowName, ci + 1); } }}
                      style={{ width: "100%", border: `2px solid ${C.blue}`, outline: "none", fontSize: 11, fontWeight: 700, textAlign: "right", padding: "2px 4px", fontFamily: bd, background: C.surface, boxShadow: "0 0 0 3px rgba(139,123,244,.12)", boxSizing: "border-box", position: "absolute", inset: 0 }} />
                  ) : fmtCell(v)}
                </td>
              );
            })}
            {/* Row total */}
            <td style={{ ...cs, fontWeight: 800, color: C.b1, background: `${C.blue}04`, borderRight: "none" }}>{fmtCell(rowSum(sectionKey, rowName))}</td>
          </tr>
        ))}
        {/* Section subtotal */}
        <tr style={{ background: "rgba(139,123,244,.02)" }}>
          <td style={{ ...cs }} />
          <td style={{ ...cs, textAlign: "left", fontWeight: 800, color: C.b1, fontSize: 12, borderRight: `2px solid ${C.border}` }}>計</td>
          {months.map((_, ci) => (
            <td key={ci} style={{ ...cs, fontWeight: 800, color: C.b1, borderTop: `2px solid ${C.b1}` }}>{fmtCell(colSum(sectionKey, ci))}</td>
          ))}
          <td style={{ ...cs, fontWeight: 800, color: "#fff", background: "rgba(139,123,244,.04)", borderTop: "1px solid rgba(139,123,244,.15)", fontFamily: mono, fontSize: 13, borderRight: "none" }}>{fmtCell(totalSum(sectionKey))}</td>
        </tr>
      </>
    );
  };

  return (
    <Card3 s={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "18px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 9, color: C.textMut, fontWeight: 500, letterSpacing: ".16em", textTransform: "uppercase" }}>月別経費帳</div>
          <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>セルをクリックして直接編集 · Tab で横移動</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Mag s={{ padding: "6px 14px", border: `1px solid ${C.border}`, background: C.surface, color: C.textSec, fontSize: 10, cursor: "pointer", fontFamily: bd, fontWeight: 700 }}>CSV出力</Mag>
          <BtnApprove s={{ padding: "6px 14px", border: "none", background: "rgba(139,123,244,.12)", color: "#C4B8FF", border: "1px solid rgba(139,123,244,.3)", fontSize: 10, cursor: "pointer", fontFamily: bd, fontWeight: 700 }}>保存</BtnApprove>
        </div>
      </div>

      {/* Scrollable table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1200 }}>
          <thead>
            <tr style={{ background: C.surfAlt }}>
              <th style={{ ...cs, fontSize: 9, color: C.textMut, fontWeight: 500, letterSpacing: ".1em", width: 28 }}></th>
              <th style={{ ...cs, fontSize: 9, color: C.textMut, fontWeight: 500, letterSpacing: ".1em", textAlign: "left", width: labelW, borderRight: `2px solid ${C.border}` }}>勘定科目</th>
              {months.map(m => <th key={m} style={{ ...cs, fontSize: 10, color: C.textMut, fontWeight: 700 }}>{m}</th>)}
              <th style={{ ...cs, fontSize: 10, color: C.b1, fontWeight: 800, background: `${C.blue}06`, borderRight: "none" }}>年計</th>
            </tr>
          </thead>
          <tbody>
            {renderSection("収入", "収入金額")}
            {renderSection("経費", "必要経費")}
            {/* Profit row */}
            <tr style={{ background: "rgba(139,123,244,.03)" }}>
              <td style={{ ...cs }} />
              <td style={{ ...cs, textAlign: "left", fontWeight: 800, color: C.b2, fontSize: 13, fontFamily: mono, borderRight: `2px solid ${C.border}` }}>差引金額</td>
              {months.map((_, ci) => {
                const rev = colSum("収入", ci);
                const exp = colSum("経費", ci);
                const diff = rev - exp;
                return <td key={ci} style={{ ...cs, fontWeight: 800, color: diff >= 0 ? C.b2 : C.b1, fontFamily: mono, fontSize: 12 }}>{diff === 0 ? "" : fmtCell(diff)}</td>;
              })}
              <td style={{ ...cs, fontWeight: 800, color: "#fff", fontFamily: mono, fontSize: 14, background: "rgba(139,123,244,.06)", borderRight: "none" }}>{fmtCell(totalSum("収入") - totalSum("経費"))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 28px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: C.textMut }}>
        <span>収入計: ¥{totalSum("収入").toLocaleString()} · 経費計: ¥{totalSum("経費").toLocaleString()}</span>
        <span style={{ color: C.b2, fontWeight: 700 }}>差引金額: ¥{(totalSum("収入") - totalSum("経費")).toLocaleString()}</span>
      </div>
    </Card3>
  );
}

/* ════════════════════════════════ MISSING DOCS PANEL (Collapsible) ════════════════════════════════ */

function BooksPage() {
  const [acctFilter, setAcctFilter] = useState([]);
  const [expPeriod, setExpPeriod] = useState("month");
  const [qDate, setQDate] = useState("2026-02-20");
  const [qAmount, setQAmount] = useState("");
  const [qAccount, setQAccount] = useState("");
  const [qMemo, setQMemo] = useState("");
  const accts = ["会議費","交際費","旅費交通費","消耗品費","通信費","外注費","広告宣伝費","地代家賃","水道光熱費","給料手当","雑費"];
  const Y = "\u00A5";
  const [, , addJournalRow] = useJournalRows();
  const expenseBreakdown = useExpenseBreakdown();
  const addQ = () => {
    if (!qAmount) return;
    // qDate is yyyy-mm-dd → JournalLedger filters on yyyy/mm/dd.
    const normalizedDate = qDate.replace(/-/g, "/");
    addJournalRow({
      date: normalizedDate,
      debitAcc: qAccount || "雑費",
      creditAcc: "現金",
      debit: Number(String(qAmount).replace(/,/g, "")) || 0,
      memo: qMemo,
    });
    setQAmount(""); setQMemo(""); setQAccount("");
  };

  return (
    <PageShell title="仕訳帳" watermark={"仕訳\n帳"}>
      {/* Input bar */}
      <Rv><Card3 s={{ padding:"14px 20px", marginBottom:14 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input type="date" value={qDate} onChange={e=>setQDate(e.target.value)} style={{ padding:"8px 10px", border:"1px solid rgba(139,123,244,.15)", borderRadius:18, fontFamily:bd, fontSize:12, color:"#E0DAFF", outline:"none", width:140, boxSizing:"border-box", background:"rgba(139,123,244,.04)", caretColor:"#A89BFF" }} />
          <input value={qAmount} onChange={e=>setQAmount(e.target.value)} placeholder={`${Y} 金額`} style={{ padding:"8px 10px", border:"1px solid rgba(139,123,244,.15)", borderRadius:18, fontFamily:mono, fontSize:18, color:"#E0DAFF", outline:"none", width:130, boxSizing:"border-box", background:"rgba(139,123,244,.04)", caretColor:"#A89BFF" }} />
          <select value={qAccount} onChange={e=>setQAccount(e.target.value)} style={{ padding:"8px 10px", border:"1px solid rgba(139,123,244,.15)", borderRadius:18, fontFamily:bd, fontSize:12, color:qAccount?"#E0DAFF":"rgba(168,155,255,.35)", outline:"none", width:110, boxSizing:"border-box", background:"rgba(139,123,244,.04)" }}>
            <option value="" style={{ background: "#1a1a2e", color: "rgba(168,155,255,.5)" }}>科目（AI推定）</option>{accts.map(a=><option key={a} value={a} style={{ background: "#1a1a2e", color: "#E0DAFF" }}>{a}</option>)}
          </select>
          <input value={qMemo} onChange={e=>setQMemo(e.target.value)} placeholder="摘要・メモ" onKeyDown={e=>{if(e.key==="Enter")addQ();}} style={{ flex:1, padding:"8px 10px", border:"1px solid rgba(139,123,244,.15)", borderRadius:18, fontFamily:bd, fontSize:12, color:"#E0DAFF", outline:"none", boxSizing:"border-box", background:"rgba(139,123,244,.04)", caretColor:"#A89BFF" }} />
          <button type="button" style={{ padding:"8px 12px", border:"1.5px dashed rgba(139,123,244,.2)", borderRadius:18, background:"transparent", color:"rgba(168,155,255,.4)", fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:bd, whiteSpace:"nowrap" }}>+ 証憑</button>
          <Mag onClick={addQ} s={{ padding:"8px 18px", border:"none", borderRadius:18, background:qAmount?"rgba(139,123,244,.15)":C.border, color:qAmount?"#C4B8FF":C.textMut, fontSize:12, fontWeight:700, cursor:qAmount?"pointer":"default", fontFamily:bd, whiteSpace:"nowrap", boxShadow:qAmount?"0 0 14px rgba(139,123,244,.3)":"none", textShadow:qAmount?"0 0 8px rgba(168,155,255,.4)":"none" }}>追加</Mag>
        </div>
      </Card3></Rv>

      {/* Journal Ledger (full) */}
      <Rv d={20}><JournalLedger acctFilter={acctFilter} onAcctFilter={setAcctFilter} /></Rv>

      {/* Expense Breakdown — Morph Ring with Period Selector */}
      <Rv d={60}><Card3 s={{ padding:28, marginBottom:20 }}>{(() => {
        const periods = [
          { id:"day", l:"日", sub:"—" },
          { id:"week", l:"週", sub:"—" },
          { id:"month", l:"月", sub:"—" },
          { id:"year", l:"年", sub:"—" },
        ];
        const periodData = {
          day: [],
          week: [],
          month: [],
          year: expenseBreakdown,
        };
        const periodLabels = { day:"日次経費", week:"週次経費", month:"月次経費", year:"年間経費" };
        return (<>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <div style={{ fontSize:18, color:"#fff", fontWeight:600, fontFamily:hd, letterSpacing:"-.01em" }}>経費内訳</div>
            <div style={{ display:"flex", gap:3, background:"rgba(139,123,244,.04)", borderRadius:14, padding:3, border:"1px solid rgba(139,123,244,.06)" }}>
              {periods.map(p => (
                <Mag key={p.id} onClick={()=>setExpPeriod(p.id)} s={{
                  padding:"6px 14px", borderRadius:12, border:"none", cursor:"pointer", fontFamily:bd, fontSize:11, fontWeight:expPeriod===p.id?700:500,
                  background:expPeriod===p.id?"rgba(139,123,244,.15)":"transparent",
                  color:expPeriod===p.id?"#C4B8FF":"rgba(168,155,255,.35)",
                  boxShadow:expPeriod===p.id?"0 0 14px rgba(139,123,244,.2)":"none",
                  transition:"all .25s cubic-bezier(.16,1,.3,1)",
                }}>
                  {p.l}
                </Mag>
              ))}
            </div>
          </div>
          <div style={{ fontSize:10, color:C.textMut, marginBottom:14, fontFamily:mono }}>
            {periods.find(p=>p.id===expPeriod)?.sub}
          </div>
          <ChartMorphRing data={periodData[expPeriod]} periodLabel={periodLabels[expPeriod]} />
        </>);
      })()}</Card3></Rv>
    </PageShell>
  );
}

/* ═══════════════════════ PLAN — Timeline + Filing ═══════════════════════ */

export { JournalLedger, FilingForms, MonthlyLedger, BooksPage, FORM_DEFS };
