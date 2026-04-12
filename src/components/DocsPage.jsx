import React, { useState, useRef } from "react";
import { C, hd, bd, mono } from "../lib/theme";
import { Rv, Mag, Card3, PageShell } from "./ui";
import { ChartRunwayBar } from "./Charts";
import { FilingForms, MonthlyLedger, FORM_DEFS } from "./BooksPage";
import { useChartSeries12 } from "../lib/store";

function PlanPage() {
  const months = ["4月","5月","6月","7月","8月","9月","10月","11月","12月","1月","2月","3月"];
  const currentMonth = new Date().getMonth(); // 0-indexed, adjusted for fiscal year below
  const chartData12 = useChartSeries12();
  const [events, setEvents] = useState([]);
  const [addMonth, setAddMonth] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("tax");

  const addEvent = () => {
    if (!newLabel || addMonth === null) return;
    setEvents(prev => [...prev, { month: addMonth, label: newLabel, type: newType }].sort((a,b) => a.month - b.month));
    setNewLabel(""); setAddMonth(null);
  };

  return (
    <PageShell title="スケジュール" watermark={"Sche\ndule"}>
      {/* Annual Timeline */}
      <Rv><Card3 s={{ padding:28, marginBottom:20 }}>
        <div style={{ fontSize:18, color:"#fff", fontWeight:600, marginBottom:20, fontFamily:hd, letterSpacing:"-.01em" }}>年間スケジュール</div>
        {/* Timeline bar — clickable months */}
        <div style={{ display:"flex", gap:2, marginBottom:8 }}>
          {months.map((m,i)=>{
            const hasEvents = events.some(e=>e.month===i);
            return (
              <Mag key={i} onClick={()=>setAddMonth(addMonth===i?null:i)} s={{ flex:1, textAlign:"center", cursor:"pointer", padding:"4px 0", borderRadius:14, background:addMonth===i?`${C.blue}08`:"transparent", border:"none", fontFamily:bd, transition:"background .15s" }}>
                <div style={{ height:8, borderRadius:12, background:i<currentMonth?"rgba(139,123,244,.3)":i===currentMonth?"rgba(139,123,244,.6)":"rgba(139,123,244,.04)", marginBottom:4, transition:"background .3s", position:"relative", boxShadow:i===currentMonth?"0 0 8px rgba(139,123,244,.4), 0 0 18px rgba(139,123,244,.15)":"none" }}>
                  {hasEvents && <div style={{ position:"absolute", top:-3, right:"50%", transform:"translateX(50%)", width:5, height:5, borderRadius:"50%", background:i<=currentMonth?"#A89BFF":"rgba(139,123,244,.25)", border:"1.5px solid rgba(6,6,12,.9)", boxShadow:i<=currentMonth?"0 0 6px rgba(139,123,244,.5)":"none" }}/>}
                </div>
                <span style={{ fontSize:9, fontWeight:i===currentMonth||addMonth===i?800:500, color:addMonth===i?"#fff":i===currentMonth?"#fff":C.textMut }}>{m}</span>
              </Mag>
            );
          })}
        </div>

        {/* Add event form (appears when month is clicked) */}
        {addMonth !== null && (
          <div style={{ padding:"14px 16px", margin:"8px 0 14px", background:`${C.blue}04`, borderRadius:20, border:`1.5px solid ${C.blue}15` }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.blue }}>{months[addMonth]}に予定を追加</span>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="内容（例: 決算準備）" onKeyDown={e=>{if(e.key==="Enter")addEvent();}} style={{ flex:1, padding:"8px 12px", border:"1px solid rgba(139,123,244,.15)", borderRadius:18, fontFamily:bd, fontSize:12, outline:"none", background:"rgba(139,123,244,.04)", color:"#E0DAFF", caretColor:"#A89BFF" }} />
              <div style={{ display:"flex", gap:3 }}>
                {[{id:"tax",l:"税金"},{id:"filing",l:"申告"},{id:"task",l:"タスク"}].map(t=>(
                  <button key={t.id} type="button" onClick={()=>setNewType(t.id)} style={{ padding:"6px 12px", borderRadius:14, border:newType===t.id?"1px solid rgba(139,123,244,.3)":`1px solid rgba(255,255,255,.06)`, background:newType===t.id?"rgba(139,123,244,.12)":"transparent", color:newType===t.id?"#C4B8FF":"rgba(168,155,255,.35)", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:bd, boxShadow:newType===t.id?"0 0 10px rgba(139,123,244,.2)":"none" }}>{t.l}</button>
                ))}
              </div>
              <Mag onClick={addEvent} s={{ padding:"8px 18px", border:"none", borderRadius:18, background:newLabel?"rgba(139,123,244,.15)":C.border, color:newLabel?"#C4B8FF":C.textMut, fontSize:12, fontWeight:700, cursor:newLabel?"pointer":"default", fontFamily:bd, boxShadow:newLabel?"0 0 14px rgba(139,123,244,.3)":"none" }}>追加</Mag>
              <button type="button" onClick={()=>setAddMonth(null)} style={{ padding:"8px", border:"none", background:"transparent", color:C.textMut, fontSize:14, cursor:"pointer" }}>×</button>
            </div>
          </div>
        )}
        <div style={{ fontSize:11, color:C.textSec, marginBottom:16 }}>進捗: <strong style={{ color:"#fff" }}>{Math.round((currentMonth+1)/12*100)}%</strong> ({currentMonth+1}/12ヶ月)</div>
        {/* Events */}
        <div style={{ borderTop:`1px solid ${C.borderLt}`, paddingTop:14 }}>
          {events.filter(e=>e.month>=currentMonth).map((e,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderTop:i?`1px solid ${C.borderLt}`:"none" }}>
              <span style={{ fontSize:9, fontWeight:600, color:e.type==="filing"?"#E87070":e.type==="task"?"#fff":"rgba(255,255,255,.5)", padding:"3px 10px", background:"rgba(139,123,244,.04)", border:"1px solid rgba(139,123,244,.08)", borderRadius:8, flexShrink:0 }}>{e.type==="filing"?"申告":e.type==="task"?"タスク":"税金"}</span>
              <span style={{ flex:1, fontSize:12, fontWeight:600, color:C.dark }}>{e.label}</span>
              <span style={{ fontSize:10, color:C.textMut }}>{months[e.month]}</span>
            </div>
          ))}
        </div>
      </Card3></Rv>

      {/* Filing deadlines */}
      <Rv d={40}><Card3 s={{ padding:28, marginBottom:20 }}>
        <div style={{ fontSize:18, color:"#fff", fontWeight:600, marginBottom:20, fontFamily:hd, letterSpacing:"-.01em" }}>申告期限</div>
        {[].length === 0 && (
          <div style={{ padding:"20px 0", textAlign:"center", color:C.textMut, fontSize:11 }}>申告期限データなし</div>
        )}
        {[].map((d,i)=>(
          <div key={i} style={{ padding:"18px 0", borderTop:i?`1px solid ${C.borderLt}`:"none", display:"flex", alignItems:"center", gap:20 }}>
            <span style={{ fontSize:9, fontWeight:600, color:"#fff", padding:"4px 10px", background:"rgba(139,123,244,.06)", border:"1px solid rgba(139,123,244,.12)", borderRadius:8, letterSpacing:".08em", flexShrink:0 }}>{d.st}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.dark, marginBottom:4 }}>{d.t}</div>
              <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:11, color:C.textMut }}><span>期限: {d.due}</span><span>|</span><span>残り{d.left}日</span></div>
            </div>
            <div style={{ width:120, height:6, background:"rgba(139,123,244,.04)", borderRadius:4, overflow:"hidden" }}><div style={{ height:"100%", width:`${d.pct}%`, background:"linear-gradient(90deg, rgba(139,123,244,.1), rgba(139,123,244,.4))", borderRadius:4, boxShadow:"0 0 6px rgba(139,123,244,.15)" }}/></div>
            <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.4)" }}>{d.pct}%</span>
          </div>
        ))}
      </Card3></Rv>

      {/* Revenue & Profit — 12 Month Runway Bar */}
      <Rv d={60}><Card3 s={{ padding:0, marginBottom:20, overflow:"hidden" }}>
        <div style={{ padding:"20px 28px 8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:18, color:"#fff", fontWeight:600, fontFamily:hd, letterSpacing:"-.01em" }}>年間売上推移</span>
          <span style={{ fontSize:10, color:"#B0B0C8", fontFamily:mono }}>← スクラブで月を選択 →</span>
        </div>
        <div style={{ padding:"0 20px 0" }}>
          <ChartRunwayBar data={chartData12} />
        </div>
        <div style={{ height:12 }} />
      </Card3></Rv>
    </PageShell>
  );
}

/* ════════════════════════════════ 申告書 (DOCS) ════════════════════════════════ */
function DocsPage() {
  return (
    <PageShell title="申告書" watermark={"申告\n書"}>
      {/* Filing Forms — original full format */}
      <Rv><FilingForms /></Rv>

      {/* Monthly Ledger — original full format */}
      <Rv d={40}><MonthlyLedger /></Rv>
    </PageShell>
  );
}

/* ════════════════════════════════ 資料作成 (EXPORT) ════════════════════════════════ */
/* ═══ PDF Preview Editor Component ═══ */
/* ═══ PDF Preview Editor Component ═══ */
function PdfPreviewEditor({ docId, formDef, editData, updateEdit, formEdits, setFormEdits, itemName, itemDesc }) {
  const ed = editData || {};
  const getV = (sec) => { const k = `${docId}:${sec}`; if (formEdits[k] !== undefined) return formEdits[k]; const row = formDef?.sections.flatMap(s=>s.rows).find(r=>r.sec===sec); return row ? row.v : null; };
  const setV = (sec, val) => setFormEdits(prev => ({...prev, [`${docId}:${sec}`]: val}));
  const isEd = (sec) => { const k = `${docId}:${sec}`; const orig = formDef?.sections.flatMap(s=>s.rows).find(r=>r.sec===sec)?.v; return formEdits[k] !== undefined && formEdits[k] !== orig; };
  const fmtV = (v) => v !== null && v !== undefined && v !== 0 ? Number(v).toLocaleString() : "";

  const cellFocus = (e) => { e.target.style.borderColor = "rgba(26,70,144,.35)"; e.target.style.background = "rgba(26,70,144,.04)"; };
  const cellBlur = (e, highlight) => { e.target.style.borderColor = highlight ? "rgba(232,184,75,.25)" : "transparent"; e.target.style.background = highlight ? "rgba(232,184,75,.06)" : "transparent"; };

  /* ── Dynamic header fields ── */
  const ALL_FIELDS = [
    { key: "taxOffice", label: "税務署長", def: "", group: "basic" },
    { key: "entity", label: "氏名 / 法人名", def: "", group: "basic" },
    { key: "address", label: "住所 / 事業所", def: "", group: "basic" },
    { key: "createdDate", label: "作成日", def: "", group: "date" },
    { key: "submitDate", label: "提出日", def: "", group: "date" },
    { key: "periodFrom", label: "事業年度（自）", def: "", group: "date" },
    { key: "periodTo", label: "事業年度（至）", def: "", group: "date" },
    { key: "repName", label: "代表者氏名", def: "", group: "extra" },
    { key: "tel", label: "電話番号", def: "", group: "extra" },
    { key: "capital", label: "資本金", def: "", group: "extra" },
    { key: "employees", label: "従業員数", def: "", group: "extra" },
    { key: "industry", label: "業種", def: "", group: "extra" },
    { key: "accountant", label: "税理士", def: "", group: "extra" },
    { key: "accountMethod", label: "経理方式", def: "", group: "extra" },
    { key: "filingType", label: "申告区分", def: "", group: "extra" },
    { key: "corpNum", label: "法人番号", def: "", group: "extra" },
    { key: "note", label: "備考", def: "", group: "extra" },
  ];

  const DEFAULT_ACTIVE = ["taxOffice", "entity", "address", "createdDate", "submitDate", "periodFrom", "periodTo"];

  const [activeFields, setActiveFields] = useState(() => {
    return ed._activeFields || DEFAULT_ACTIVE;
  });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customFields, setCustomFields] = useState(() => ed._customFields || []);

  // Persist active field list into editData
  const syncFields = (fields, customs) => {
    updateEdit("_activeFields", fields);
    if (customs !== undefined) updateEdit("_customFields", customs);
  };

  const removeField = (key) => {
    const next = activeFields.filter(k => k !== key);
    setActiveFields(next);
    syncFields(next);
  };

  const addField = (key) => {
    if (!activeFields.includes(key)) {
      const next = [...activeFields, key];
      setActiveFields(next);
      syncFields(next);
    }
    setShowAddMenu(false);
  };

  const addCustomField = () => {
    if (!customLabel.trim()) return;
    const key = "custom_" + Date.now();
    const newCustom = [...customFields, { key, label: customLabel.trim() }];
    setCustomFields(newCustom);
    const next = [...activeFields, key];
    setActiveFields(next);
    syncFields(next, newCustom);
    setCustomLabel("");
    setShowCustom(false);
    setShowAddMenu(false);
  };

  const removeCustomField = (key) => {
    setCustomFields(prev => prev.filter(f => f.key !== key));
    const next = activeFields.filter(k => k !== key);
    setActiveFields(next);
    syncFields(next, customFields.filter(f => f.key !== key));
  };

  const allFieldDefs = [...ALL_FIELDS, ...customFields.map(f => ({ key: f.key, label: f.label, def: "", group: "custom" }))];
  const inactiveFields = allFieldDefs.filter(f => !activeFields.includes(f.key));
  const groupLabels = { basic: "基本情報", date: "日付", extra: "法人情報", custom: "カスタム" };

  const fieldInputStyle = { width: "100%", fontSize: 11, color: "#2a2a4a", border: "1px solid transparent", borderRadius: 4, padding: "2px 6px", fontFamily: bd, outline: "none", background: "transparent", boxSizing: "border-box", transition: "all .15s" };

  return (
    <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(139,123,244,.06)", maxHeight: "65vh", overflowY: "auto" }}>

      {/* PDF Page header */}
      <div style={{ padding: "28px 36px 16px", borderBottom: "2px solid #1a4690" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <input value={ed.period || ""} onChange={e => updateEdit("period", e.target.value)} placeholder="年度"
            style={{ fontSize: 10, color: "#666", border: "1px solid transparent", borderRadius: 4, padding: "2px 6px", fontFamily: bd, outline: "none", background: "transparent" }}
            onFocus={cellFocus} onBlur={e => cellBlur(e, false)} />
          <span style={{ fontSize: 8, color: "#bbb", fontStyle: "italic" }}>クリックで編集可</span>
        </div>
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <input value={ed.name || itemName || ""} onChange={e => updateEdit("name", e.target.value)}
            style={{ fontSize: 20, fontWeight: 700, color: "#1a4690", border: "1px solid transparent", borderRadius: 6, padding: "4px 12px", textAlign: "center", fontFamily: bd, outline: "none", background: "transparent", width: "80%", transition: "all .15s" }}
            onFocus={cellFocus} onBlur={e => cellBlur(e, false)} />
        </div>
        <div style={{ textAlign: "center", fontSize: 10, color: "#888" }}>{formDef?.subtitle || itemDesc || ""}</div>

        {/* ── Dynamic fields grid ── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14, padding: "10px 0", borderTop: "1px solid #ddd" }}>
          {activeFields.map(key => {
            const def = allFieldDefs.find(f => f.key === key);
            if (!def) return null;
            const isCustom = key.startsWith("custom_");
            return (
              <div key={key} style={{ position: "relative", flex: "1 1 calc(33.33% - 6px)", minWidth: 140, padding: "4px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 1 }}>
                  <span style={{ fontSize: 8, color: "#888", flex: 1 }}>{def.label}</span>
                  <button type="button" onClick={() => isCustom ? removeCustomField(key) : removeField(key)}
                    style={{ width: 14, height: 14, borderRadius: 4, border: "none", background: "transparent", color: "#ccc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontSize: 10, lineHeight: 1, flexShrink: 0, transition: "color .15s" }}
                    onMouseEnter={e => e.target.style.color = "#e55"}
                    onMouseLeave={e => e.target.style.color = "#ccc"}>×</button>
                </div>
                <input value={ed[key] || def.def} onChange={e => updateEdit(key, e.target.value)}
                  style={fieldInputStyle} onFocus={cellFocus} onBlur={e => cellBlur(e, false)} />
              </div>
            );
          })}

          {/* Add field button */}
          <div style={{ position: "relative", flex: "1 1 calc(33.33% - 6px)", minWidth: 140, padding: "4px 0", display: "flex", alignItems: "flex-end" }}>
            <button type="button" onClick={() => setShowAddMenu(!showAddMenu)}
              style={{ width: "100%", padding: "4px 8px", borderRadius: 6, border: "1.5px dashed #ccc", background: "transparent", color: "#999", fontSize: 10, cursor: "pointer", fontFamily: bd, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "all .15s" }}
              onMouseEnter={e => { e.target.style.borderColor = "#1a4690"; e.target.style.color = "#1a4690"; }}
              onMouseLeave={e => { e.target.style.borderColor = "#ccc"; e.target.style.color = "#999"; }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> 項目を追加
            </button>

            {/* Add menu dropdown */}
            {showAddMenu && (
              <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 4, background: "rgba(14,14,24,.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(139,123,244,.15)", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,.4)", zIndex: 30, padding: "6px 0", minWidth: 200, maxHeight: 280, overflowY: "auto" }}
                onClick={e => e.stopPropagation()}>
                {/* Grouped available fields */}
                {Object.entries(groupLabels).map(([grp, grpLabel]) => {
                  const items = inactiveFields.filter(f => f.group === grp);
                  if (items.length === 0) return null;
                  return (
                    <div key={grp}>
                      <div style={{ fontSize: 8, color: C.textMut, fontWeight: 700, padding: "6px 12px 2px", letterSpacing: ".05em" }}>{grpLabel}</div>
                      {items.map(f => (
                        <button key={f.key} type="button" onClick={() => addField(f.key)}
                          style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "6px 12px", border: "none", background: "transparent", color: C.textSec, fontSize: 11, cursor: "pointer", fontFamily: bd, textAlign: "left", transition: "background .1s" }}
                          onMouseEnter={e => e.target.style.background = "rgba(139,123,244,.08)"}
                          onMouseLeave={e => e.target.style.background = "transparent"}>
                          <span style={{ color: "#A89BFF", fontSize: 13, width: 16, textAlign: "center" }}>+</span>
                          {f.label}
                          {f.def && <span style={{ fontSize: 9, color: C.textMut, marginLeft: "auto" }}>{f.def.substring(0, 12)}{f.def.length > 12 ? "…" : ""}</span>}
                        </button>
                      ))}
                    </div>
                  );
                })}

                {/* Custom field input */}
                <div style={{ borderTop: `1px solid ${C.border}`, padding: "6px 12px" }}>
                  {!showCustom ? (
                    <button type="button" onClick={() => setShowCustom(true)}
                      style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "4px 0", border: "none", background: "transparent", color: "#A89BFF", fontSize: 11, cursor: "pointer", fontFamily: bd }}>
                      <span style={{ fontSize: 13 }}>✎</span> カスタム項目を作成…
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                        placeholder="項目名を入力" autoFocus
                        onKeyDown={e => { if (e.key === "Enter") addCustomField(); if (e.key === "Escape") { setShowCustom(false); setCustomLabel(""); } }}
                        style={{ flex: 1, padding: "4px 8px", border: "1px solid rgba(139,123,244,.3)", borderRadius: 6, fontSize: 11, fontFamily: bd, outline: "none", color: C.text, background: "rgba(255,255,255,.04)" }} />
                      <button type="button" onClick={addCustomField}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "rgba(139,123,244,.2)", color: "#C4B8FF", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: bd }}>追加</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Body */}
      {formDef && (
        <div style={{ padding: "16px 36px 28px" }}>
          {formDef.sections.map((sec, si) => (
            <div key={si} style={{ marginBottom: 16 }}>
              <div style={{ background: "#f0f4fa", padding: "6px 10px", borderRadius: 4, marginBottom: 2, border: "1px solid #d0d8e8" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#1a4690" }}>{sec.heading}</span>
              </div>
              <div style={{ display: "flex", padding: "4px 10px", borderBottom: "1px solid #ccc", fontSize: 8, color: "#888", fontWeight: 600 }}>
                <span style={{ width: 30 }}>番号</span>
                <span style={{ flex: 1 }}>項目</span>
                <span style={{ width: 110, textAlign: "right" }}>金額</span>
              </div>
              {sec.rows.map((row, ri) => {
                const isBold = row.bold;
                const isTotal = row.l.includes("合計") || row.l.includes("申告納税") || row.l.includes("課税される") || row.l.includes("差引");
                const v = getV(row.sec);
                const edited = isEd(row.sec);
                return (
                  <div key={ri} style={{ display: "flex", alignItems: "center", padding: "3px 10px", borderBottom: "1px solid #eee", background: isTotal ? "#fdf8ee" : "transparent" }}>
                    <span style={{ width: 30, fontSize: 9, color: "#1a4690", fontWeight: 600 }}>{row.sec}</span>
                    <span style={{ flex: 1, fontSize: 11, color: "#2a2a4a", fontWeight: isBold ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.l}</span>
                    {row.v !== null && row.v !== undefined ? (
                      <input value={fmtV(v)} onChange={e => { const raw = e.target.value.replace(/[^0-9-]/g,""); setV(row.sec, raw === "" ? 0 : parseInt(raw)); }}
                        style={{ width: 110, padding: "2px 6px", textAlign: "right", border: edited ? "1px solid rgba(232,184,75,.25)" : "1px solid transparent", borderRadius: 4, fontSize: 12, fontFamily: bd, fontWeight: isBold ? 700 : 400, color: edited ? "#c58c00" : isBold ? "#cc0000" : "#2a2a4a", outline: "none", boxSizing: "border-box", background: edited ? "rgba(232,184,75,.06)" : "transparent", transition: "all .15s" }}
                        onFocus={cellFocus} onBlur={e => cellBlur(e, edited)} />
                    ) : (
                      <span style={{ width: 110, textAlign: "right", fontSize: 10, color: row.note?.includes("✓") ? "#2a8f4e" : row.note?.includes("⚠") ? "#c58c00" : "#888" }}>
                        {row.note?.includes("✓") ? "✓ 完了" : row.note?.includes("⚠") ? "⚠ 要確認" : row.note?.includes("→") ? "→ 未実行" : "—"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 8, color: "#aaa" }}>※ 本書は{ed.entity || "クライアント名"}の税務データに基づきAIが自動生成したものです。</span>
            <span style={{ fontSize: 8, color: "#aaa" }}>Zeirishi — AI Tax Intelligence Platform</span>
          </div>
        </div>
      )}
      {!formDef && (
        <div style={{ padding: "48px 36px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#888" }}>この書類のプレビューは準備中です</div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>{itemDesc}</div>
        </div>
      )}
    </div>
  );
}

function ExportPage() {
  const [selected, setSelected] = useState([]);
  const [step, setStep] = useState("select"); // "select" | "confirm" | "generating" | "done"
  const [progress, setProgress] = useState(0);
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [editData, setEditData] = useState({});
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [formEdits, setFormEdits] = useState({}); // { "shinkoku:ア": 192000000, ... }

  const docList = [
    { cat: "決算整理", items: [
      { id: "kotei", name: "固定資産台帳", desc: "減価償却資産の明細", pages: 2 },
      { id: "kubun", name: "消費税区分別表", desc: "課税区分別取引集計", pages: 1 },
    ]},
    { cat: "決算書", items: [
      { id: "bs", name: "貸借対照表", desc: "資産・負債・純資産の状況", pages: 2 },
      { id: "pl", name: "損益計算書", desc: "収益・費用・利益の計算", pages: 2 },
    ]},
    { cat: "申告書", items: [
      { id: "shinkoku", name: "確定申告書B（第一表）", desc: "所得税及び復興特別所得税", pages: 2 },
      { id: "hojin", name: "法人税 別表一", desc: "各事業年度の所得に係る申告書", pages: 2 },
      { id: "shohi", name: "消費税申告書", desc: "消費税及び地方消費税", pages: 2 },
    ]},
    { cat: "提出書類", items: [
      { id: "uchiwake", name: "内訳書・概況書", desc: "勘定科目内訳明細書", pages: 3 },
      { id: "shokyaku", name: "償却資産申告書", desc: "固定資産税（償却資産）", pages: 1 },
      { id: "shiharai", name: "支払調書", desc: "報酬・料金等の支払調書", pages: 2 },
    ]},
    { cat: "締め作業", items: [
      { id: "tsukijime", name: "月締めチェックリスト", desc: "月次決算チェック 2月度", pages: 1 },
      { id: "nendojime", name: "年度締めレポート", desc: "決算締め処理ステータス", pages: 1 },
    ]},
    { cat: "電帳法", items: [
      { id: "denchoho", name: "電帳法対応ステータスレポート", desc: "電子帳簿保存法 準拠状況", pages: 2 },
    ]},
  ];

  const allItems = docList.flatMap(c => c.items);
  const totalPages = selected.reduce((sum, id) => sum + (allItems.find(i => i.id === id)?.pages || 0), 0);

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selected.length === allItems.length) setSelected([]);
    else setSelected(allItems.map(i => i.id));
  };

  const selectCat = (cat) => {
    const ids = docList.find(c => c.cat === cat).items.map(i => i.id);
    const allSel = ids.every(id => selected.includes(id));
    if (allSel) setSelected(prev => prev.filter(id => !ids.includes(id)));
    else setSelected(prev => [...new Set([...prev, ...ids])]);
  };

  const goConfirm = () => {
    if (selected.length === 0) return;
    const init = {};
    selected.forEach(id => {
      const item = allItems.find(i => i.id === id);
      init[id] = { name: item.name, period: "", entity: "", note: "" };
    });
    setEditData(init);
    setStep("confirm");
  };

  const updateEdit = (id, field, val) => {
    setEditData(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  };

  const removeFromConfirm = (id) => {
    setSelected(prev => prev.filter(x => x !== id));
    setEditData(prev => { const next = { ...prev }; delete next[id]; return next; });
    if (selected.length <= 1) setStep("select");
  };

  const startGenerate = () => {
    setStep("generating");
    setProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(iv);
        setTimeout(() => {
          setStep("done");
          setGeneratedFiles(selected.map(id => {
            const item = allItems.find(i => i.id === id);
            const ed = editData[id] || {};
            return { id, name: ed.name || item.name, pages: item.pages, size: `${(item.pages * 120 + Math.floor(Math.random() * 80))}KB`, period: ed.period, entity: ed.entity };
          }));
        }, 600);
      }
      setProgress(Math.min(100, Math.floor(p)));
    }, 200);
  };

  const reset = () => { setStep("select"); setGeneratedFiles([]); setProgress(0); };

  const edInputStyle = { padding: "8px 12px", border: "1px solid rgba(139,123,244,.15)", borderRadius: 14, fontFamily: bd, fontSize: 12, color: "#E0DAFF", outline: "none", background: "rgba(139,123,244,.04)", width: "100%", boxSizing: "border-box" };

  return (
    <PageShell title="資料作成" watermark={"資料\n作成"}>

      {/* ═══ STEP 1: SELECT ═══ */}
      {step === "select" && (
        <>
          <Rv><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 13, color: "#E0DAFF", fontWeight: 600, textShadow: "0 0 8px rgba(168,155,255,.2)" }}>書類を選択してPDFを作成</div>
              <div style={{ fontSize: 11, color: C.textMut, marginTop: 4 }}>申告書のデータから正式な書類フォーマットで出力します</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button type="button" onClick={selectAll}
                style={{ padding: "8px 16px", borderRadius: 100, border: "1px solid rgba(139,123,244,.2)", background: selected.length === allItems.length ? "rgba(139,123,244,.1)" : "transparent", color: selected.length === allItems.length ? "#C4B8FF" : C.textMut, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: bd }}>
                {selected.length === allItems.length ? "すべて解除" : "すべて選択"}
              </button>
              {selected.length > 0 && (
                <span style={{ fontSize: 11, color: "#A89BFF", fontWeight: 700 }}>{selected.length}件 / {totalPages}ページ</span>
              )}
            </div>
          </div></Rv>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {docList.map((cat, ci) => (
              <Rv key={ci} d={ci * 60}>
                <Card3 s={{ padding: 0, overflow: "hidden" }}>
                  <div onClick={() => selectCat(cat.cat)}
                    style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <span style={{ fontSize: 10, color: "rgba(168,155,255,.5)", fontWeight: 700, letterSpacing: ".1em" }}>{cat.cat}</span>
                    <span style={{ fontSize: 9, color: C.textMut }}>
                      {cat.items.filter(i => selected.includes(i.id)).length}/{cat.items.length}
                    </span>
                  </div>
                  {cat.items.map((item, ii) => {
                    const sel = selected.includes(item.id);
                    return (
                      <div key={item.id} onClick={() => toggle(item.id)}
                        style={{ padding: "14px 20px", borderBottom: ii < cat.items.length - 1 ? `1px solid rgba(255,255,255,.03)` : "none", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", background: sel ? "rgba(139,123,244,.06)" : "transparent", transition: "all .2s" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 8, border: sel ? "1.5px solid rgba(139,123,244,.5)" : "1.5px solid rgba(255,255,255,.1)", background: sel ? "rgba(139,123,244,.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s", boxShadow: sel ? "0 0 10px rgba(139,123,244,.25)" : "none" }}>
                          {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C4B8FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? "#E0DAFF" : C.textSec, transition: "all .2s", textShadow: sel ? "0 0 8px rgba(168,155,255,.2)" : "none" }}>{item.name}</div>
                          <div style={{ fontSize: 10, color: C.textMut, marginTop: 2 }}>{item.desc}</div>
                        </div>
                        <span style={{ fontSize: 10, color: C.textMut, flexShrink: 0 }}>{item.pages}p</span>
                      </div>
                    );
                  })}
                </Card3>
              </Rv>
            ))}
          </div>

          <Rv d={300}>
            <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
              <Mag onClick={goConfirm} s={{
                padding: "16px 48px", borderRadius: 100,
                border: selected.length > 0 ? "1.5px solid rgba(139,123,244,.4)" : "1.5px solid rgba(255,255,255,.06)",
                background: selected.length > 0 ? "rgba(139,123,244,.1)" : "transparent",
                color: selected.length > 0 ? "#C4B8FF" : C.textMut,
                fontSize: 14, fontWeight: 700, cursor: selected.length > 0 ? "pointer" : "default", fontFamily: bd,
                boxShadow: selected.length > 0 ? "0 0 20px rgba(139,123,244,.3), 0 0 50px rgba(139,123,244,.1)" : "none",
                textShadow: selected.length > 0 ? "0 0 10px rgba(168,155,255,.4)" : "none",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                {selected.length > 0 ? `${selected.length}件を確認して作成` : "書類を選択してください"}
              </Mag>
            </div>
          </Rv>
        </>
      )}

      {/* ═══ STEP 2: CONFIRM / EDIT (PDF PREVIEW) ═══ */}
      {step === "confirm" && (() => {
        const previewDoc = expandedDoc || selected[0];
        const formDef = FORM_DEFS[previewDoc];
        const item = allItems.find(it => it.id === previewDoc);
        const totalEdits = Object.keys(formEdits).length;
        return (
        <>
          {/* Top bar */}
          <Rv><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="button" onClick={() => setStep("select")}
                style={{ padding: "6px 14px", borderRadius: 100, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: C.textSec, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: bd }}>
                ← 戻る
              </button>
              <span style={{ fontSize: 13, color: "#E0DAFF", fontWeight: 600 }}>プレビュー・編集</span>
              {totalEdits > 0 && <span style={{ fontSize: 9, color: "#E8B84B", fontWeight: 700, padding: "2px 8px", border: "1px solid rgba(232,184,75,.2)", borderRadius: 8, background: "rgba(232,184,75,.06)" }}>{totalEdits}件変更</span>}
            </div>
            <Mag onClick={startGenerate} s={{
              padding: "10px 32px", borderRadius: 100,
              border: "1.5px solid rgba(139,123,244,.4)", background: "rgba(139,123,244,.1)", color: "#C4B8FF",
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: bd,
              boxShadow: "0 0 16px rgba(139,123,244,.25)", textShadow: "0 0 8px rgba(168,155,255,.3)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"/><path d="M14 2v6h6"/></svg>
              {selected.length}件を作成
            </Mag>
          </div></Rv>

          {/* Document tabs */}
          <Rv d={30}><div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {selected.map(id => {
              const it = allItems.find(x => x.id === id);
              const edc = Object.keys(formEdits).filter(k => k.startsWith(id + ":")).length;
              const active = id === previewDoc;
              return (
                <button key={id} type="button" onClick={() => setExpandedDoc(id)}
                  style={{ padding: "8px 16px", borderRadius: 14, border: active ? "1.5px solid rgba(139,123,244,.35)" : "1px solid rgba(255,255,255,.06)", background: active ? "rgba(139,123,244,.08)" : "transparent", color: active ? "#C4B8FF" : C.textMut, fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: bd, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, transition: "all .2s", boxShadow: active ? "0 0 12px rgba(139,123,244,.15)" : "none" }}>
                  {editData[id]?.name || it.name}
                  {edc > 0 && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E8B84B", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div></Rv>

          {/* PDF Preview Editor */}
          <Rv d={60}>
            <PdfPreviewEditor
              key={previewDoc}
              docId={previewDoc}
              formDef={formDef}
              editData={editData[previewDoc] || {}}
              updateEdit={(field, val) => updateEdit(previewDoc, field, val)}
              formEdits={formEdits}
              setFormEdits={setFormEdits}
              itemName={item?.name}
              itemDesc={item?.desc}
            />
          </Rv>

          {/* Bottom nav */}
          <Rv d={120}><div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 20 }}>
            {selected.length > 1 && (() => {
              const idx = selected.indexOf(previewDoc);
              return (
                <>
                  <button type="button" disabled={idx <= 0} onClick={() => setExpandedDoc(selected[idx - 1])}
                    style={{ padding: "10px 20px", borderRadius: 100, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: idx > 0 ? C.textSec : "rgba(255,255,255,.15)", fontSize: 11, fontWeight: 600, cursor: idx > 0 ? "pointer" : "default", fontFamily: bd }}>
                    ← 前の書類
                  </button>
                  <span style={{ fontSize: 11, color: C.textMut, alignSelf: "center" }}>{idx + 1} / {selected.length}</span>
                  <button type="button" disabled={idx >= selected.length - 1} onClick={() => setExpandedDoc(selected[idx + 1])}
                    style={{ padding: "10px 20px", borderRadius: 100, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: idx < selected.length - 1 ? C.textSec : "rgba(255,255,255,.15)", fontSize: 11, fontWeight: 600, cursor: idx < selected.length - 1 ? "pointer" : "default", fontFamily: bd }}>
                    次の書類 →
                  </button>
                </>
              );
            })()}
          </div></Rv>
        </>
        );
      })()}
      {/* ═══ STEP 3: GENERATING ═══ */}
      {step === "generating" && (
        <Rv><div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
          <div style={{ width: 320, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(139,123,244,.06)", border: "1.5px solid rgba(139,123,244,.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 0 20px rgba(139,123,244,.2)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A89BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 2s linear infinite" }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            </div>
            <div style={{ height: 4, background: "rgba(139,123,244,.1)", borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #8B7BF4, #C4B8FF)", borderRadius: 4, transition: "width .2s", boxShadow: "0 0 12px rgba(139,123,244,.4)" }} />
            </div>
            <div style={{ fontSize: 14, color: "#E0DAFF", fontWeight: 600 }}>
              {progress < 30 ? "データ収集中..." : progress < 70 ? "PDF生成中..." : progress < 100 ? "最終処理中..." : "完了！"}
            </div>
            <div style={{ fontSize: 11, color: C.textMut, marginTop: 6 }}>{selected.length}件 · {progress}%</div>
          </div>
        </div></Rv>
      )}

      {/* ═══ STEP 4: DONE ═══ */}
      {step === "done" && (
        <>
          <Rv><div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(123,224,160,.1)", border: "1.5px solid rgba(123,224,160,.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "0 0 20px rgba(123,224,160,.2)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7BE0A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#E0DAFF", textShadow: "0 0 12px rgba(168,155,255,.2)" }}>{generatedFiles.length}件の書類を作成しました</div>
            <div style={{ fontSize: 12, color: C.textMut, marginTop: 6 }}>
              合計 {generatedFiles.reduce((s, f) => s + f.pages, 0)} ページ · {generatedFiles[0]?.entity}
            </div>
          </div></Rv>

          <Rv d={80}><Card3 s={{ padding: 0, overflow: "hidden" }}>
            {generatedFiles.map((f, i) => (
              <div key={f.id} style={{ padding: "16px 24px", borderBottom: i < generatedFiles.length - 1 ? `1px solid rgba(255,255,255,.04)` : "none", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(139,123,244,.08)", border: "1px solid rgba(139,123,244,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A89BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#E0DAFF" }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: C.textMut, marginTop: 2 }}>{f.period} · {f.pages}ページ · {f.size}</div>
                </div>
                <Mag s={{ padding: "8px 18px", borderRadius: 100, border: "1px solid rgba(139,123,244,.25)", background: "rgba(139,123,244,.06)", color: "#C4B8FF", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: bd, display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  ダウンロード
                </Mag>
              </div>
            ))}
          </Card3></Rv>

          <Rv d={160}><div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24 }}>
            <button type="button" onClick={reset}
              style={{ padding: "12px 28px", borderRadius: 100, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: C.textSec, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: bd }}>
              ← 書類選択に戻る
            </button>
            <Mag s={{ padding: "12px 28px", borderRadius: 100, border: "1.5px solid rgba(139,123,244,.35)", background: "rgba(139,123,244,.08)", color: "#C4B8FF", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: bd, boxShadow: "0 0 14px rgba(139,123,244,.25)", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              すべてダウンロード（ZIP）
            </Mag>
          </div></Rv>
        </>
      )}
    </PageShell>
  );
}

/* ════════════════════════════════ 監査 (AUDIT) ════════════════════════════════ */

const LINES = [
  "税務調査を、\nあなたの味方に。",
  "書類をアップロード。\nそれだけで審査が始まる。",
  "調査官の目線で\nリスクを洗い出す。",
  "修正すべき箇所を\nひとつずつ、案内する。",
];


export { DocsPage, PlanPage, ExportPage };
