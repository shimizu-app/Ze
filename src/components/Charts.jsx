import React, { useState, useEffect, useRef, useCallback } from "react";
import { C, hd, bd, mono } from "../lib/theme";
import { CHART_DATA_6, CHART_DATA_12, EXPENSE_DATA } from "../lib/chartData";

function ChartWaveArea({ data: dataProp }) {
  const [animated, setAnimated] = useState(false);
  const [hover, setHover] = useState(null);
  const [clicked, setClicked] = useState(null);
  const containerRef = useRef();
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 150); return () => clearTimeout(t); }, []);

  const w = 600, h = 200, py = 20;
  const data = (dataProp && dataProp.length ? dataProp : CHART_DATA_6);
  const max = Math.max(20, ...data.map(d => d.revenue || 0));

  const makeSpline = (key) => {
    const pts = data.map((d,i) => ({
      x: (i / (data.length-1)) * w,
      y: py + (1 - d[key] / max) * (h - py*2),
    }));
    let path = "M" + pts[0].x + "," + pts[0].y;
    for (let i = 1; i < pts.length; i++) {
      const cpx1 = pts[i-1].x + (pts[i].x - pts[i-1].x) * 0.4;
      const cpx2 = pts[i].x - (pts[i].x - pts[i-1].x) * 0.4;
      path += " C" + cpx1 + "," + pts[i-1].y + " " + cpx2 + "," + pts[i].y + " " + pts[i].x + "," + pts[i].y;
    }
    return { path, pts };
  };
  const revenue = makeSpline("revenue");
  const profit = makeSpline("profit");
  const revArea = revenue.path + " L" + w + "," + h + " L0," + h + " Z";
  const profArea = profit.path + " L" + w + "," + h + " L0," + h + " Z";

  const handleMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(x * (data.length - 1));
    if (idx >= 0 && idx < data.length) setHover(idx);
  }, []);

  const active = clicked !== null ? clicked : hover;

  return (
    <div style={{ position:"relative" }}>
      <div ref={containerRef} style={{ padding:"0 4px" }}
        onMouseMove={handleMove} onMouseLeave={() => { if (clicked===null) setHover(null); }}
        onClick={() => setClicked(clicked===hover ? null : hover)}
      >
        <svg width="100%" viewBox={"0 0 " + w + " " + (h+30)} style={{ display:"block", overflow:"visible" }}>
          <defs>
            <linearGradient id="waveRevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(139,123,244,.35)" /><stop offset="100%" stopColor="rgba(139,123,244,.01)" />
            </linearGradient>
            <linearGradient id="waveProfGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(123,224,160,.25)" /><stop offset="100%" stopColor="rgba(123,224,160,.01)" />
            </linearGradient>
            <filter id="waveGlow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="waveDotGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <path d={revArea} fill="url(#waveRevGrad)" opacity={animated?1:0} style={{ transition:"opacity .8s" }} />
          <path d={profArea} fill="url(#waveProfGrad)" opacity={animated?1:0} style={{ transition:"opacity .8s .2s" }} />
          <path d={revenue.path} fill="none" stroke="rgba(168,155,255,.8)" strokeWidth="2.5" strokeLinecap="round" filter="url(#waveGlow)" opacity={animated?1:0} style={{ transition:"opacity .6s .3s" }} />
          <path d={profit.path} fill="none" stroke="rgba(123,224,160,.6)" strokeWidth="2" strokeLinecap="round" filter="url(#waveGlow)" opacity={animated?1:0} style={{ transition:"opacity .6s .5s" }} />
          {active !== null && (() => {
            const rp = revenue.pts[active]; const pp = profit.pts[active];
            return (<g>
              <line x1={rp.x} y1={0} x2={rp.x} y2={h} stroke="rgba(168,155,255,.15)" strokeWidth="1" />
              <rect x={rp.x-1} y={0} width={2} height={h} fill="rgba(168,155,255,.06)" />
              <circle cx={rp.x} cy={rp.y} r="6" fill="#A89BFF" stroke="#0C0C16" strokeWidth="3" filter="url(#waveDotGlow)" />
              <circle cx={pp.x} cy={pp.y} r="5" fill="#7BE0A0" stroke="#0C0C16" strokeWidth="3" filter="url(#waveDotGlow)" />
            </g>);
          })()}
          {data.map((d,i) => (
            <text key={i} x={revenue.pts[i].x} y={h+24} textAnchor="middle" fill={active===i?"#fff":"#C8C8D8"} fontSize="13" fontWeight={active===i?"600":"400"} fontFamily="'Noto Sans JP', sans-serif" style={{ transition:"all .2s" }}>{d.label}</text>
          ))}
        </svg>
      </div>
      <div style={{ overflow:"hidden", maxHeight:active!==null?140:0, opacity:active!==null?1:0, transition:"all .4s cubic-bezier(.16,1,.3,1)" }}>
        {active !== null && (() => {
          const d = data[active]; const prev = data[active > 0 ? active-1 : 0];
          const change = ((d.revenue - prev.revenue) / prev.revenue * 100).toFixed(1);
          return (
            <div style={{ padding:"14px 16px 18px", background:"linear-gradient(180deg, rgba(139,123,244,.03), transparent)", borderTop:"1px solid rgba(139,123,244,.06)", display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:16 }}>
              {[{ l:"売上", v:"¥"+Math.round(d.revenue*100).toLocaleString()+"万", c:"#fff" }, { l:"経費", v:"¥"+Math.round(d.expense*100).toLocaleString()+"万", c:"rgba(255,255,255,.5)" }, { l:"利益", v:"¥"+Math.round(d.profit*100).toLocaleString()+"万", c:"#7BE0A0" }, { l:"顧客数", v:d.clients+"社", c:"#fff" }].map((item,i) => (
                <div key={i}>
                  <div style={{ fontSize:10, color:"#C8C8D8", fontFamily:"'JetBrains Mono', monospace", letterSpacing:".1em", marginBottom:4 }}>{item.l}</div>
                  <div style={{ fontFamily:"'Outfit', sans-serif", fontSize:22, fontWeight:300, color:item.c, letterSpacing:"-.02em", textShadow:item.c==="#7BE0A0"?"0 0 12px rgba(123,224,160,.25)":item.c==="#fff"?"0 0 12px rgba(255,255,255,.12)":"none" }}>{item.v}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   H: MORPH RING — ドーナツ + クリックでセグメント拡大
   ════════════════════════════════════════════════════ */
function ChartMorphRing({ data: dataProp, periodLabel }) {
  const [animated, setAnimated] = useState(false);
  const [active, setActive] = useState(null);
  useEffect(() => { setAnimated(false); setActive(null); const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, [dataProp]);

  const expenses = dataProp || EXPENSE_DATA;
  const total = expenses.reduce((s,e) => s+e.value, 0);
  const cx = 100, cy = 100, r = 76, sw = 20;
  let cumAngle = -90;
  const segments = expenses.map((e) => {
    const angle = (e.value / total) * 360;
    const startAngle = cumAngle; cumAngle += angle;
    const endAngle = cumAngle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad); const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);   const y2 = cy + r * Math.sin(endRad);
    const large = angle > 180 ? 1 : 0;
    return { ...e, path: "M"+x1+","+y1+" A"+r+","+r+" 0 "+large+" 1 "+x2+","+y2 };
  });

  return (
    <div style={{ display:"flex", gap:24, alignItems:"center" }}>
      <div style={{ position:"relative", width:200, height:200, flexShrink:0 }}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          <defs><filter id="ringGlw"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(139,123,244,.04)" strokeWidth={sw} />
          {segments.map((seg,i) => (
            <path key={i} d={seg.path} fill="none" stroke={seg.color} strokeWidth={active===i?sw+8:sw}
              strokeLinecap="round" style={{ cursor:"pointer", filter:active===i?"url(#ringGlw)":"none",
                opacity:animated?(active!==null&&active!==i?0.3:1):0, transition:"all .5s cubic-bezier(.16,1,.3,1)",
                transformOrigin:cx+"px "+cy+"px", transform:active===i?"scale(1.06)":"scale(1)" }}
              onClick={() => setActive(active===i?null:i)} />
          ))}
        </svg>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center" }}>
          {active !== null ? (<>
            <div style={{ fontFamily:"'Outfit', sans-serif", fontSize:24, fontWeight:300, color:"#fff", letterSpacing:"-.02em", textShadow:"0 0 16px rgba(255,255,255,.2)", transition:"all .3s" }}>{"\u00A5"}{Math.round(expenses[active].value*100).toLocaleString()}万</div>
            <div style={{ fontSize:10, color:"#C8C8D8", fontFamily:"'JetBrains Mono', monospace" }}>{expenses[active].label}</div>
          </>) : (<>
            <div style={{ fontFamily:"'Outfit', sans-serif", fontSize:28, fontWeight:300, color:"#fff", letterSpacing:"-.02em", textShadow:"0 0 16px rgba(255,255,255,.2)" }}>{"\u00A5"}{Math.round(total*100).toLocaleString()}万</div>
            <div style={{ fontSize:10, color:"#C8C8D8", fontFamily:"'JetBrains Mono', monospace" }}>{periodLabel || "総経費"}</div>
          </>)}
        </div>
      </div>
      <div style={{ flex:1 }}>
        {expenses.map((e,i) => (
          <div key={i} onClick={() => setActive(active===i?null:i)}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", marginBottom:3,
              borderRadius:12, cursor:"pointer", transition:"all .3s",
              background:active===i?"rgba(139,123,244,.06)":"transparent",
              border:active===i?"1px solid rgba(139,123,244,.15)":"1px solid transparent",
              boxShadow:active===i?"0 0 20px rgba(139,123,244,.08)":"none" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:e.color, flexShrink:0,
              boxShadow:active===i?"0 0 10px "+e.color+", 0 0 24px "+e.color:"none", transition:"box-shadow .3s" }} />
            <span style={{ fontSize:12, color:active===i?"#fff":"#E8E8F0", flex:1, fontWeight:active===i?600:400, transition:"all .3s" }}>{e.label}</span>
            <span style={{ fontSize:13, color:active===i?"#fff":"#9999B0", fontFamily:"'Outfit', sans-serif", fontWeight:300,
              textShadow:active===i?"0 0 10px rgba(255,255,255,.2)":"none" }}>{"\u00A5"}{Math.round(e.value*100)}万</span>
            <span style={{ fontSize:11, color:"#B0B0C8", fontFamily:"'JetBrains Mono', monospace", width:36, textAlign:"right" }}>{((e.value/total)*100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   I: RUNWAY BAR — 12ヶ月横並び + スクラブ + オーバーレイ
   ════════════════════════════════════════════════════ */
function ChartRunwayBar({ data: dataProp }) {
  const [animated, setAnimated] = useState(false);
  const [active, setActive] = useState(null);
  const barRef = useRef();
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);
  const data = (dataProp && dataProp.length ? dataProp : CHART_DATA_12);
  const max = Math.max(1, ...data.map(d => d.revenue || 0));

  const handleMove = useCallback((e) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const idx = Math.floor(x * data.length);
    if (idx >= 0 && idx < data.length) setActive(idx);
  }, []);

  return (
    <div style={{ position:"relative" }}>
      <div ref={barRef} onMouseMove={handleMove} onMouseLeave={() => setActive(null)}
        style={{ padding:"0 4px", display:"flex", gap:3, alignItems:"flex-end", height:160, cursor:"crosshair" }}>
        {data.map((d,i) => {
          const isActive = active === i;
          const heightPct = (d.revenue / (max * 1.15)) * 100;
          return (
            <div key={i} style={{
              flex:1, borderRadius:"6px 6px 2px 2px",
              height:animated?heightPct+"%":"0%",
              background:isActive?"linear-gradient(180deg, rgba(168,155,255,1) 0%, rgba(139,123,244,.5) 100%)":i===data.length-1?"linear-gradient(180deg, rgba(139,123,244,.7) 0%, rgba(139,123,244,.2) 100%)":"linear-gradient(180deg, rgba(139,123,244,.3) 0%, rgba(139,123,244,.06) 100%)",
              boxShadow:isActive?"0 0 20px rgba(168,155,255,.5), 0 -8px 28px rgba(139,123,244,.2), 0 0 48px rgba(139,123,244,.1)":"0 0 4px rgba(139,123,244,.05)",
              transition:isActive?"all .15s":"all .6s cubic-bezier(.16,1,.3,1) "+(i*40)+"ms",
              transform:isActive?"scaleX(1.6) scaleY(1.04)":"scaleX(1) scaleY(1)",
              transformOrigin:"bottom center", position:"relative", zIndex:isActive?10:1,
            }} />
          );
        })}
      </div>
      <div style={{ display:"flex", padding:"6px 4px 0", gap:3 }}>
        {data.map((d,i) => (
          <div key={i} style={{ flex:1, textAlign:"center", fontSize:11,
            color:active===i?"#fff":i===data.length-1?"rgba(255,255,255,.5)":"#C8C8D8",
            fontWeight:active===i?700:400, transition:"all .15s" }}>{d.label.replace("月","")}</div>
        ))}
      </div>
      <div style={{ overflow:"hidden", maxHeight:active!==null?110:0, opacity:active!==null?1:0, transition:"all .25s cubic-bezier(.16,1,.3,1)" }}>
        {active !== null && (() => {
          const d = data[active]; const prev = data[active > 0 ? active - 1 : 0];
          const change = ((d.revenue - prev.revenue) / prev.revenue * 100).toFixed(1);
          return (
            <div style={{ padding:"12px 4px 6px", borderTop:"1px solid rgba(139,123,244,.06)", display:"flex", alignItems:"center", gap:24, background:"linear-gradient(180deg, rgba(139,123,244,.03), transparent)" }}>
              <div style={{ fontFamily:"'Outfit', sans-serif", fontSize:32, fontWeight:300, color:"#fff", letterSpacing:"-.03em", textShadow:"0 0 18px rgba(255,255,255,.25), 0 0 44px rgba(255,255,255,.06)", minWidth:110 }}>{"\u00A5"}{Math.round(d.revenue*100).toLocaleString()}万</div>
              <div><div style={{ fontSize:10, color:"#C8C8D8", fontFamily:"'JetBrains Mono', monospace", marginBottom:2 }}>利益</div><div style={{ fontFamily:"'Outfit', sans-serif", fontSize:18, fontWeight:300, color:"#7BE0A0", textShadow:"0 0 10px rgba(123,224,160,.2)" }}>{"\u00A5"}{Math.round(d.profit*100).toLocaleString()}万</div></div>
              <div><div style={{ fontSize:10, color:"#C8C8D8", fontFamily:"'JetBrains Mono', monospace", marginBottom:2 }}>前月比</div><div style={{ fontFamily:"'Outfit', sans-serif", fontSize:18, fontWeight:300, color:change>=0?"#fff":"#E87070" }}>{change>=0?"+":""}{change}%</div></div>
              <div><div style={{ fontSize:10, color:"#C8C8D8", fontFamily:"'JetBrains Mono', monospace", marginBottom:2 }}>利益率</div><div style={{ fontFamily:"'Outfit', sans-serif", fontSize:18, fontWeight:300, color:"rgba(255,255,255,.6)" }}>{((d.profit/d.revenue)*100).toFixed(1)}%</div></div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}



export { ChartWaveArea, ChartMorphRing, ChartRunwayBar };
