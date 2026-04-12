import React, { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { C, hd, bd, mono } from "../lib/theme";
import { Rv, Mag, Card3, PageShell, BtnApprove } from "./ui";
import { useUploadedFiles } from "../lib/store";

const InputIconCamera = ({ size = 38, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);
const InputIconFolder = ({ size = 38, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
    <line x1="12" y1="11" x2="12" y2="17"/><polyline points="9 14 12 11 15 14"/>
  </svg>
);
const InputIconTable = ({ size = 38, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
    <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
  </svg>
);
const InputIconScan = ({ size = 28, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7V2h5"/><path d="M22 7V2h-5"/><path d="M2 17v5h5"/><path d="M22 17v5h-5"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const InputIconUpArrow = ({ size = 28, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const InputIconBolt = ({ size = 28, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const InputIconCheck = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const InputIconFileText = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const LINES = [
  "税務調査を、\nあなたの味方に。",
  "書類をアップロード。\nそれだけで審査が始まる。",
  "調査官の目線で\nリスクを洗い出す。",
  "修正すべき箇所を\nひとつずつ、案内する。",
];

function CyclingText({ started, hidden }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!started) return;
    setTimeout(() => setVisible(true), 100);
    const iv = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i+1) % LINES.length); setVisible(true); }, 900);
    }, 4000);
    return () => clearInterval(iv);
  }, [started]);
  return (
    <div style={{
      fontFamily: "-apple-system,'SF Pro Display','Helvetica Neue',sans-serif",
      fontSize: "clamp(30px,4.2vw,54px)",
      fontWeight: 700, color: "#fff",
      letterSpacing: ".06em", textAlign: "center", lineHeight: 1.12,
      minHeight: "2.4em", whiteSpace: "pre-line",
      opacity: hidden ? 0 : visible ? 1 : 0,
      transform: visible && !hidden ? "translateY(0)" : "translateY(16px)",
      transition: "opacity 1.6s cubic-bezier(.16,1,.3,1), transform 1.6s cubic-bezier(.16,1,.3,1)",
      pointerEvents: "none",
    }}>{LINES[idx]}</div>
  );
}

// ── Shared 3D renderer util ──
function use3D(ref, buildScene, W, H) {
  useEffect(() => {
    if (!ref.current) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    ref.current.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, W/H, 0.1, 100);
    camera.position.set(0, 0, 8);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const eS = new THREE.Scene();
    // High-contrast chrome environment: blazing whites + deep blacks
    [[0xffffff,30,-2,6,4],   // main blazing key
     [0xffffff,20, 2,5,3],   // secondary bright
     [0xffffff,15,-6,3,2],   // left fill
     [0xffffff,12, 6,2,2],   // right fill
     [0xffffff,25, 0,4,-5],  // back rim = bright outline
     [0xffffff,20,-4,3,-4],
     [0xffffff,20, 4,3,-4],
     [0xffffff,15, 0,8, 0],  // top blaze
    ].forEach(([c,i,x,y,z])=>{
      const l=new THREE.DirectionalLight(c,i); l.position.set(x,y,z); eS.add(l);
    });
    // Pure black ambient = maximum chrome contrast
    eS.add(new THREE.AmbientLight(0x000000,1));
    scene.environment = pmrem.fromScene(eS).texture;
    pmrem.dispose();

    [[0xffffff,8,-2.5,5,7],[0xffffff,5,0,8,1],[0xffffff,4,-8,2,1],
     [0xffffff,3,8,1,1],[0xffffff,3,0,-7,1],[0xffffff,9,0,1,-9],
     [0xffffff,6,-4,3,-7],[0xffffff,6,4,3,-7]].forEach(([c,i,x,y,z])=>{
      const l=new THREE.DirectionalLight(c,i); l.position.set(x,y,z); scene.add(l);
    });
    scene.add(new THREE.AmbientLight(0x0a0a0a,1));
    const gl=new THREE.PointLight(0xffffff,10,14); gl.position.set(-2.8,3.2,5.5); scene.add(gl);
    const rimL=new THREE.PointLight(0xffffff,12,12); rimL.position.set(-5,0,-4); scene.add(rimL);
    const rimR=new THREE.PointLight(0xffffff,12,12); rimR.position.set(5,0,-4); scene.add(rimR);
    const rimT=new THREE.PointLight(0xffffff,10,12); rimT.position.set(0,6,-3); scene.add(rimT);

    const cleanup = buildScene(scene, renderer, camera, ref, W, H);

    return () => { cleanup?.(); renderer.dispose(); if(ref.current) ref.current.innerHTML=""; };
  }, []);
}

// ── FOLDER ──
function Folder3D({ hovered, pressed, dragOver, dropped, onDroppedDone }) {
  const ref = useRef(null);
  const st  = useRef({ hovered:false, pressed:false, dragOver:false, dropped:false, openAmt:0, absorb:0 });
  useEffect(()=>{ st.current.hovered  = hovered;  },[hovered]);
  useEffect(()=>{ st.current.pressed  = pressed;  },[pressed]);
  useEffect(()=>{ st.current.dragOver = dragOver; },[dragOver]);
  useEffect(()=>{
    if(dropped){ st.current.dropped=true; setTimeout(()=>{ st.current.dropped=false; onDroppedDone?.(); },2200); }
  },[dropped]);

  use3D(ref, (scene, renderer, camera, mountRef, W, H) => {
    const mat = (color) => new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color), metalness:0.92, roughness:0.07,
      clearcoat:1, clearcoatRoughness:0.01, reflectivity:1, ior:1.9, envMapIntensity:3.2,
      emissive: new THREE.Color(0x000000), emissiveIntensity:0,
    });
    const mats = [];
    const M = (c) => { const m=mat(c); mats.push(m); return m; };

    const RS=(w,h,r)=>{ const s=new THREE.Shape(),x=-w/2,y=-h/2; s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.absarc(x+w-r,y+r,r,-Math.PI/2,0,false); s.lineTo(x+w,y+h-r); s.absarc(x+w-r,y+h-r,r,0,Math.PI/2,false); s.lineTo(x+r,y+h); s.absarc(x+r,y+h-r,r,Math.PI/2,Math.PI,false); s.lineTo(x,y+r); s.absarc(x+r,y+r,r,Math.PI,3*Math.PI/2,false); return s; };
    const EX=s=>new THREE.ExtrudeGeometry(s,{depth:.32,bevelEnabled:true,bevelThickness:.11,bevelSize:.11,bevelSegments:16,curveSegments:48});

    const bk=new THREE.Mesh(EX(RS(3.9,2.15,.26)),M(0x1c1c1e)); bk.position.z=-.30; scene.add(bk);
    const ts=new THREE.Shape(); ts.moveTo(-1.95,1.075); ts.lineTo(-1.95+1.22-0.17*1.7,1.075); ts.absarc(-1.95+1.22-0.17*1.4,1.075+0.17*0.9,0.17*1.2,-Math.PI/2,0,false); ts.lineTo(-1.95+1.22,1.075+0.44-0.17); ts.absarc(-1.95+1.22-0.17,1.075+0.44-0.17,0.17,0,Math.PI/2,false); ts.lineTo(-1.95+0.17,1.075+0.44); ts.absarc(-1.95+0.17,1.075+0.44-0.17,0.17,Math.PI/2,Math.PI,false); ts.lineTo(-1.95,1.075);
    const tb=new THREE.Mesh(EX(ts),M(0x1c1c1e)); tb.position.z=-.30; scene.add(tb);
    const frGeo=EX(RS(3.7,1.90,.22)); frGeo.translate(0,0.95,0);
    const fr=new THREE.Mesh(frGeo,M(0x1c1c1e)); fr.position.set(0,-1.08,0.05); scene.add(fr);
    const all=[bk,tb,fr];

    let mx=0,my=0,smx=0,smy=0;
    const cv=renderer.domElement;
    const onMv=e=>{ const r=mountRef.current?.getBoundingClientRect(); if(!r) return; mx=((e.clientX-r.left)/W-.5)*2; my=((e.clientY-r.top)/H-.5)*2; };
    cv.addEventListener("mousemove",onMv); cv.addEventListener("mouseleave",()=>{mx=0;my=0;});

    let raf; const clock=new THREE.Clock();
    const loop=()=>{
      raf=requestAnimationFrame(loop); const t=clock.getElapsedTime(); const s=st.current;
      smx+=(mx-smx)*.055; smy+=(my-smy)*.055;
      const openT=s.dragOver||s.dropped?1:0; s.openAmt+=(openT-s.openAmt)*(s.dropped?.04:.08);
      fr.rotation.x=-s.openAmt*0.55;
      const glowT=s.dragOver?.1:s.hovered?.04:0;
      mats.forEach(m=>{ m.emissiveIntensity+=(glowT-m.emissiveIntensity)*.1; m.emissive.set(s.dragOver?0x2244ff:0x111111); });
      const floatY=Math.sin(t)*.10, sc=s.pressed?.88:s.hovered?1.04:1;
      [bk,tb].forEach(m=>{ m.rotation.x=smy*.24+Math.sin(t*.55)*.018; m.rotation.y=-smx*.30+Math.sin(t*.42)*.022; m.scale.x+=(sc-m.scale.x)*.12; m.scale.y=m.scale.z=m.scale.x; });
      fr.rotation.y=-smx*.30+Math.sin(t*.42)*.022; fr.scale.x+=(sc-fr.scale.x)*.12; fr.scale.y=fr.scale.z=fr.scale.x;
      bk.position.y=floatY; tb.position.y=floatY; fr.position.y=-1.08+floatY;
      renderer.render(scene,camera);
    };
    loop();
    return ()=>cancelAnimationFrame(raf);
  }, 340, 280);

  return <div ref={ref} style={{width:340,height:280}}/>;
}

// ── NUMERIC: 3D extruded glowing numbers ──
function Calc3D({ hovered, pressed }) {
  const ref = useRef(null);
  const st  = useRef({ hovered:false, pressed:false });
  useEffect(()=>{ st.current.hovered=hovered; },[hovered]);
  useEffect(()=>{ st.current.pressed=pressed; },[pressed]);

  useEffect(() => {
    if (!ref.current) return;
    const W = 340, H = 280;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    ref.current.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, W/H, 0.1, 100);
    camera.position.set(0, 0, 7);

    // Diamond studio env — blinding from every angle
    const pmrem = new THREE.PMREMGenerator(renderer);
    const eS = new THREE.Scene();
    // 16 directions for maximum reflection coverage
    const el=[
      [0xffffff,40,-2,6,4],[0xffffff,30,2,5,3],[0xffffff,28,-6,2,2],
      [0xffffff,24,6,1,2],[0xffffff,36,0,5,-5],[0xffffff,30,-4,2,-4],
      [0xffffff,30,4,2,-4],[0xffffff,20,0,-4,2],[0xffffff,28,0,8,0],
      [0xffffff,24,-8,4,0],[0xffffff,24,8,4,0],[0xffffff,20,3,3,6],
      [0xffffff,20,-3,3,6],[0xffffff,18,0,-6,-2],[0xffffff,18,5,-2,3],
      [0xffffff,18,-5,-2,3],
    ];
    el.forEach(([col,i,x,y,z])=>{
      const l=new THREE.DirectionalLight(col,i); l.position.set(x,y,z); eS.add(l);
    });
    eS.add(new THREE.AmbientLight(0x888888,2.5));
    scene.environment = pmrem.fromScene(eS).texture;
    pmrem.dispose();

    // Mirror-finish liquid black — maximum sparkle
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x383840), metalness:1.0, roughness:0.0,
      clearcoat:1, clearcoatRoughness:0.0, reflectivity:1, ior:2.8,
      envMapIntensity:16.0,
      emissive: new THREE.Color(0x8899aa), emissiveIntensity:0.40,
    });

    // Segment dimensions — tall & narrow like a real digital display
    const SW  = 0.10;   // stroke thickness (slightly thicker)
    const SLV = 0.52;   // vertical segment length
    const SLH = 0.36;   // horizontal segment length (narrower than vertical → tall digits)
    const GAP = 0.025;
    const DPT = 0.20;   // extrude depth
    const BV  = 0.03;

    const rR = (x,y,w,h) => {
      const r = 0.035, s = new THREE.Shape();
      s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.absarc(x+w-r,y+r,r,-Math.PI/2,0,false);
      s.lineTo(x+w,y+h-r); s.absarc(x+w-r,y+h-r,r,0,Math.PI/2,false);
      s.lineTo(x+r,y+h); s.absarc(x+r,y+h-r,r,Math.PI/2,Math.PI,false);
      s.lineTo(x,y+r); s.absarc(x+r,y+r,r,Math.PI,3*Math.PI/2,false);
      return s;
    };
    const EX = s => new THREE.ExtrudeGeometry(s,{
      depth:DPT, bevelEnabled:true, bevelThickness:BV, bevelSize:BV,
      bevelSegments:6, curveSegments:16,
    });

    // Segment positions — centered on origin, tall aspect ratio
    const totH = SLV*2 + SW*3 + GAP*4;  // total digit height
    const totW = SLH + SW*2 + GAP*2;    // total digit width
    const oY   = -totH/2;
    const oX   = -totW/2;

    // [name]: [x, y, w, h]
    const SEGS = {
      top: [oX+SW+GAP,  oY+SLV*2+SW*2+GAP*3, SLH, SW],
      mid: [oX+SW+GAP,  oY+SLV  +SW  +GAP*2, SLH, SW],
      bot: [oX+SW+GAP,  oY                  , SLH, SW],
      tl:  [oX,          oY+SLV+SW*2+GAP*2,   SW,  SLV],
      bl:  [oX,          oY+SW+GAP,            SW,  SLV],
      tr:  [oX+SLH+SW+GAP*2, oY+SLV+SW*2+GAP*2, SW, SLV],
      br:  [oX+SLH+SW+GAP*2, oY+SW+GAP,          SW, SLV],
    };

    const SEG_DIGITS = {
      '0':['top','tl','tr','bl','br','bot'],
      '1':['tr','br'],
      '2':['top','tr','mid','bl','bot'],
      '3':['top','tr','mid','br','bot'],
      '4':['tl','tr','mid','br'],
      '5':['top','tl','mid','br','bot'],
      '6':['top','tl','mid','bl','br','bot'],
      '7':['top','tr','br'],
      '8':['top','tl','tr','mid','bl','br','bot'],
      '9':['top','tl','tr','mid','br','bot'],
    };

    const makeDigit = (d, ox) => {
      const grp = new THREE.Group();
      (SEG_DIGITS[d]||[]).forEach(name=>{
        const [x,y,w,h] = SEGS[name];
        const geo = EX(rR(x,y,w,h));
        geo.translate(0,0,-DPT/2);
        grp.add(new THREE.Mesh(geo, mat));
      });
      grp.position.x = ox;
      grp.userData.baseY = 0;
      return grp;
    };

    const DIGITS  = ['1','2','3','4','5'];
    const SPACING = totW + 0.20;
    const TOTAL   = (DIGITS.length-1)*SPACING;
    const groups  = [];
    DIGITS.forEach((d,i) => {
      const g = makeDigit(d, i*SPACING - TOTAL/2);
      scene.add(g); groups.push(g);
    });



    // Folder-matching scene lights
    [[0xffffff,8,-2.5,5,7],[0xffffff,5,0,8,1],[0xffffff,4,-8,2,1],
     [0xffffff,3,8,1,1],[0xffffff,9,0,1,-9],[0xffffff,6,-4,3,-7],[0xffffff,6,4,3,-7],
    ].forEach(([col,i,x,y,z])=>{ const l=new THREE.DirectionalLight(col,i); l.position.set(x,y,z); scene.add(l); });
    scene.add(new THREE.AmbientLight(0x0a0a0a,1));
    const glint=new THREE.PointLight(0xffffff,40,14);  glint.position.set(-2.8,3.2,5.5); scene.add(glint);
    const glint2=new THREE.PointLight(0xffffff,28,10); glint2.position.set(2.5,2.5,5); scene.add(glint2);
    const glint3=new THREE.PointLight(0xffffff,20,8);  glint3.position.set(0,-2,5); scene.add(glint3);
    const glint4=new THREE.PointLight(0xffffff,24,10); glint4.position.set(0,3,6); scene.add(glint4);
    // Spotlight: upper-left diagonal same as folder
    const spot2=new THREE.SpotLight(0xffffff,100,18,Math.PI*0.14,0.18,1.2);
    spot2.position.set(-4,6,4); spot2.target.position.set(0,0,0);
    scene.add(spot2); scene.add(spot2.target);
    // Second spotlight from right
    const spot3=new THREE.SpotLight(0xffffff,70,16,Math.PI*0.14,0.22,1.2);
    spot3.position.set(4,5,3); spot3.target.position.set(0,0,0);
    scene.add(spot3); scene.add(spot3.target);
    const rimL=new THREE.PointLight(0xffffff,30,12); rimL.position.set(-5,0,-4); scene.add(rimL);
    const rimR=new THREE.PointLight(0xffffff,30,12); rimR.position.set(5,0,-4); scene.add(rimR);
    const rimT=new THREE.PointLight(0xffffff,26,12); rimT.position.set(0,7,-3); scene.add(rimT);
    const rimB=new THREE.PointLight(0xffffff,18,10); rimB.position.set(0,-5,-3); scene.add(rimB);
    // Animated sparkle lights
    const spark1=new THREE.PointLight(0xffffff,28,6); scene.add(spark1);
    const spark2=new THREE.PointLight(0xffffff,24,5); scene.add(spark2);
    const spark3=new THREE.PointLight(0xffffff,20,5); scene.add(spark3);
    const spark4=new THREE.PointLight(0xffffff,18,4); scene.add(spark4);

    let mx=0,my=0,smx=0,smy=0;
    const cv=renderer.domElement;
    const onMv=e=>{ const r=ref.current?.getBoundingClientRect(); if(!r) return; mx=((e.clientX-r.left)/W-.5)*2; my=((e.clientY-r.top)/H-.5)*2; };
    cv.addEventListener("mousemove",onMv); cv.addEventListener("mouseleave",()=>{mx=0;my=0;});

    let raf; const clock=new THREE.Clock();
    const loop=()=>{
      raf=requestAnimationFrame(loop); const t=clock.getElapsedTime(); const s=st.current;
      smx+=(mx-smx)*.055; smy+=(my-smy)*.055;
      const sc=s.pressed?.88:s.hovered?1.05:1;
      const gt=s.hovered?0.58:0.40;
      mat.emissiveIntensity+=(gt-mat.emissiveIntensity)*.1;
      mat.emissive.set(0x8899aa);

      // Animate sparkle lights orbiting the digits
      spark1.position.set(Math.cos(t*2.1)*3.5,  Math.sin(t*1.7)*2.5,  Math.cos(t*1.3)*2+4);
      spark2.position.set(Math.cos(t*1.8+2)*3,   Math.sin(t*2.3+1)*2,   Math.sin(t*1.9)*2+4);
      spark3.position.set(Math.cos(t*3.2+4)*2.5,  Math.sin(t*1.4+3)*3,  Math.cos(t*2.8+2)*1.5+3);
      spark4.position.set(Math.cos(t*2.6+1)*2,    Math.sin(t*3.1+5)*1.5, Math.sin(t*2.4+3)*2+3);
      groups.forEach((g,i)=>{
        const fy=Math.sin(t+i*0.45)*.09;
        g.rotation.x=smy*.24+Math.sin(t*.55)*.016;
        g.rotation.y=-smx*.30+Math.sin(t*.42+i*.18)*.020;
        g.scale.x+=(sc-g.scale.x)*.12; g.scale.y=g.scale.z=g.scale.x;
        g.position.y=fy;
      });

      renderer.render(scene,camera);
    };
    loop();
    return ()=>{ cancelAnimationFrame(raf); renderer.dispose(); if(ref.current) ref.current.innerHTML=""; };
  },[]);

  return <div ref={ref} style={{width:340,height:280,cursor:"pointer"}}/>;
}


// ── Offscreen marble helper ──
function useWavePill(cvRef, W, H, drawBg) {
  const stRef = useRef({ hov:false, wave:0, mx:0.5 });
  const rafRef = useRef(null);
  useEffect(()=>{
    const cv = cvRef.current; if(!cv) return;
    cv.width=W*2; cv.height=H*2; cv.style.width=W+"px"; cv.style.height=H+"px";
    const ctx = cv.getContext("2d"); ctx.scale(2,2);
    const off = document.createElement("canvas");
    off.width=W; off.height=H;
    const octx = off.getContext("2d");
    let t = 0;
    const pill = (amp, mx) => {
      ctx.beginPath(); const r=H/2-1;
      ctx.moveTo(r,1);
      for(let x=r;x<=W-r;x+=2){const p=(x-r)/(W-2*r),d=Math.abs(p-mx);const la=amp*Math.exp(-d*d*8);ctx.lineTo(x,1+Math.sin(p*Math.PI*3-t*4)*la+Math.sin(p*Math.PI*5-t*6)*la*0.4);}
      ctx.arc(W-r,H/2,r,-Math.PI/2,Math.PI/2);
      for(let x=W-r;x>=r;x-=2){const p=(x-r)/(W-2*r),d=Math.abs(p-mx);const la=amp*Math.exp(-d*d*8);ctx.lineTo(x,H-1-Math.sin(p*Math.PI*3-t*4)*la-Math.sin(p*Math.PI*5-t*6)*la*0.4);}
      ctx.arc(r,H/2,r,Math.PI/2,-Math.PI/2); ctx.closePath();
    };
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw); t+=0.014;
      const s = stRef.current; s.wave+=((s.hov?5.5:0.4)-s.wave)*0.08;
      ctx.clearRect(0,0,W,H);
      drawBg(octx, W, H, t, s);
      pill(s.wave, s.mx); ctx.save(); ctx.clip();
      ctx.drawImage(off, 0, 0, W, H);
      const sh=ctx.createRadialGradient(W/2,2,0,W/2,2,W*0.6);
      sh.addColorStop(0,"rgba(255,255,255,.38)"); sh.addColorStop(1,"rgba(255,255,255,0)");
      ctx.fillStyle=sh; ctx.fillRect(0,0,W,H*0.5);
      const vig=ctx.createRadialGradient(W/2,H/2,H*0.05,W/2,H/2,W*0.68);
      vig.addColorStop(0,"rgba(0,0,0,0)"); vig.addColorStop(1,"rgba(0,0,0,.46)");
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
      ctx.restore();
      pill(s.wave, s.mx);
      ctx.strokeStyle=s.hov?"rgba(255,255,255,.62)":"rgba(255,255,255,.25)";
      ctx.lineWidth=1.2; ctx.stroke();
    };
    draw();
    return ()=>cancelAnimationFrame(rafRef.current);
  },[]);
  return stRef;
}

const marbleBW = (ctx,W,H,t,s) => {
  const img = ctx.createImageData(W,H); const d=img.data;
  const spd = s.hov?0.35:0.14;
  for(let py=0;py<H;py++) for(let px=0;px<W;px++){
    const nx=px*0.013,ny=py*0.019,tw=t*spd;
    const v=(Math.sin((nx*2.1+ny*1.3+tw)+Math.sin((nx*3.4-ny*1.8+tw*0.7))*1.4)*0.5
            +Math.sin((nx*1.2-ny*2.6-tw*0.5)+Math.sin((ny*4.1+nx*0.9-tw*0.3))*1.1)*0.35
            +Math.sin((nx+ny)*3.0+tw*0.8)*0.15);
    const b=Math.floor((Math.sin(v*Math.PI)+1)*0.5*255);
    const i=(py*W+px)*4; d[i]=b;d[i+1]=b;d[i+2]=b;d[i+3]=s.hov?215:175;
  }
  ctx.putImageData(img,0,0);
};

// ── Marble pill button ──
function GlossyButton({ children, onClick, hovered, onMouseEnter, onMouseLeave, onPointerDown: onPD, onPointerUp: onPU }) {
  const W=280, H=66;
  const cvRef = useRef(null);
  const btnRef = useRef(null);
  const [pressed, setPressed] = React.useState(false);
  const stRef = useWavePill(cvRef, W, H, marbleBW);

  const onME = () => { stRef.current.hov=true; onMouseEnter?.(); };
  const onML = () => { stRef.current.hov=false; setPressed(false); onMouseLeave?.(); };
  const onMM = e => { const r=btnRef.current?.getBoundingClientRect(); if(r) stRef.current.mx=(e.clientX-r.left)/r.width; };
  const onDown = () => { setPressed(true); onPD?.(); };
  const onUp   = () => { setPressed(false); onPU?.(); };

  return (
    <div ref={btnRef}
      onClick={onClick}
      onMouseEnter={onME} onMouseLeave={onML} onMouseMove={onMM}
      onPointerDown={onDown} onPointerUp={onUp}
      style={{
        position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center",
        width:W, height:H, cursor:"pointer", userSelect:"none",
        transform: pressed?"scale(.94)": hovered?"scale(1.06)":"scale(1)",
        transition:"transform .2s cubic-bezier(.34,1.56,.64,1)",
        filter: hovered
          ? "drop-shadow(0 0 28px rgba(255,255,255,.45)) drop-shadow(0 10px 40px rgba(255,255,255,.22))"
          : "drop-shadow(0 0 12px rgba(255,255,255,.18))",
      }}>
      <canvas ref={cvRef} style={{position:"absolute",inset:0,pointerEvents:"none",borderRadius:999}}/>
      <span style={{
        position:"relative", zIndex:1, pointerEvents:"none",
        fontFamily:"-apple-system,'SF Pro Display',sans-serif",
        fontSize:20, fontWeight:800, letterSpacing:".18em",
        color:"#fff",
        textShadow:"0 0 18px rgba(255,255,255,.95), 0 0 45px rgba(255,255,255,.6), 0 2px 10px rgba(0,0,0,.9)",
      }}>{children}</span>
    </div>
  );
}


// ── Client selection button — same marble wave pill as GlossyButton ──
function ClientGlossyButton({ co, onClick }) {
  const W = 640, H = 66;
  const cvRef = useRef(null);
  const btnRef = useRef(null);
  const [hov, setHov] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const stRef = useWavePill(cvRef, W, H, marbleBW);

  return (
    <div ref={btnRef}
      onClick={onClick}
      onMouseEnter={() => { stRef.current.hov = true; setHov(true); }}
      onMouseLeave={() => { stRef.current.hov = false; setHov(false); setPressed(false); }}
      onMouseMove={e => { const r = btnRef.current?.getBoundingClientRect(); if (r) stRef.current.mx = (e.clientX - r.left) / r.width; }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      style={{
        position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", height: H, cursor: "pointer", userSelect: "none",
        borderRadius: 999, overflow: "hidden",
        transform: pressed ? "scale(.97)" : hov ? "scale(1.02)" : "scale(1)",
        transition: "transform .2s cubic-bezier(.34,1.56,.64,1)",
        filter: hov
          ? "drop-shadow(0 0 28px rgba(255,255,255,.45)) drop-shadow(0 10px 40px rgba(255,255,255,.22))"
          : "drop-shadow(0 0 12px rgba(255,255,255,.18))",
      }}>
      <canvas ref={cvRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 999 }} />
      {/* Left: status dot + name */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 14, paddingLeft: 28, pointerEvents: "none" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: co.statusCol, boxShadow: `0 0 8px ${co.statusCol}` }} />
        <span style={{
          fontFamily: "-apple-system,'SF Pro Display',sans-serif",
          fontSize: 17, fontWeight: 800, letterSpacing: ".04em",
          color: "#fff",
          textShadow: "0 0 18px rgba(255,255,255,.95), 0 0 45px rgba(255,255,255,.6), 0 2px 10px rgba(0,0,0,.9)",
        }}>{co.name}</span>
      </div>
      {/* Right: industry + revenue */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 20, paddingRight: 28, pointerEvents: "none" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.65)", letterSpacing: ".04em", textShadow: "0 0 10px rgba(255,255,255,.4)" }}>{co.industry}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: ".04em", textShadow: "0 0 14px rgba(255,255,255,.8)" }}>{co.revenue}</span>
      </div>
    </div>
  );
}

// ── Pressable card with glow on press ──
function PressableCard({ children, onClick, fullWidth, accentColor }) {
  const [pressed, setPressed] = React.useState(false);
  const [hov, setHov] = React.useState(false);
  const glowColor = accentColor || "rgba(255,255,255,1)";
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      style={{
        cursor:"pointer", display:"block", textAlign:"left",
        gridColumn: fullWidth ? "1 / -1" : undefined,
        transform: pressed ? "scale(.96)" : hov ? "scale(1.02)" : "scale(1)",
        transition: "transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s ease, filter .18s ease",
        borderRadius: 16,
        filter: pressed
          ? `drop-shadow(0 0 18px ${glowColor}55) drop-shadow(0 0 40px ${glowColor}25)`
          : hov
          ? `drop-shadow(0 0 10px ${glowColor}25)`
          : "none",
      }}>
      <Card3 s={{
        padding:"20px 18px", position:"relative",
        border: accentColor ? `1px solid ${accentColor}${pressed ? "60" : hov ? "40" : "25"}` : pressed ? "1px solid rgba(255,255,255,.2)" : hov ? "1px solid rgba(255,255,255,.1)" : undefined,
        background: accentColor ? `${accentColor}${pressed ? "0f" : "06"}` : pressed ? "rgba(255,255,255,.04)" : undefined,
        boxShadow: pressed ? `inset 0 0 30px ${glowColor}08` : undefined,
        transition: "border-color .18s, background .18s",
      }}>
        {children}
      </Card3>
    </div>
  );
}


function SideNavGlossyButton({ children, icon, active, onClick }) {
  const W = 200, H = 44;
  const cvRef = useRef(null);
  const btnRef = useRef(null);
  const [hov, setHov] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const stRef = useWavePill(cvRef, W, H, marbleBW);

  return (
    <div ref={btnRef}
      onClick={onClick}
      onMouseEnter={() => { stRef.current.hov = true; setHov(true); }}
      onMouseLeave={() => { stRef.current.hov = false; setHov(false); setPressed(false); }}
      onMouseMove={e => { const r = btnRef.current?.getBoundingClientRect(); if (r) stRef.current.mx = (e.clientX - r.left) / r.width; }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 10,
        width: "calc(100% - 20px)", margin: "2px 10px",
        height: H, cursor: "pointer", userSelect: "none",
        borderRadius: 999, overflow: "hidden",
        opacity: active || hov ? 1 : 0.5,
        transform: pressed ? "scale(.96)" : hov || active ? "scale(1.02)" : "scale(1)",
        transition: "transform .2s cubic-bezier(.34,1.56,.64,1), opacity .2s",
        filter: active
          ? "drop-shadow(0 0 18px rgba(255,255,255,.35)) drop-shadow(0 6px 24px rgba(255,255,255,.15))"
          : hov ? "drop-shadow(0 0 12px rgba(255,255,255,.2))" : "none",
      }}>
      <canvas ref={cvRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 999, opacity: active ? 1 : hov ? 0.65 : 0.3 }} />
      <span style={{ position: "relative", zIndex: 1, paddingLeft: 12, color: "#fff", display: "flex", alignItems: "center", flexShrink: 0, filter: `drop-shadow(0 0 ${active ? 10 : 5}px rgba(255,255,255,${active ? .6 : .25}))` }}>{icon}</span>
      {children && (
        <span style={{
          position: "relative", zIndex: 1, pointerEvents: "none",
          fontFamily: "-apple-system,'SF Pro Display',sans-serif",
          fontSize: 12, fontWeight: active ? 800 : 600, letterSpacing: ".03em",
          color: "#fff",
          textShadow: active
            ? "0 0 14px rgba(255,255,255,.9), 0 0 30px rgba(255,255,255,.5), 0 2px 8px rgba(0,0,0,.8)"
            : "0 1px 4px rgba(0,0,0,.7)",
        }}>{children}</span>
      )}
    </div>
  );
}

function MarbleScreen({ mode, files }) {
  const label = mode==="upload"
    ? (files?.length ? `${files[0]} を審査します` : "書類審査を開始します")
    : "数値照合を開始します";

  const sub = mode==="upload"
    ? "AIがファイルを読み取り・解析しています"
    : "帳簿データの差異・不一致を自動で検出しています";

  return (
    <div style={{width:"100vw",height:"100vh",background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24}}>
      <style>{`
        @keyframes msIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
      `}</style>
      <MarblePill label={label}/>
      <div style={{
        fontFamily:"-apple-system,'SF Pro Text',sans-serif",
        fontSize:15,fontWeight:400,letterSpacing:".06em",
        color:"rgba(255,255,255,.55)",
        textShadow:"0 0 20px rgba(255,255,255,.5),0 0 50px rgba(255,255,255,.25)",
        animation:"msIn .9s cubic-bezier(.16,1,.3,1) .4s both, pulse 3s ease-in-out 1.5s infinite",
      }}>{sub}</div>
    </div>
  );
}

// Big marble pill display for screen center
function MarblePill({ label }) {
  const W=600, H=110;
  const cvRef = useRef(null);
  const stRef = useRef({ hov:false, wave:0.5, mx:0.5 });
  const rafRef = useRef(null);
  useEffect(()=>{
    const cv=cvRef.current; if(!cv) return;
    cv.width=W*2; cv.height=H*2; cv.style.width=W+"px"; cv.style.height=H+"px";
    const ctx=cv.getContext("2d"); ctx.scale(2,2);
    const off=document.createElement("canvas"); off.width=W; off.height=H;
    const octx=off.getContext("2d");
    let t=0;
    const pill=(amp,mx)=>{
      ctx.beginPath(); const r=H/2-2;
      ctx.moveTo(r,2);
      for(let x=r;x<=W-r;x+=2){const p=(x-r)/(W-2*r),d=Math.abs(p-mx);const la=amp*Math.exp(-d*d*6);ctx.lineTo(x,2+Math.sin(p*Math.PI*3-t*3)*la+Math.sin(p*Math.PI*5-t*5)*la*0.4);}
      ctx.arc(W-r,H/2,r,-Math.PI/2,Math.PI/2);
      for(let x=W-r;x>=r;x-=2){const p=(x-r)/(W-2*r),d=Math.abs(p-mx);const la=amp*Math.exp(-d*d*6);ctx.lineTo(x,H-2-Math.sin(p*Math.PI*3-t*3)*la-Math.sin(p*Math.PI*5-t*5)*la*0.4);}
      ctx.arc(r,H/2,r,Math.PI/2,-Math.PI/2); ctx.closePath();
    };
    const draw=()=>{
      rafRef.current=requestAnimationFrame(draw); t+=0.012;
      const s=stRef.current; s.wave+=((3.5)-s.wave)*0.04;
      ctx.clearRect(0,0,W,H);
      // marble to offscreen
      const img=octx.createImageData(W,H); const dd=img.data;
      for(let py=0;py<H;py++) for(let px=0;px<W;px++){
        const nx=px*0.013,ny=py*0.019,tw=t*0.2;
        const v=(Math.sin((nx*2.1+ny*1.3+tw)+Math.sin((nx*3.4-ny*1.8+tw*0.7))*1.4)*0.5
                +Math.sin((nx*1.2-ny*2.6-tw*0.5)+Math.sin((ny*4.1+nx*0.9-tw*0.3))*1.1)*0.35
                +Math.sin((nx+ny)*3.0+tw*0.8)*0.15);
        const b=Math.floor((Math.sin(v*Math.PI)+1)*0.5*255);
        const i=(py*W+px)*4; dd[i]=b;dd[i+1]=b;dd[i+2]=b;dd[i+3]=210;
      }
      octx.putImageData(img,0,0);
      pill(s.wave,s.mx); ctx.save(); ctx.clip();
      ctx.drawImage(off,0,0,W,H);
      const sh=ctx.createRadialGradient(W/2,2,0,W/2,2,W*0.5);
      sh.addColorStop(0,"rgba(255,255,255,.40)"); sh.addColorStop(1,"rgba(255,255,255,0)");
      ctx.fillStyle=sh; ctx.fillRect(0,0,W,H*0.5);
      const vig=ctx.createRadialGradient(W/2,H/2,H*0.05,W/2,H/2,W*0.55);
      vig.addColorStop(0,"rgba(0,0,0,0)"); vig.addColorStop(1,"rgba(0,0,0,.42)");
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
      ctx.restore();
      pill(s.wave,s.mx);
      ctx.strokeStyle="rgba(255,255,255,.55)"; ctx.lineWidth=1.5; ctx.stroke();
      // outer glow
      ctx.save();
      ctx.shadowColor="rgba(255,255,255,.30)"; ctx.shadowBlur=30;
      pill(s.wave,s.mx); ctx.strokeStyle="rgba(255,255,255,.01)"; ctx.lineWidth=1; ctx.stroke();
      ctx.restore();
    };
    draw();
    return()=>cancelAnimationFrame(rafRef.current);
  },[]);

  return (
    <div style={{
      position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center",
      width:W,height:H,
      animation:"msIn 1s cubic-bezier(.16,1,.3,1) both",
      filter:"drop-shadow(0 0 40px rgba(255,255,255,.35)) drop-shadow(0 16px 60px rgba(255,255,255,.20))",
    }}>
      <canvas ref={cvRef} style={{position:"absolute",inset:0,pointerEvents:"none",borderRadius:999}}/>
      <span style={{
        position:"relative",zIndex:1,
        fontFamily:"-apple-system,'SF Pro Display',sans-serif",
        fontSize:32,fontWeight:800,letterSpacing:".12em",
        color:"#fff",
        textShadow:"0 0 24px rgba(255,255,255,.99),0 0 60px rgba(255,255,255,.65),0 0 110px rgba(255,255,255,.35),0 3px 14px rgba(0,0,0,.9)",
      }}>{label}</span>
    </div>
  );
}



function FileBoxPage() {
  const [viewMode, setViewMode] = useState("grid");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [selected, setSelected] = useState(null);
  const [sortKey, setSortKey] = useState("date");
  const [uploadedFiles, setUploadedFiles, addUploadedFile] = useUploadedFiles();
  const [previewFile, setPreviewFile] = useState(null); // { name, url, isImage }
  const dropRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const isImageFile = (name) => /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(name);
  const isPdfFile  = (name) => /\.pdf$/i.test(name);

  /* ── ファイルアップロード処理 ── */
  const handleFiles = (fileList) => {
    Array.from(fileList).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const today = new Date().toLocaleDateString("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit" }).replace(/\//g, "/");
        addUploadedFile({
          id: Date.now() + Math.random(),
          name: file.name,
          cat: isImageFile(file.name) ? "レシート" : "請求書",
          partner: "—",
          amount: 0,
          date: today,
          ts: true,
          linked: false,
          journalId: null,
          nameOk: /^\d{8}_/.test(file.name),
          previewUrl: e.target.result,
          isImage: isImageFile(file.name),
          isPdf: isPdfFile(file.name),
          uploaded: true,
        });
      };
      reader.readAsDataURL(file);
    });
  };

  /* ── ドラッグ&ドロップ ── */
  const onDragOver = (e) => { e.preventDefault(); if (dropRef.current) dropRef.current.dataset.drag = "1"; };
  const onDragLeave = () => { if (dropRef.current) delete dropRef.current.dataset.drag; };
  const onDrop = (e) => { e.preventDefault(); if (dropRef.current) delete dropRef.current.dataset.drag; handleFiles(e.dataTransfer.files); };

  const files = [...uploadedFiles];

  const cats = ["all","請求書","レシート","明細","給与","契約書","納品書"];
  const catCounts = cats.map(c => c === "all" ? files.length : files.filter(f => f.cat === c).length);

  const filtered = files
    .filter(f => filterCat === "all" || f.cat === filterCat)
    .filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.partner.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => sortKey === "date" ? b.date.localeCompare(a.date) : sortKey === "amount" ? b.amount - a.amount : a.name.localeCompare(b.name));

  const fmt = n => "\u00A5" + n.toLocaleString();

  return (
    <PageShell title="ファイルボックス" watermark={"File\nBox"}>

      {/* ── ドラッグ&ドロップ アップロードゾーン ── */}
      <Rv><div
        ref={dropRef}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        onClick={() => inputRef.current && inputRef.current.click()}
        style={{ marginBottom:14, padding:"18px 24px", borderRadius:16, border:"1.5px dashed rgba(139,123,244,.2)", background:"rgba(139,123,244,.02)", display:"flex", alignItems:"center", gap:16, cursor:"pointer", transition:"all .2s" }}
      >
        <input ref={inputRef} type="file" multiple accept="image/*,.pdf" style={{ display:"none" }} onChange={e => { handleFiles(e.target.files); e.target.value=""; }} />
        <div style={{ width:40, height:40, borderRadius:12, background:"rgba(139,123,244,.08)", border:"1px solid rgba(139,123,244,.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A89BFF" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
        <div>
          <div style={{ fontSize:12, color:"#C4B8FF", fontWeight:600, marginBottom:2 }}>写真・PDFをアップロード</div>
          <div style={{ fontSize:10, color:"rgba(168,155,255,.4)" }}>クリックまたはドラッグ&ドロップ — jpg / png / pdf 対応</div>
        </div>
        {uploadedFiles.length > 0 && <div style={{ marginLeft:"auto", fontSize:10, color:"#7BE0A0", fontWeight:600 }}>+{uploadedFiles.length}件 追加済み</div>}
      </div></Rv>


      {/* Search + Filter + View toggle */}
      <Rv d={15}><Card3 s={{ padding:"14px 18px", marginBottom:14 }}>
        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
          <div style={{ flex:1, position:"relative" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMut} strokeWidth="2" style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ファイル名・取引先で検索…" style={{ width:"100%", padding:"9px 12px 9px 34px", border:"1px solid rgba(139,123,244,.12)", borderRadius:14, background:"rgba(139,123,244,.03)", color:"#E0DAFF", fontSize:12, fontFamily:bd, outline:"none", boxSizing:"border-box" }} />
          </div>
          <select value={sortKey} onChange={e=>setSortKey(e.target.value)} style={{ padding:"9px 12px", border:"1px solid rgba(139,123,244,.12)", borderRadius:14, background:"rgba(139,123,244,.03)", color:"#E0DAFF", fontSize:11, fontFamily:bd, outline:"none" }}>
            <option value="date" style={{ background:"#1a1a2e", color:"#E0DAFF" }}>日付順</option>
            <option value="amount" style={{ background:"#1a1a2e", color:"#E0DAFF" }}>金額順</option>
            <option value="name" style={{ background:"#1a1a2e", color:"#E0DAFF" }}>名前順</option>
          </select>
          <div style={{ display:"flex", gap:2, background:"rgba(139,123,244,.04)", borderRadius:10, padding:2 }}>
            {["grid","list"].map(m => (
              <Mag key={m} onClick={()=>setViewMode(m)} s={{ padding:"6px 10px", borderRadius:8, border:"none", cursor:"pointer", background:viewMode===m?"rgba(139,123,244,.12)":"transparent", color:viewMode===m?"#C4B8FF":"rgba(168,155,255,.3)", fontSize:11, fontFamily:bd, fontWeight:viewMode===m?700:500 }}>
                {m==="grid"?"▦":"☰"}
              </Mag>
            ))}
          </div>
        </div>
        {/* Category pills */}
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {cats.map((c,i) => (
            <Mag key={c} onClick={()=>setFilterCat(c)} s={{ padding:"5px 14px", borderRadius:20, border:filterCat===c?"1px solid rgba(139,123,244,.3)":"1px solid rgba(255,255,255,.05)", background:filterCat===c?"rgba(139,123,244,.1)":"transparent", color:filterCat===c?"#C4B8FF":"rgba(168,155,255,.35)", fontSize:10, fontWeight:filterCat===c?700:500, cursor:"pointer", fontFamily:bd }}>
              {c==="all"?"すべて":c} <span style={{ fontSize:9, opacity:.6 }}>{catCounts[i]}</span>
            </Mag>
          ))}
        </div>
      </Card3></Rv>

      {/* File Grid/List */}
      <Rv d={30}>
        {viewMode === "grid" ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:10 }}>
            {filtered.map(f => (
              <Card3 key={f.id} s={{ padding:0, overflow:"hidden", cursor:"pointer", border:selected===f.id?"1.5px solid rgba(139,123,244,.4)":"1.5px solid transparent", transition:"all .2s" }} onClick={()=>setSelected(selected===f.id?null:f.id)}>
                {/* サムネイル — 画像は実際に表示、PDFはアイコン */}
                <div style={{ height:90, background:"linear-gradient(135deg,rgba(139,123,244,.06),rgba(139,123,244,.02))", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
                  {f.isImage && f.previewUrl ? (
                    <img src={f.previewUrl} alt={f.name} style={{ width:"100%", height:"100%", objectFit:"cover", opacity:.9 }} />
                  ) : f.isImage ? (
                    /* 既存の.jpg/.pngはダミーグラデで写真っぽく表示 */
                    <div style={{ width:"100%", height:"100%", background:`linear-gradient(135deg, rgba(168,155,255,.15) 0%, rgba(100,80,200,.08) 100%)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(168,155,255,.35)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    </div>
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(168,155,255,.25)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                  )}
                  <div style={{ position:"absolute", top:6, right:6, display:"flex", gap:3 }}>
                    {f.ts && <span style={{ fontSize:7, color:"#A89BFF", padding:"2px 5px", borderRadius:4, background:"rgba(10,8,20,.7)", fontWeight:700 }}>TS</span>}
                    {f.linked && <span style={{ fontSize:7, color:"#7BE0A0", padding:"2px 5px", borderRadius:4, background:"rgba(10,8,20,.7)", fontWeight:700 }}>紐づけ済</span>}
                    {!f.nameOk && <span style={{ fontSize:7, color:"#E8B84B", padding:"2px 5px", borderRadius:4, background:"rgba(10,8,20,.7)", fontWeight:700 }}>名前⚠</span>}
                  </div>
                  <span style={{ position:"absolute", bottom:6, left:8, fontSize:8, color:"rgba(255,255,255,.6)", padding:"2px 6px", borderRadius:6, background:"rgba(0,0,0,.5)" }}>{f.cat}</span>
                  {/* 画像クリックで拡大プレビュー */}
                  {f.isImage && f.previewUrl && (
                    <div onClick={e=>{ e.stopPropagation(); setPreviewFile({ name:f.name, url:f.previewUrl }); }} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0)", display:"flex", alignItems:"center", justifyContent:"center", opacity:0, transition:"opacity .2s" }}
                      onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0"}>
                      <div style={{ background:"rgba(0,0,0,.6)", borderRadius:8, padding:"4px 10px", fontSize:10, color:"#fff" }}>拡大</div>
                    </div>
                  )}
                </div>
                <div style={{ padding:"10px 12px" }}>
                  <div style={{ fontSize:10, color:"#fff", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:4 }}>{f.name}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:10, color:C.textMut }}>{f.partner}</span>
                    <span style={{ fontSize:11, color:"#C4B8FF", fontFamily:mono, fontWeight:600 }}>{fmt(f.amount)}</span>
                  </div>
                  <div style={{ fontSize:9, color:C.textMut, marginTop:3 }}>{f.date}</div>
                </div>
              </Card3>
            ))}
          </div>
        ) : (
          <Card3 s={{ padding:0, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:bd }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                  {["ファイル名","種別","取引先","金額","日付","TS","紐づけ","命名"].map((h,i) => (
                    <th key={i} style={{ padding:"10px 8px", textAlign:i===3?"right":"left", fontSize:9, fontWeight:600, color:C.textMut, letterSpacing:".1em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id} onClick={()=>setSelected(selected===f.id?null:f.id)} style={{ borderBottom:`1px solid ${C.borderLt}`, cursor:"pointer", background:selected===f.id?`${C.blue}06`:"transparent" }}>
                    <td style={{ padding:"10px 8px", color:"#fff", fontWeight:500, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</td>
                    <td style={{ padding:"10px 8px" }}><span style={{ fontSize:9, padding:"2px 8px", borderRadius:8, background:"rgba(139,123,244,.06)", color:C.textSec }}>{f.cat}</span></td>
                    <td style={{ padding:"10px 8px", color:C.textSec }}>{f.partner}</td>
                    <td style={{ padding:"10px 8px", textAlign:"right", color:"#C4B8FF", fontFamily:mono }}>{fmt(f.amount)}</td>
                    <td style={{ padding:"10px 8px", color:C.textMut, fontFamily:mono, fontSize:11 }}>{f.date}</td>
                    <td style={{ padding:"10px 8px", textAlign:"center" }}>{f.ts ? <span style={{ color:"#7BE0A0" }}>✓</span> : <span style={{ color:"#E8B84B" }}>—</span>}</td>
                    <td style={{ padding:"10px 8px", textAlign:"center" }}>{f.linked ? <span style={{ color:"#7BE0A0" }}>✓</span> : <span style={{ color:"#E8B84B" }}>未</span>}</td>
                    <td style={{ padding:"10px 8px", textAlign:"center" }}>{f.nameOk ? <span style={{ color:"#7BE0A0" }}>✓</span> : <span style={{ color:"#E8B84B" }}>⚠</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card3>
        )}
      </Rv>

      {/* Detail panel */}
      {selected && (() => {
        const f = files.find(x=>x.id===selected);
        if (!f) return null;
        return (
          <Rv d={45}><Card3 s={{ padding:22, marginTop:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:14, color:"#fff", fontWeight:600, marginBottom:4 }}>{f.name}</div>
                <div style={{ fontSize:11, color:C.textMut }}>{f.cat} — {f.partner}</div>
              </div>
              <Mag onClick={()=>setSelected(null)} s={{ padding:"4px 8px", border:"none", background:"transparent", color:C.textMut, fontSize:16, cursor:"pointer" }}>×</Mag>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {[
                { l:"金額", v:fmt(f.amount) },
                { l:"日付", v:f.date },
                { l:"タイムスタンプ", v:f.ts?"✓ 付与済":"未付与", c:f.ts?"#7BE0A0":"#E8B84B" },
                { l:"仕訳紐づけ", v:f.linked?"✓ 仕訳No."+f.journalId:"未紐づけ", c:f.linked?"#7BE0A0":"#E8B84B" },
                { l:"命名規則", v:f.nameOk?"✓ 準拠":"⚠ 要整形", c:f.nameOk?"#7BE0A0":"#E8B84B" },
                { l:"電帳法", v:f.ts&&f.nameOk?"✓ 準拠":"⚠ 一部未対応", c:f.ts&&f.nameOk?"#7BE0A0":"#E8B84B" },
              ].map((d,i) => (
                <div key={i} style={{ padding:"10px 12px", borderRadius:12, background:"rgba(139,123,244,.03)", border:"1px solid rgba(139,123,244,.06)" }}>
                  <div style={{ fontSize:9, color:C.textMut, marginBottom:3 }}>{d.l}</div>
                  <div style={{ fontSize:12, color:d.c||"#fff", fontWeight:600 }}>{d.v}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:16 }}>
              {f.isImage && f.previewUrl && (
                <Mag onClick={()=>setPreviewFile({ name:f.name, url:f.previewUrl })} s={{ flex:1, padding:"10px", borderRadius:14, border:"1.5px solid rgba(139,123,244,.2)", background:"rgba(139,123,244,.06)", color:"#C4B8FF", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:bd, textAlign:"center" }}>画像を拡大</Mag>
              )}
              <Mag s={{ flex:1, padding:"10px", borderRadius:14, border:`1.5px solid ${C.border}`, background:"transparent", color:C.textSec, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:bd, textAlign:"center" }}>ダウンロード</Mag>
              {!f.nameOk && <Mag s={{ flex:1, padding:"10px", borderRadius:14, border:"1.5px solid rgba(139,123,244,.2)", background:"rgba(139,123,244,.06)", color:"#C4B8FF", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:bd, textAlign:"center" }}>名前を自動整形</Mag>}
            </div>
          </Card3></Rv>
        );
      })()}

      {/* ── 画像フルスクリーンプレビュー ── */}
      {previewFile && (
        <div onClick={()=>setPreviewFile(null)} style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.85)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", padding:40 }}>
          <div onClick={e=>e.stopPropagation()} style={{ maxWidth:"90vw", maxHeight:"88vh", position:"relative" }}>
            <img src={previewFile.url} alt={previewFile.name} style={{ maxWidth:"100%", maxHeight:"82vh", borderRadius:12, boxShadow:"0 40px 80px rgba(0,0,0,.6)", display:"block" }} />
            <div style={{ position:"absolute", top:-36, left:0, right:0, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"80%" }}>{previewFile.name}</div>
              <Mag onClick={()=>setPreviewFile(null)} s={{ padding:"4px 12px", border:"1px solid rgba(255,255,255,.15)", borderRadius:8, background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.6)", fontSize:12, cursor:"pointer", fontFamily:bd }}>✕ 閉じる</Mag>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

/* ════════════════════════════════ 書類発行 (DOC ISSUE) ════════════════════════════════ */

function InputPage() {
  const [active, setActive] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [pressing, setPressing] = useState(null);
  const [uploadDragOver, setUploadDragOver] = useState(false);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [cameraFlash, setCameraFlash] = useState(false);

  const tabs = [
    { id:"camera", label:"カメラ", icon: InputIconCamera },
    { id:"upload", label:"ファイル", icon: InputIconFolder },
    { id:"csv", label:"CSV", icon: InputIconTable },
  ];

  const handleSelect = (id) => {
    if (active === id) { setActive(null); return; }
    setActive(id);
    if (id === "camera") { setCameraFlash(true); setTimeout(() => setCameraFlash(false), 300); }
  };

  return (
    <PageShell title="アップロード" watermark={"Up\nload"}>
      {/* Tab circles */}
      <Rv><div style={{ display:"flex", justifyContent:"center", gap:36, marginBottom:20 }}>
        {tabs.map(t => {
          const isActive = active === t.id;
          const isHover = hovered === t.id;
          const isPress = pressing === t.id;
          const Icon = t.icon;
          return (
            <div key={t.id}
              onClick={() => handleSelect(t.id)}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => { setHovered(null); setPressing(null); }}
              onMouseDown={() => setPressing(t.id)}
              onMouseUp={() => setPressing(null)}
              style={{ textAlign:"center", cursor:"pointer" }}>
              <div style={{
                width:88, height:88, borderRadius:"50%", margin:"0 auto 12px",
                display:"flex", alignItems:"center", justifyContent:"center",
                background: isActive ? "radial-gradient(circle at 40% 35%, rgba(168,155,255,.18) 0%, rgba(139,123,244,.08) 100%)" : isHover ? "radial-gradient(circle at 50% 50%, rgba(255,255,255,.06) 0%, rgba(255,255,255,.02) 100%)" : "rgba(255,255,255,.03)",
                border: isActive ? "2px solid rgba(139,123,244,.45)" : isHover ? "2px solid rgba(255,255,255,.1)" : "2px solid rgba(255,255,255,.05)",
                color: isActive ? "#A89BFF" : isHover ? "#D0D0E0" : "#B0B0C8",
                boxShadow: isActive ? "0 0 36px rgba(139,123,244,.25), 0 0 72px rgba(139,123,244,.08), inset 0 0 24px rgba(139,123,244,.06)" : isHover ? "0 0 20px rgba(255,255,255,.06)" : "none",
                transition: isPress ? "transform .08s" : "all .4s cubic-bezier(.16,1,.3,1)",
                transform: isPress ? "scale(.9)" : isActive ? "scale(1.08)" : isHover ? "scale(1.04)" : "scale(1)",
              }}><Icon size={38} /></div>
              <div style={{ fontSize:13, fontWeight: isActive ? 700 : 500, color: isActive ? "#fff" : isHover ? "#E0E0F0" : "#B0B0C8", transition:"all .3s", textShadow: isActive ? "0 0 16px rgba(255,255,255,.2)" : "none" }}>{t.label}</div>
              <div style={{ width:5, height:5, borderRadius:"50%", margin:"8px auto 0", background: isActive ? "#A89BFF" : "transparent", boxShadow: isActive ? "0 0 10px rgba(168,155,255,.5)" : "none", transition:"all .3s" }} />
            </div>
          );
        })}
      </div></Rv>

      {/* Expanded content */}
      <div style={{ overflow:"hidden", maxHeight:active?500:0, opacity:active?1:0, transition:"all .45s cubic-bezier(.16,1,.3,1)" }}>

        {/* Camera */}
        {active === "camera" && (
          <Rv d={10}><Card3 s={{ padding:0, overflow:"hidden", marginBottom:20 }}>
            {cameraFlash && <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,.08)", zIndex:10, animation:"inputFlash .3s ease-out forwards", pointerEvents:"none" }} />}
            <div style={{ padding:"32px 32px 28px", textAlign:"center" }}>
              <div style={{ width:56, height:56, borderRadius:16, margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(139,123,244,.08)", border:"1px solid rgba(139,123,244,.15)", color:"#A89BFF" }}>
                <InputIconScan size={28} />
              </div>
              <div style={{ fontSize:18, color:"#fff", fontWeight:600, fontFamily:hd, marginBottom:6 }}>領収書をスキャン</div>
              <div style={{ fontSize:12, color:C.textMut, marginBottom:24, lineHeight:1.6 }}>カメラで撮影 → AIが自動で文字認識 → 仕訳候補を生成</div>
              <div style={{ position:"relative", borderRadius:18, overflow:"hidden", background:"linear-gradient(135deg, rgba(14,14,24,.9), rgba(20,18,40,.8))", border:"1px solid rgba(139,123,244,.1)", padding:"40px 24px", marginBottom:20 }}>
                <svg style={{ position:"absolute", top:12, left:12 }} width="24" height="24"><path d="M0 8V2a2 2 0 012-2h6" fill="none" stroke="rgba(168,155,255,.4)" strokeWidth="2"/></svg>
                <svg style={{ position:"absolute", top:12, right:12 }} width="24" height="24"><path d="M24 8V2a2 2 0 00-2-2h-6" fill="none" stroke="rgba(168,155,255,.4)" strokeWidth="2"/></svg>
                <svg style={{ position:"absolute", bottom:12, left:12 }} width="24" height="24"><path d="M0 16v6a2 2 0 002 2h6" fill="none" stroke="rgba(168,155,255,.4)" strokeWidth="2"/></svg>
                <svg style={{ position:"absolute", bottom:12, right:12 }} width="24" height="24"><path d="M24 16v6a2 2 0 01-2 2h-6" fill="none" stroke="rgba(168,155,255,.4)" strokeWidth="2"/></svg>
                <div style={{ position:"absolute", left:16, right:16, height:2, top:"50%", background:"linear-gradient(90deg, transparent, rgba(168,155,255,.5), transparent)", boxShadow:"0 0 12px rgba(168,155,255,.3)", animation:"inputScanLine 2.5s ease-in-out infinite" }} />
                <div style={{ color:C.textMut, fontSize:12 }}>レシートをこのエリアに合わせてください</div>
              </div>
              <BtnApprove s={{ padding:"14px 40px", borderRadius:16, border:"none", background:"rgba(139,123,244,.12)", color:"#C4B8FF", border:"1px solid rgba(139,123,244,.3)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:bd, boxShadow:"0 0 14px rgba(139,123,244,.3), 0 0 36px rgba(139,123,244,.1)" }}>撮影する</BtnApprove>
              <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:16 }}>
                {["レシート","請求書","領収書","名刺"].map((t,i) => (
                  <span key={i} style={{ fontSize:10, color:C.textMut, padding:"4px 10px", borderRadius:100, background:"rgba(139,123,244,.04)", border:"1px solid rgba(139,123,244,.06)" }}>{t}</span>
                ))}
              </div>
            </div>
          </Card3></Rv>
        )}

        {/* File Upload */}
        {active === "upload" && (
          <Rv d={10}><Card3 s={{ padding:"32px 32px 28px", marginBottom:20 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ width:56, height:56, borderRadius:16, margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(139,123,244,.08)", border:"1px solid rgba(139,123,244,.15)", color:"#A89BFF" }}>
                <InputIconUpArrow size={28} />
              </div>
              <div style={{ fontSize:18, color:"#fff", fontWeight:600, fontFamily:hd, marginBottom:6 }}>ファイルをアップロード</div>
              <div style={{ fontSize:12, color:C.textMut, marginBottom:24 }}>PDF・PNG・JPG — 複数同時もOK</div>
              <div onDragOver={(e) => { e.preventDefault(); setUploadDragOver(true); }} onDragLeave={() => setUploadDragOver(false)} onDrop={(e) => { e.preventDefault(); setUploadDragOver(false); }}
                style={{ border: uploadDragOver ? "2px solid rgba(139,123,244,.5)" : "2px dashed rgba(139,123,244,.15)", borderRadius:18, padding:"40px 24px", marginBottom:20, background: uploadDragOver ? "rgba(139,123,244,.06)" : "transparent", boxShadow: uploadDragOver ? "inset 0 0 32px rgba(139,123,244,.06)" : "none", transition:"all .25s cubic-bezier(.16,1,.3,1)", transform: uploadDragOver ? "scale(1.02)" : "scale(1)", cursor:"pointer" }}>
                <InputIconFolder size={32} color={uploadDragOver ? "#A89BFF" : "#6A6A84"} />
                <div style={{ fontSize:12, color: uploadDragOver ? C.textSec : C.textMut, marginTop:12, transition:"color .2s" }}>ここにファイルをドラッグ&ドロップ</div>
                <div style={{ fontSize:10, color:C.textMut, marginTop:6 }}>または</div>
                <Mag s={{ marginTop:12, padding:"10px 28px", borderRadius:14, border:`1.5px solid ${C.border}`, background:"transparent", color:C.textSec, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:bd }}>ファイルを選択</Mag>
                <div style={{ marginTop:14, padding:"8px 14px", borderRadius:10, background:"rgba(139,123,244,.04)", border:"1px solid rgba(139,123,244,.08)", display:"flex", alignItems:"center", gap:8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A89BFF" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <div>
                    <div style={{ fontSize:9, color:"#A89BFF", fontWeight:700 }}>電帳法対応 — 自動処理</div>
                    <div style={{ fontSize:8, color:C.textMut }}>タイムスタンプ自動付与 / ファイル名を「日付_取引先_金額_書類名」に自動整形 / 訂正削除履歴を保持</div>
                  </div>
                </div>
              </div>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:10, color:C.textMut, fontWeight:500, letterSpacing:".1em", textTransform:"uppercase", marginBottom:8, fontFamily:mono }}>最近のアップロード</div>
                {[{ name:"20260218_AWS_248000_請求書.pdf", date:"2/18", ok:true, ts:true },{ name:"invoice_yamada.png", date:"2/17", ok:true, ts:true, nameWarn:true }].map((f,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:12, background:"rgba(255,255,255,.02)", marginBottom:4 }}>
                    <InputIconFileText size={16} color={C.textMut} />
                    <span style={{ fontSize:11, color:C.text, flex:1 }}>{f.name}</span>
                    {f.ts && <span style={{ fontSize:7, color:"#A89BFF", padding:"1px 5px", borderRadius:6, background:"rgba(139,123,244,.06)", border:"1px solid rgba(139,123,244,.1)", fontWeight:700 }}>TS</span>}
                    {f.nameWarn && <span title="ファイル名要整形" style={{ fontSize:7, color:"#E8B84B", padding:"1px 5px", borderRadius:6, background:"rgba(232,184,75,.06)", border:"1px solid rgba(232,184,75,.1)", fontWeight:700 }}>名前</span>}
                    <span style={{ fontSize:9, color:C.textMut, fontFamily:mono }}>{f.date}</span>
                    <InputIconCheck size={14} color="#7BE0A0" />
                  </div>
                ))}
              </div>
            </div>
          </Card3></Rv>
        )}

        {/* CSV Import */}
        {active === "csv" && (
          <Rv d={10}><Card3 s={{ padding:"32px 32px 28px", marginBottom:20 }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ width:56, height:56, borderRadius:16, margin:"0 auto 16px", display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(139,123,244,.08)", border:"1px solid rgba(139,123,244,.15)", color:"#A89BFF" }}>
                <InputIconBolt size={28} />
              </div>
              <div style={{ fontSize:18, color:"#fff", fontWeight:600, fontFamily:hd, marginBottom:6 }}>CSVインポート</div>
              <div style={{ fontSize:12, color:C.textMut, marginBottom:24 }}>会計ソフトから一括取込 — 弥生・freee・MF対応</div>
              <div onDragOver={(e) => { e.preventDefault(); setCsvDragOver(true); }} onDragLeave={() => setCsvDragOver(false)} onDrop={(e) => { e.preventDefault(); setCsvDragOver(false); }}
                style={{ border: csvDragOver ? "2px solid rgba(139,123,244,.5)" : "2px dashed rgba(139,123,244,.15)", borderRadius:18, padding:"36px 24px", marginBottom:20, background: csvDragOver ? "rgba(139,123,244,.06)" : "transparent", boxShadow: csvDragOver ? "inset 0 0 32px rgba(139,123,244,.06)" : "none", transition:"all .25s cubic-bezier(.16,1,.3,1)", transform: csvDragOver ? "scale(1.02)" : "scale(1)", cursor:"pointer" }}>
                <InputIconTable size={32} color={csvDragOver ? "#A89BFF" : "#6A6A84"} />
                <div style={{ fontSize:12, color: csvDragOver ? C.textSec : C.textMut, marginTop:12, transition:"color .2s" }}>CSVファイルをドラッグ&ドロップ</div>
                <div style={{ fontSize:10, color:C.textMut, marginTop:6 }}>または</div>
                <Mag s={{ marginTop:12, padding:"10px 28px", borderRadius:14, border:`1.5px solid ${C.border}`, background:"transparent", color:C.textSec, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:bd }}>ファイルを選択</Mag>
              </div>
              <div style={{ display:"flex", justifyContent:"center", gap:10, marginBottom:16 }}>
                {["弥生会計","freee","MFクラウド","カスタム"].map((t,i) => (
                  <span key={i} style={{ fontSize:11, color:i===0?"#A89BFF":C.textMut, fontWeight:i===0?600:400, padding:"6px 14px", borderRadius:100, background:i===0?"rgba(139,123,244,.08)":"rgba(255,255,255,.02)", border:i===0?"1px solid rgba(139,123,244,.2)":"1px solid rgba(255,255,255,.04)", cursor:"pointer" }}>{t}</span>
                ))}
              </div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontSize:10, color:C.textMut }}>
                <InputIconCheck size={14} color="#7BE0A0" />
                <span>前回インポート: 2/15 — 142件取込済</span>
              </div>
            </div>
          </Card3></Rv>
        )}
      </div>

      <style>{`
        @keyframes inputScanLine { 0%,100%{top:20%;opacity:0} 10%{opacity:1} 50%{top:75%;opacity:1} 60%{opacity:0} }
        @keyframes inputFlash { 0%{opacity:1} 100%{opacity:0} }
      `}</style>
    </PageShell>
  );
}

/* ════════════════════════════════ SETTINGS PAGE ════════════════════════════════ */

export { FileBoxPage, InputPage, GlossyButton, ClientGlossyButton, MarbleScreen, SideNavGlossyButton, MarblePill, CyclingText, Folder3D, Calc3D };
