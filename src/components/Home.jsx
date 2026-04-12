import React, { useState, useEffect, useRef } from "react";
import { C, hd, bd, mono } from "../lib/theme";
import { Rv, Mag, Card3, PageShell } from "./ui";
import { ChartWaveArea, ChartMorphRing, ChartRunwayBar } from "./Charts";
import { HoloBadge, COMPANY_TYPES } from "./Intake";
import { useChartSeries6 } from "../lib/store";

function MissingDocsPanel({ missing, sevColor, sevLabel }) {
  const [open, setOpen] = useState(false);
  const highCount = missing.filter(m => m.severity === "high").length;
  return (
    <Card3 s={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
      {/* Collapsed header — always visible */}
      <Mag onClick={() => setOpen(!open)} s={{ padding: "18px 28px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", border: "none", background: "transparent", fontFamily: bd, textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={highCount > 0 ? C.b1 : C.b4} strokeWidth="2.5" style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,.25))" }} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 11v6M12 17h.01"/></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>未回収・不足書類</span>
          <span style={{ background: highCount > 0 ? C.b1 : C.b4, color: "#fff", fontSize: 9, fontWeight: 600, padding: "2px 10px", borderRadius: 100 }}>{missing.length}件</span>
          {highCount > 0 && <span style={{ fontSize: 10, color: C.b1, fontWeight: 700 }}>うち{highCount}件 急ぎ</span>}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMut} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}><path d="M6 9l6 6 6-6"/></svg>
      </Mag>

      {/* Expanded content */}
      {open && (
        <div style={{ borderTop: `1px solid ${C.borderLt}` }}>
          {/* Action bar */}
          <div style={{ padding: "12px 28px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" style={{ padding: "7px 18px", borderRadius: 100, border: `1.5px solid ${C.border}`, background: "transparent", color: C.textSec, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: bd }}>+ 不足書類を追加</button>
            <button type="button" style={{ padding: "7px 18px", borderRadius: 100, border: "none", background: "rgba(139,123,244,.12)", color: "#C4B8FF", border: "1px solid rgba(139,123,244,.3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: bd, boxShadow: "0 0 14px rgba(139,123,244,.3), 0 0 36px rgba(139,123,244,.1)" }}>リマインド一括送信</button>
          </div>

          {/* List */}
          {missing.map((m, i) => (
            <div key={m.id} style={{ padding: "14px 28px", borderTop: `1px solid ${C.borderLt}`, display: "flex", alignItems: "center", gap: 14, transition: "background .15s" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${sevColor(m.severity)}08`, border: `1px solid ${sevColor(m.severity)}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: sevColor(m.severity), flexShrink: 0, boxShadow: `0 0 10px ${sevColor(m.severity)}20, 0 0 22px ${sevColor(m.severity)}08` }}>{sevLabel(m.severity)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{m.doc}</div>
                <div style={{ fontSize: 10, color: C.textMut, marginTop: 1 }}>期限: {m.due}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button type="button" style={{ padding: "5px 14px", borderRadius: 100, border: `1.5px solid ${C.border}`, background: "transparent", color: C.textSec, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: bd }}>リマインド</button>
                <button type="button" style={{ padding: "5px 14px", borderRadius: 100, border: "1px solid rgba(139,123,244,.15)", background: "rgba(139,123,244,.06)", color: "rgba(139,123,244,.6)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: bd }}>受領済み</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card3>
  );
}

/* ════════════════════════════════ HOME ════════════════════════════════ */

/* ═══════════════════════ HOME — Dashboard (view only) ═══════════════════════ */
/* ── Archetype Banner (Home用) ── */
/* ── compass detail data (per type) ── */
const COMPASS_DATA = {
  leviathan: {
    reasons: [
      "借入残高が存在し、金融機関との関係が財務の中心にある",
      "資金調達・設備投資への関心が回答に表れている",
      "売上規模に対して外部資本への依存度が高い構造",
    ],
    tendencies: [
      { label:"資金調達依存度", level: 4, note:"外部借入に頼る傾向" },
      { label:"財務健全性", level: 3, note:"CF管理に改善余地" },
      { label:"信用力への意識", level: 5, note:"金融機関対策が強い" },
    ],
    compass: "今期は決算書の「見た目」を金融機関目線で整える時期。売上総利益率と営業CFのプラス維持を最優先にすること。次の融資枠拡大に向けた根拠資料の整備を今から始めるべき。",
  },
  phoenix: {
    reasons: [
      "繰越欠損金が存在し、財務の立て直しが急務",
      "借入残高が重く、返済に追われるキャッシュ構造",
      "過去の税務調査指摘が財務管理上のリスクを示している",
    ],
    tendencies: [
      { label:"財務健全性", level: 2, note:"赤字・借入過多の兆候" },
      { label:"再建への意欲", level: 5, note:"課題認識は明確" },
      { label:"キャッシュ余力", level: 2, note:"手元流動性が課題" },
    ],
    compass: "まず損益分岐点を明確にし、不採算部門・経費を徹底精査。金融機関へのリスケ交渉も視野に入れ、短期的な黒字化ラインを引き直すことが先決。",
  },
  dragon: {
    reasons: [
      "売上・従業員数が成長フェーズに入っている",
      "新規事業の開始や再投資サイクルが加速している",
      "サブスク収益モデルで将来CFの見通しが立ちやすい",
    ],
    tendencies: [
      { label:"成長速度", level: 5, note:"急拡大フェーズ" },
      { label:"CF先読み精度", level: 3, note:"計画と実績にズレが出やすい" },
      { label:"税負担の最適化", level: 2, note:"成長優先で後回しになりがち" },
    ],
    compass: "成長に伴う人件費・外注費の急増に備え、四半期ごとのCF予測を立てること。再投資額と手元留保のバランスを意識し、法人税の繰り延べ策を今期中に設計すべき。",
  },
  sphinx: {
    reasons: [
      "安定した利益水準で節税余地が大きい",
      "役員報酬が高水準で個人・法人の税最適化が有効",
      "青色申告で各種特典をフル活用できる体制",
    ],
    tendencies: [
      { label:"節税意識", level: 5, note:"税負担最小化へ強い関心" },
      { label:"内部留保", level: 4, note:"利益が手元に残る構造" },
      { label:"税務調査リスク", level: 3, note:"節税強度に比例して上昇" },
    ],
    compass: "役員退職金の積立設計と法人保険の見直しが最優先。経費計上の根拠書類を今から整備し、税務調査に耐えられるエビデンスを揃えておくこと。",
  },
  chimera: {
    reasons: [
      "複数の収益モデルを持ち、事業間の資金移動が複雑",
      "新規事業開始や多角化の動きが回答に反映されている",
      "海外取引も絡み、国際税務の視点が必要",
    ],
    tendencies: [
      { label:"事業多様性", level: 5, note:"複数収益柱がある" },
      { label:"管理コスト", level: 4, note:"複雑化で経理負荷が高い" },
      { label:"グループ最適化", level: 3, note:"まだ整理の余地がある" },
    ],
    compass: "事業ごとのセグメント損益を可視化し、どの事業が利益を生んでいるかを明確にする時期。持株会社スキームの検討も視野に入れ、グループ全体の税負担を最小化する設計を。",
  },
  kraken: {
    reasons: [
      "飲食・小売など入出金サイクルが速い業種特性",
      "手元現金の不足・資金繰り不安が相談内容に表れている",
      "物販ECなど在庫を持つビジネスでCF管理が命綱",
    ],
    tendencies: [
      { label:"CF変動リスク", level: 5, note:"入出金のズレが大きい" },
      { label:"在庫・仕入管理", level: 4, note:"資金拘束の主要因" },
      { label:"収益の安定性", level: 3, note:"季節変動・波がある" },
    ],
    compass: "売掛金の回収サイクルを最短化し、支払いは合法的に後ろ倒し。月次で13週間のCFシミュレーションを作成し、資金ショートを常に2ヶ月先まで予測する習慣をつけること。",
  },
  griffin: {
    reasons: [
      "M&A・事業譲渡が選択肢として具体的に挙がっている",
      "売上規模が出口戦略を現実的にする水準に達している",
      "事業承継や株式評価の最適化に経営者の関心がある",
    ],
    tendencies: [
      { label:"出口意識", level: 5, note:"売却・承継を視野に" },
      { label:"企業価値への注力", level: 4, note:"BS・PLの見た目を意識" },
      { label:"準備期間の認識", level: 3, note:"まだ時間はあると思いがち" },
    ],
    compass: "出口の3〜5年前から企業価値評価を高める財務改善が必要。今期は不良資産の整理と役員退職金の積立設計を開始し、株価算定に有利なBSを作る基盤固めを。",
  },
  unicorn: {
    reasons: [
      "設立から3年以内の創業初期フェーズ",
      "売上規模がまだ立ち上がり段階にある",
      "顧問税理士不在で、税務の基礎構築が急務",
    ],
    tendencies: [
      { label:"税務基盤の整備度", level: 2, note:"記帳・申告が未整備" },
      { label:"助成金活用", level: 3, note:"まだ使えるものがある" },
      { label:"資金調達余地", level: 4, note:"創業融資の窓口は広い" },
    ],
    compass: "青色申告の承認申請と記帳体制の整備が最優先。創業融資（日本政策金融公庫）は設立後早いほど有利なので今すぐ動くこと。補助金・助成金のカレンダーも確認すべき。",
  },
  golem: {
    reasons: [
      "設立10年以上の安定期にある老舗企業",
      "借入なし・欠損なしで財務の健全性が高い",
      "従業員構成・売上規模ともに安定した水準を維持",
    ],
    tendencies: [
      { label:"財務安定性", level: 5, note:"ほぼリスクなし" },
      { label:"変化への対応力", level: 2, note:"現状維持バイアスが強い" },
      { label:"内部留保の活用", level: 3, note:"積み上がっているが使えていない" },
    ],
    compass: "安定は強みだが、内部留保の活用方針を明確にする時期。役員退職金の設計・設備更新・新規投資の検討を今期から始め、10年後も競争力を維持できる財務戦略を描くべき。",
  },
};

/* ── Archetype Banner (Home用・羅針盤) ── */
function ArchetypeBanner() {
  const type = COMPANY_TYPES.leviathan;
  const compass = COMPASS_DATA.leviathan;
  const ref = React.useRef(null);
  const rafRef = React.useRef(null);
  const c = type.color;

  const handleMove = (e) => {
    if (!ref.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      const badge = ref.current.querySelector(".ab-badge");
      if (badge) badge.style.transform = `rotateX(${-dy * 12}deg) rotateY(${dx * 12}deg) scale(1.04)`;
      const foil = ref.current.querySelector(".ab-foil");
      if (foil) foil.style.opacity = "1";
    });
  };
  const handleLeave = () => {
    if (!ref.current) return;
    const badge = ref.current.querySelector(".ab-badge");
    if (badge) badge.style.transform = "";
    const foil = ref.current.querySelector(".ab-foil");
    if (foil) foil.style.opacity = "0";
  };

  /* テンダンシーバー */
  const TendBar = ({ level }) => (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ width:14, height:4, borderRadius:2,
          background: i <= level ? c : `${c}18`,
          boxShadow: i <= level && i === level ? `0 0 6px ${c}` : "none",
          transition:"background .2s"
        }}/>
      ))}
    </div>
  );

  return (
    <Card3 s={{ padding:0, marginBottom:14, overflow:"hidden", position:"relative" }}>
      {/* BG glow */}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at 80% 50%, ${c}06 0%, transparent 65%)`, pointerEvents:"none" }}/>

      {/* ── ヘッダー行 ── */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 24px 14px", borderBottom:`1px solid ${c}12` }}>
        <div style={{ fontFamily:hd, fontSize:9, letterSpacing:5, color:`${c}70`, textTransform:"uppercase" }}>Company Archetype</div>
        <div style={{ width:1, height:10, background:`${c}30` }}/>
        <div style={{ fontFamily:hd, fontSize:9, padding:"2px 10px", borderRadius:20, border:`1px solid ${c}30`, color:c, letterSpacing:1.5, opacity:.8 }}>{type.tag}</div>
        <div style={{ flex:1 }}/>
        <div style={{ fontSize:10, color:"rgba(255,255,255,.2)", letterSpacing:1 }}>羅針盤</div>
        {/* compass icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`${c}50`} strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>
        </svg>
      </div>

      {/* ── メイン3カラム ── */}
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{ display:"grid", gridTemplateColumns:"auto 1fr 1fr 1fr", gap:0, cursor:"default" }}
      >
        {/* ─ LEFT: Badge ─ */}
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", borderRight:`1px solid ${c}10`, gap:10 }}>
          <div style={{ perspective:600 }}>
            <div className="ab-badge" style={{ width:76, height:102, borderRadius:12, background:type.bgGrad, border:`1px solid ${c}30`, position:"relative", overflow:"hidden", transformStyle:"preserve-3d", transition:"transform .08s linear", boxShadow:`0 8px 32px rgba(0,0,0,.4)` }}>
              <div className="ab-foil" style={{ position:"absolute",inset:0,borderRadius:12,opacity:0,transition:"opacity .3s",mixBlendMode:"screen",background:type.foilGrad,backgroundSize:"300% 300%",animation:"hbFoil 5s ease infinite" }}/>
              <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:"10px 8px",zIndex:2 }}>
                <svg width="38" height="38" viewBox="0 0 50 50"><g dangerouslySetInnerHTML={{__html:type.svgPath}}/></svg>
                <div style={{ fontFamily:hd,fontSize:6,color:c,letterSpacing:1,textAlign:"center",textShadow:`0 0 10px ${c}` }}>{type.name}</div>
              </div>
            </div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:hd, fontSize:13, fontWeight:600, color:c, letterSpacing:1, textShadow:`0 0 16px ${c}60`, marginBottom:2 }}>{type.name}</div>
            <div style={{ fontSize:10, color:`${c}70`, letterSpacing:2 }}>{type.jp}</div>
          </div>
        </div>

        {/* ─ COL 1: このタイプと診断された理由 ─ */}
        <div style={{ padding:"20px 20px", borderRight:`1px solid ${c}10` }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            <div style={{ fontSize:9, fontFamily:hd, letterSpacing:3, color:`${c}80`, textTransform:"uppercase" }}>診断の根拠</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {compass.reasons.map((r, i) => (
              <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                <div style={{ width:16, height:16, borderRadius:"50%", background:`${c}15`, border:`1px solid ${c}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                  <div style={{ fontFamily:hd, fontSize:8, color:c }}>{i+1}</div>
                </div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", lineHeight:1.7 }}>{r}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─ COL 2: 貴社の財務傾向 ─ */}
        <div style={{ padding:"20px 20px", borderRight:`1px solid ${c}10` }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <div style={{ fontSize:9, fontFamily:hd, letterSpacing:3, color:`${c}80`, textTransform:"uppercase" }}>財務傾向</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
            {compass.tendencies.map((t, i) => (
              <div key={i}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.6)", fontWeight:500 }}>{t.label}</div>
                  <div style={{ fontSize:9, color:`${c}60` }}>{t.note}</div>
                </div>
                <TendBar level={t.level}/>
              </div>
            ))}
          </div>
        </div>

        {/* ─ COL 3: 今期の羅針盤 ─ */}
        <div style={{ padding:"20px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>
            <div style={{ fontSize:9, fontFamily:hd, letterSpacing:3, color:`${c}80`, textTransform:"uppercase" }}>今期の方針</div>
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.55)", lineHeight:1.85, marginBottom:16 }}>
            {compass.compass}
          </div>
          {/* priority pills */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {type.priority.map((p, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:4, height:4, borderRadius:"50%", background:c, opacity:.6, flexShrink:0 }}/>
                <div style={{ fontSize:10, color:c, opacity:.8, letterSpacing:.5 }}>{p}</div>
              </div>
            ))}
          </div>
          {/* warning */}
          <div style={{ marginTop:14, padding:"10px 12px", borderRadius:8, background:`rgba(255,255,255,.02)`, border:`1px solid ${c}15` }}>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.28)", lineHeight:1.65 }}>⚠ {type.warning}</div>
          </div>
        </div>
      </div>
    </Card3>
  );
}

function Home({ goTo, goalMode }) {
  const Y = "\u00A5";
  const chartData6 = useChartSeries6();

  /* ── Segmented Bar component (planet.ai style) ── */
  const SegBar = ({ value, max, segments = 28, color = "rgba(139,123,244,.6)" }) => {
    const filled = Math.round((value / max) * segments);
    return (
      <div style={{ display: "flex", gap: 2, filter: "drop-shadow(0 0 6px rgba(255,255,255,.1))" }}>
        {Array.from({ length: segments }, (_, i) => (
          <div key={i} style={{
            flex: 1, height: 14, borderRadius: 2,
            background: i < filled ? color : "rgba(139,123,244,.04)",
            opacity: i < filled ? (0.4 + 0.6 * (i / segments)) : 1,
            boxShadow: i === filled - 1 ? `0 0 10px ${color}, 0 0 20px ${color}` : "none",
          }} />
        ))}
      </div>
    );
  };

  /* ── Icon Badge (planet.ai rounded square) ── */
  const IconBadge = ({ children, color = "rgba(139,123,244,.08)", size = 56 }) => (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, border: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 14px rgba(255,255,255,.12), 0 0 32px rgba(255,255,255,.05)" }}>
      {children}
    </div>
  );

  /* ── Pct change arrow ── */
  const Pct = ({ value, suffix = "%" }) => {
    const up = value >= 0;
    return (
      <span style={{ fontSize: 11, fontWeight: 600, color: up ? "#7BE0A0" : "#E87070", fontFamily: mono }}>
        {up ? "+" : ""}{value}{suffix} {up ? "↗" : "↘"}
      </span>
    );
  };

  return (
    <PageShell title="ホーム" watermark={"ホー\nム"}>
      {/* ── Hero KPI Row: planet.ai style ── */}
      <Rv><div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12, marginBottom:14 }}>
        {[
          { label:"売上", jp:"売上", value:"—", pct:0, icon:<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
          { label:"経費", jp:"経費", value:"—", pct:0, icon:<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg> },
          { label:"営業利益", jp:"営業利益", value:"—", pct:0, icon:<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
        ].map((k,i)=>(
          <Card3 key={i} s={{ padding:"20px 22px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <IconBadge>{k.icon}</IconBadge>
              <div>
                <div style={{ fontSize:10, color:C.textMut, fontWeight:500, letterSpacing:".15em", textTransform:"uppercase", marginBottom:8 }}>{k.jp}</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
                  <span style={{ fontFamily:hd, fontSize:48, fontWeight:300, color:"#fff", letterSpacing:"-.03em", textShadow:"0 0 20px rgba(255,255,255,.25), 0 0 50px rgba(255,255,255,.08)" }}>{Y}{k.value}</span>
                  <Pct value={k.pct} />
                </div>
              </div>
            </div>
          </Card3>
        ))}
      </div></Rv>

      {/* ── Archetype Banner (データ取得後に表示) ── */}
      {/* <Rv d={10}><ArchetypeBanner /></Rv> */}

      {/* ── Analytic View + 3D Chart — side by side ── */}
      <Rv d={15}><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>

        {/* Left: Analytic view with segmented bars (planet.ai style) */}
        <Card3 s={{ padding:"20px 22px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <span style={{ fontSize:18, fontWeight:600, color:"#fff", fontFamily:hd, letterSpacing:"-.01em" }}>分析ビュー</span>
            <span style={{ fontSize:10, color:C.textMut, fontWeight:500 }}>This month ▾</span>
          </div>

          {/* Bar 1: Average revenue */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:10, color:C.textMut, marginBottom:4 }}>月間売上推移</div>
            <div style={{ fontFamily:hd, fontSize:28, fontWeight:300, color:"#fff", marginBottom:8, letterSpacing:"-.02em", textShadow:"0 0 12px rgba(255,255,255,.2), 0 0 36px rgba(255,255,255,.06)" }}>—</div>
            <SegBar value={0} max={20} segments={30} color="rgba(160,145,255,.65)" />
          </div>

          {/* Bar 2: Expense ratio */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:10, color:C.textMut, marginBottom:4 }}>経費率</div>
            <div style={{ fontFamily:hd, fontSize:28, fontWeight:300, color:"#fff", marginBottom:8, letterSpacing:"-.02em", textShadow:"0 0 12px rgba(255,255,255,.2), 0 0 36px rgba(255,255,255,.06)" }}>—</div>
            <SegBar value={0} max={100} segments={30} color="rgba(139,123,244,.45)" />
          </div>

          {/* Bar 3: Profit margin */}
          <div>
            <div style={{ fontSize:10, color:C.textMut, marginBottom:4 }}>利益率</div>
            <div style={{ fontFamily:hd, fontSize:28, fontWeight:300, color:"#fff", marginBottom:8, letterSpacing:"-.02em", textShadow:"0 0 12px rgba(255,255,255,.2), 0 0 36px rgba(255,255,255,.06)" }}>—</div>
            <SegBar value={0} max={30} segments={30} color="rgba(139,123,244,.35)" />
          </div>
        </Card3>

        {/* Right: Wave Area chart */}
        <Card3 s={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"18px 22px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:18, fontWeight:600, color:"#fff", fontFamily:hd, letterSpacing:"-.01em" }}>6ヶ月推移</span>
            <div style={{ display:"flex", gap:12, fontSize:10 }}>
              <span style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:8, height:3, borderRadius:2, background:"rgba(139,123,244,.7)", boxShadow:"0 0 8px rgba(139,123,244,.4)" }}/>売上</span>
              <span style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:8, height:3, borderRadius:2, background:"rgba(123,224,160,.5)", boxShadow:"0 0 8px rgba(123,224,160,.3)" }}/>利益</span>
            </div>
          </div>
          <div style={{ padding:"8px 16px 0" }}>
            <ChartWaveArea data={chartData6} />
          </div>
        </Card3>
      </div></Rv>

      {/* ── Balance + Progress Row (planet.ai Parcels-in-way style) ── */}
      <Rv d={25}><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        {/* Left: Balance card */}
        <Card3 s={{ padding:"20px 22px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <IconBadge>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/></svg>
            </IconBadge>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, color:C.textMut, marginBottom:4 }}>預金残高</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span style={{ fontFamily:hd, fontSize:36, fontWeight:300, color:"#fff", letterSpacing:"-.03em" }}>—</span>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:9, color:C.textMut }}></div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.35)" }}></div>
            </div>
          </div>
          {/* Gradient progress bar (planet.ai Parcels style) */}
          <div style={{ marginTop:16, height:10, borderRadius:8, background:"rgba(139,123,244,.04)", overflow:"hidden", position:"relative" }}>
            <div style={{ height:"100%", width:"0%", borderRadius:8, background:"linear-gradient(90deg, rgba(139,123,244,.12), rgba(139,123,244,.45))", boxShadow:"0 0 8px rgba(139,123,244,.2), 0 0 20px rgba(139,123,244,.08)" }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
            <span style={{ fontSize:9, color:C.textMut }}>普通 —</span>
            <span style={{ fontSize:9, color:C.textMut }}>当座 —</span>
          </div>
        </Card3>

        {/* Right: Year progress */}
        <Card3 s={{ padding:"20px 22px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
            <IconBadge>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </IconBadge>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, color:C.textMut, marginBottom:4 }}>年度進捗</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span style={{ fontFamily:hd, fontSize:40, fontWeight:300, color:"#fff", letterSpacing:"-.02em" }}>—</span>
                <span style={{ fontSize:14, color:"rgba(255,255,255,.25)" }}>/ 12ヶ月</span>
              </div>
            </div>
            <span style={{ fontFamily:hd, fontSize:36, fontWeight:300, color:"rgba(255,255,255,.5)", letterSpacing:"-.02em" }}>—</span>
          </div>
          {/* Segmented progress */}
          <div style={{ display:"flex", gap:3, filter: "drop-shadow(0 0 6px rgba(255,255,255,.08))" }}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} style={{
                flex: 1, height: 10, borderRadius: 3,
                background: "rgba(139,123,244,.04)",
                opacity: 1,
              }} />
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
            <span style={{ fontSize:9, color:C.textMut }}></span>
            <span style={{ fontSize:9, color:C.textMut }}></span>
          </div>
        </Card3>
      </div></Rv>

      {/* ── Goal-specific KPIs ── */}
      {goalMode && goalMode !== "general" && <Rv d={30}><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
        {({
          tax: [{ l:"推定税額", v:"—", s:"法人税+消費税", c:"#A89BFF" }, { l:"節税余地", v:"—", s:"控除・前倒し可能", c:"#8B7BF4" }],
          cost: [{ l:"削減可能経費", v:"—", s:"", c:"#8B7BF4" }, { l:"固定費率", v:"—", s:"", c:"#A89BFF" }],
          loan: [{ l:"営業利益率", v:"—", s:"", c:"#8B7BF4" }, { l:"自己資本比率", v:"—", s:"", c:"#8B7BF4" }],
          growth: [{ l:"広告費比率", v:"—", s:"", c:"#A89BFF" }, { l:"キャッシュ余力", v:"—", s:"", c:"#8B7BF4" }],
        }[goalMode] || []).map((k,i)=>(
          <Card3 key={i} s={{ padding:"18px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:4, height:36, borderRadius:4, background:k.c, flexShrink:0 }} />
              <div>
                <div style={{ fontSize:9, color:C.textMut, fontWeight:500, letterSpacing:".1em", textTransform:"uppercase", fontFamily:mono, marginBottom:4 }}>{k.l}</div>
                <div style={{ fontFamily:hd, fontSize:32, fontWeight:300, color:"#fff", letterSpacing:"-.02em" }}>{k.v}</div>
                <div style={{ fontSize:10, color:C.textMut, marginTop:2 }}>{k.s}</div>
              </div>
            </div>
          </Card3>
        ))}
      </div></Rv>}

      {/* ── Deadlines + Tasks — planet.ai tracking history style ── */}
      <Rv d={40}><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>

        {/* Deadlines — timeline dots (planet.ai tracking style) */}
        <Mag onClick={()=>goTo("plan")} s={{ cursor:"pointer", display:"block" }}>
          <Card3 s={{ padding:0, overflow:"hidden" }}>
            <div style={{ padding:"18px 22px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:18, fontWeight:600, color:"#fff", fontFamily:hd, letterSpacing:"-.01em" }}>直近の締切</span>
              <span style={{ fontSize:10, color:"rgba(255,255,255,.35)", fontWeight:600 }}>Plan →</span>
            </div>
            {[].length === 0 && (
              <div style={{ padding:"20px 22px", textAlign:"center", color:C.textMut, fontSize:11 }}>締切データなし</div>
            )}
          </Card3>
        </Mag>

        {/* Tasks — clean icon list (planet.ai style) */}
        <Mag onClick={()=>goTo("tasks")} s={{ cursor:"pointer", display:"block" }}>
          <Card3 s={{ padding:0, overflow:"hidden" }}>
            <div style={{ padding:"18px 22px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:18, fontWeight:600, color:"#fff", fontFamily:hd, letterSpacing:"-.01em" }}>未処理タスク</span>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontFamily:hd, fontSize:36, fontWeight:300, color:"#fff", letterSpacing:"-.02em" }}>0</span>
                <span style={{ fontSize:10, color:C.textMut }}>件</span>
                <span style={{ fontSize:10, color:"rgba(255,255,255,.35)", fontWeight:600, marginLeft:4 }}>Tasks →</span>
              </div>
            </div>
            {[
              {l:"AI仕訳候補",n:0,icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>,desc:"OCRから自動推定された仕訳"},
              {l:"未確認仕訳",n:0,icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,desc:"信頼度95%未満の仕訳"},
              {l:"締切リマインド",n:0,icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,desc:"対応が必要な期限"},
              {l:"不足書類",n:0,icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>,desc:"回収待ちの書類"},
            ].map((t,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 22px", borderTop:`1px solid ${C.borderLt}` }}>
                <IconBadge>{t.icon}</IconBadge>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{t.l}</span>
                    <span style={{ fontFamily:hd, fontSize:18, color:"rgba(255,255,255,.4)", fontWeight:400 }}>{t.n}</span>
                  </div>
                  <div style={{ fontSize:10, color:C.textMut, marginTop:2 }}>{t.desc}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(139,123,244,.25)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            ))}
          </Card3>
        </Mag>


      </div></Rv>

      {/* ── Recent Activity (planet.ai timeline style) ── */}
      <Rv d={60}><Card3 s={{ padding:"20px 22px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <span style={{ fontSize:18, fontWeight:600, color:"#fff", fontFamily:hd, letterSpacing:"-.01em" }}>更新履歴</span>
          <div style={{ width:28, height:28, borderRadius:8, background:"rgba(139,123,244,.04)", border:"1px solid rgba(139,123,244,.06)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <span style={{ color:"rgba(255,255,255,.25)", fontSize:14, lineHeight:1 }}>⋯</span>
          </div>
        </div>
        {[].map((l,i,arr)=>{
          const dotColor = {ai:"rgba(255,255,255,.7)",auto:"rgba(255,255,255,.5)",deadline:"rgba(255,255,255,.7)",filing:"rgba(255,255,255,.35)",upload:"rgba(255,255,255,.2)"}[l.type]||C.textMut;
          return (
            <div key={i} style={{ display:"flex", gap:16, position:"relative" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:10 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:dotColor, flexShrink:0, zIndex:1, border:"2px solid rgba(6,6,12,.9)", boxShadow:`0 0 8px ${dotColor}` }} />
                {i < arr.length-1 && <div style={{ width:1, flex:1, background:"rgba(139,123,244,.06)" }} />}
              </div>
              <div style={{ flex:1, paddingBottom:14, display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:10, color:C.textMut, width:36, flexShrink:0, fontFamily:mono }}>{l.time}</span>
                <span style={{ fontSize:12, color:"rgba(255,255,255,.75)" }}>{l.action}</span>
              </div>
            </div>
          );
        })}
        <div style={{ textAlign:"center", padding:"16px 0", color:C.textMut, fontSize:11 }}>履歴はまだありません</div>
      </Card3></Rv>

      {/* ── Missing Docs ── */}
      <Rv d={80}><MissingDocsPanel missing={[]} sevColor={s=>s===1?C.b1:s===2?C.b2:C.b4} sevLabel={s=>s===1?"急ぎ":s===2?"要対応":"通常"} /></Rv>
    </PageShell>
  );
}


export { Home, MissingDocsPanel };
