import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox,useTexture } from '@react-three/drei';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import optimerFont from 'three/examples/fonts/optimer_regular.typeface.json';
import * as THREE from 'three';
import PagePortal from './PagePortal';
import {makeFibreTexture} from './SurfaceDetail';

const W = 3.48, H = 4.64, HALF = W / 2;
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const FONT = new FontLoader().parse(optimerFont);

function texture(width, height, draw, color = true) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.anisotropy = 16;
  return map;
}
function randomSource(seed = 1636) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
function spaced(ctx, text, x, y, spacing = 8) {
  const widths = [...text].map(char => ctx.measureText(char).width);
  let left = x - (widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1)) / 2;
  ctx.textAlign = 'left';
  [...text].forEach((char, i) => { ctx.fillText(char, left, y); left += widths[i] + spacing; });
  ctx.textAlign = 'center';
}
function academicBook(ctx, x, y, label) {
  ctx.save(); ctx.translate(x, y); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -31); ctx.quadraticCurveTo(-26, -47, -63, -33);
  ctx.lineTo(-63, 35); ctx.quadraticCurveTo(-27, 22, 0, 39); ctx.quadraticCurveTo(27, 22, 63, 35);
  ctx.lineTo(63, -33); ctx.quadraticCurveTo(26, -47, 0, -31); ctx.lineTo(0, 39); ctx.stroke();
  ctx.font = 'bold 27px Georgia,serif'; ctx.fillText(label, 0, 6); ctx.restore();
}

function makeTextures() {
  const random = randomSource();
  // Typography and delicate tooling are rasterized at up to 4096px height.
  const foilScale = window.innerWidth < 760 ? 1 : 2;
  const foil = texture(1536 * foilScale, 2048 * foilScale, (ctx, w, h) => {
    ctx.scale(foilScale, foilScale); w = 1536; h = 2048;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeRect(83, 86, w - 166, h - 172);
    ctx.lineWidth = 1.2; ctx.strokeRect(103, 106, w - 206, h - 212); ctx.strokeRect(117, 120, w - 234, h - 240);
    [[148,153,1,1],[1388,153,-1,1],[148,1895,1,-1],[1388,1895,-1,-1]].forEach(([x,y,sx,sy]) => {
      ctx.save(); ctx.translate(x,y); ctx.scale(sx,sy); ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(0,115); ctx.bezierCurveTo(12,22,22,12,115,0);
      ctx.moveTo(0,75); ctx.bezierCurveTo(51,64,64,51,75,0); ctx.stroke();
      for(let i=0;i<4;i++){ctx.save();ctx.translate(20+i*15,49-i*9);ctx.rotate(-.72);ctx.beginPath();ctx.ellipse(0,0,6,15,0,0,6.284);ctx.stroke();ctx.restore();} ctx.restore();
    });
    ctx.font='23px Georgia,serif'; spaced(ctx,'UNIVERSITY',w/2,486,11);
    // Preserve the original academic crest. Its outer line is also real raised geometry.
    ctx.save(); ctx.translate(w/2,828); ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(-181,-128);ctx.lineTo(181,-128);ctx.lineTo(181,49);
    ctx.bezierCurveTo(170,155,74,222,0,258);ctx.bezierCurveTo(-74,222,-170,155,-181,49);ctx.closePath();ctx.stroke();
    academicBook(ctx,-91,-41,'VE');academicBook(ctx,91,-41,'RI');academicBook(ctx,0,111,'TAS');ctx.restore();
    ctx.font='21px Georgia,serif';spaced(ctx,'IN PURSUIT OF TRUTH',w/2,1442,6);
    ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(615,1582);ctx.lineTo(921,1582);ctx.stroke();
    ctx.font='45px Georgia,serif';spaced(ctx,'1636',w/2,1756,12);
    ctx.font='16px Georgia,serif';spaced(ctx,'CAMBRIDGE · MASSACHUSETTS',w/2,1810,4);
  });
  const page = texture(1536, 2048, (ctx,w,h) => {
    ctx.scale(1.5,1.5); w=1024;h=1365;
    ctx.fillStyle='#e8dfc8';ctx.fillRect(0,0,w,h);
    const shade=ctx.createLinearGradient(0,0,w,0);shade.addColorStop(0,'rgba(73,47,22,.28)');shade.addColorStop(.09,'rgba(73,47,22,0)');shade.addColorStop(.93,'rgba(73,47,22,0)');shade.addColorStop(1,'rgba(73,47,22,.10)');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
    for(let i=0;i<25000;i++){ctx.fillStyle=`rgba(92,65,34,${random()*.065})`;ctx.fillRect(random()*w,random()*h,.5+random()*1.6,.5+random());}
    ctx.fillStyle='#5c1b29';ctx.textAlign='center';ctx.font='17px Georgia,serif';spaced(ctx,'HARVARD UNIVERSITY',w/2,210,5);
    ctx.font='italic 65px Georgia,serif';ctx.fillText('Toda grande ideia',w/2,430);ctx.fillText('começa com',w/2,514);ctx.fillText('uma pergunta.',w/2,598);
    ctx.strokeStyle='#aa8a53';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(402,621);ctx.lineTo(622,621);ctx.stroke();
    ctx.fillStyle='#534839';ctx.font='27px Georgia,serif';['Desde 1636, abrindo caminhos','para o que ainda não sabemos.','','A próxima descoberta','pode começar com você.'].forEach((line,i)=>ctx.fillText(line,w/2,765+i*48));
    ctx.fillStyle='#74674f';ctx.font='17px Georgia,serif';ctx.fillText('Continue. Olhe através da palavra.',w/2,1235);
  });
  const endpaper=texture(1024,1365,(ctx,w,h)=>{
    ctx.fillStyle='#ded0af';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(104,76,41,.07)';ctx.lineWidth=.8;
    for(let y=-40;y<h+60;y+=31)for(let x=-40;x<w+60;x+=31){ctx.beginPath();ctx.moveTo(x,y-12);ctx.bezierCurveTo(x+25,y-8,x+20,y+5,x,y+12);ctx.bezierCurveTo(x-25,y+8,x-20,y-5,x,y-12);ctx.stroke();}
    ctx.strokeStyle='rgba(100,70,32,.42)';ctx.strokeRect(45,51,w-90,h-102);
    ctx.fillStyle='#702331';ctx.textAlign='center';ctx.font='24px Georgia,serif';spaced(ctx,'A CURIOSIDADE NOS MOVE',w/2,330,4);
    ctx.font='italic 80px Georgia,serif';ctx.fillText('Olhe além',w/2,625);ctx.fillText('destas páginas.',w/2,728);
    ctx.font='22px Georgia,serif';ctx.fillStyle='#6b5c45';ctx.fillText('Um novo mundo espera por você.',w/2,920);
  });
  const spineFoil=texture(512,2048,(ctx,w,h)=>{
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.save();ctx.translate(w/2,h/2);ctx.rotate(-Math.PI/2);ctx.font='64px Georgia,serif';spaced(ctx,'HARVARD',0,20,11);ctx.restore();ctx.font='43px Georgia,serif';ctx.fillText('1636',w/2,1720);
  });
  return {foil,page,endpaper,spineFoil};
}

function EmbossedTitles() {
  const geometry = useMemo(() => ['HARVARD','VERITAS'].map((word,i) => {
    const result = new TextGeometry(word,{font:FONT,size:i ? .285 : .215,depth:.0065,curveSegments:7,bevelEnabled:true,bevelThickness:.0015,bevelSize:.0011,bevelSegments:2});
    result.computeBoundingBox(); const box=result.boundingBox;result.translate(-(box.max.x+box.min.x)/2,0,0); return result;
  }),[]);
  useEffect(()=>()=>geometry.forEach(g=>g.dispose()),[geometry]);
  return <>{geometry.map((g,i)=><mesh key={i} geometry={g} position={[HALF,i ? -.79 : 1.35,.074]} castShadow receiveShadow><meshPhysicalMaterial color="#e5c47a" metalness={.86} roughness={.25} clearcoat={.035}/></mesh>)}</>;
}

function RaisedCrest() {
  const geometry=useMemo(()=>{
    const points=[]; const scale=(W-.085)/1536; const convert=(x,y)=>new THREE.Vector3(x*scale, -y*scale,0);
    const shape=new THREE.Shape(); shape.moveTo(-198,-145);shape.lineTo(198,-145);shape.lineTo(198,50);shape.bezierCurveTo(191,168,80,239,0,277);shape.bezierCurveTo(-80,239,-191,168,-198,50);shape.closePath();
    shape.getPoints(50).forEach(p=>points.push(convert(p.x,p.y)));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,false),100,.0025,4,false);
  },[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} position={[HALF,.435,.075]} castShadow><meshStandardMaterial color="#d6b778" metalness={.9} roughness={.34}/></mesh>;
}

function Stitching() {
  const ref=useRef();
  useEffect(()=>{
    const matrix=new THREE.Matrix4(); let count=0;
    for(const x of [-1.59,1.59])for(let y=-2.13;y<=2.13;y+=.071){matrix.makeTranslation(x+HALF,y,.074);ref.current.setMatrixAt(count++,matrix);}
    ref.current.count=count;ref.current.instanceMatrix.needsUpdate=true;
  },[]);
  return <instancedMesh ref={ref} args={[null,null,124]}><boxGeometry args={[.004,.024,.002]}/><meshStandardMaterial color="#a85b4b" roughness={.96}/></instancedMesh>;
}

function PageBlock() {
  const ref=useRef();
  useEffect(()=>{
    const matrix=new THREE.Matrix4(),color=new THREE.Color();
    for(let i=0;i<84;i++){
      const v=Math.sin(i*19.3)*.0065;
      matrix.makeTranslation(.016+v,v*.4,-.255+i*.00542);ref.current.setMatrixAt(i,matrix);
      color.set(i%9===0 ? '#b5a47c' : i%3===0 ? '#dfd4b6' : '#d0c2a1');ref.current.setColorAt(i,color);
    }
    ref.current.instanceMatrix.needsUpdate=true;ref.current.instanceColor.needsUpdate=true;
  },[]);
  return <instancedMesh ref={ref} args={[null,null,84]} castShadow receiveShadow><boxGeometry args={[3.287,4.385,.0048]}/><meshStandardMaterial roughness={.94} metalness={0}/></instancedMesh>;
}

function TurningLeaf({index,motion,progress,reducedMotion,page,endpaper,fibre}) {
  const ref=useRef();const damped=useRef(0);
  const backMap=useMemo(()=>{const map=endpaper.clone();map.wrapS=THREE.RepeatWrapping;map.repeat.x=-1;map.offset.x=1;map.needsUpdate=true;return map;},[endpaper]);
  const geometry=useMemo(()=>{
    const result=new THREE.PlaneGeometry(3.275,4.37,28,3);result.translate(3.275/2,0,0);return result;
  },[]);
  const base=useMemo(()=>new Float32Array(geometry.attributes.position.array),[geometry]);
  useEffect(()=>()=>{geometry.dispose();backMap.dispose();},[geometry,backMap]);
  useFrame((state,delta)=>{
    const p=clamp(motion?.progress??(typeof progress==='object'?progress.current:progress),0,1);
    const opening=smooth(.32+index*.026,.55+index*.027,p);
    damped.current=THREE.MathUtils.damp(damped.current,opening,reducedMotion?30:7,Math.min(delta,.08));
    const a=damped.current,angle=a*Math.PI;
    ref.current.rotation.y=-angle;
    const positions=geometry.attributes.position;
    const flutter=reducedMotion?0:Math.sin(state.clock.elapsedTime*1.2+index)*.008*a;
    for(let i=0;i<positions.count;i++){
      const x=base[i*3],y=base[i*3+1],u=x/3.275;
      positions.setXYZ(i,x,y+Math.sin(Math.PI*u)*Math.sin(y*.65)*.025*a,Math.sin(Math.PI*u)*Math.sin(angle)*(.19+index*.035)+Math.pow(u,2)*flutter);
    }
    positions.needsUpdate=true;geometry.computeVertexNormals();
  });
  return <group ref={ref} position={[-1.625,0,.212+index*.002]}>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial map={page} bumpMap={fibre} bumpScale={.002} color="#f2ead8" roughness={.91} metalness={0} side={THREE.FrontSide}/></mesh>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial map={backMap} bumpMap={fibre} bumpScale={.002} color="#eee3ca" roughness={.94} metalness={0} side={THREE.BackSide}/></mesh>
  </group>;
}

function Headbands() {
  return <>{[-1,1].map(side=><group key={side} position={[-1.575,side*2.181,-.022]}>
    <RoundedBox args={[.105,.058,.47]} radius={.025} smoothness={2}><meshStandardMaterial color="#a18352" roughness={.83}/></RoundedBox>
    {Array.from({length:10},(_,i)=><mesh key={i} position={[.001,side*.008,-.225+i*.049]}><boxGeometry args={[.108,.06,.015]}/><meshStandardMaterial color={i%2 ? '#d8bb78':'#5a1320'} roughness={.9}/></mesh>)}
  </group>)}</>;
}

function Ribbon({motion,reducedMotion}) {
  const geometry=useMemo(()=>{
    const p=[],indices=[],uv=[];
    for(let i=0;i<=30;i++){const t=i/30,x=.6+.10*Math.sin(t*3.9),y=-2.10-t*.91,z=-.10+.13*Math.sin(t*3.1)-t*.09;p.push(x-.073,y,z,x+.073,y-.015,z+.016);uv.push(0,t,1,t);if(i<30){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  },[]);
  const base=useMemo(()=>new Float32Array(geometry.attributes.position.array),[geometry]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(state=>{
    if(reducedMotion)return;const position=geometry.attributes.position;
    for(let i=0;i<position.count;i++){const t=Math.floor(i/2)/30;position.setZ(i,base[i*3+2]+Math.sin(state.clock.elapsedTime*1.25-t*4)*t*t*.023+(motion?.pointerX||0)*t*.012);}
    position.needsUpdate=true;geometry.computeVertexNormals();
  });
  return <mesh geometry={geometry} castShadow><meshPhysicalMaterial color="#8f5735" roughness={.61} metalness={.08} sheen={.74} sheenColor="#dba66b" side={THREE.DoubleSide}/></mesh>;
}

/** Local, deterministic PBR asset. Parent controls camera, composition and lighting. */
export default function VeritasBook({motion,progress=0,reducedMotion=false,portalAnchor,portalEnabled=false,portalType='yard',resting=false}) {
  const root=useRef(),hinge=useRef(),damped=useRef(0),inspection=useRef(0),pointer=useRef(new THREE.Vector2());
  const leather=useTexture(['/assets/book/leather-color-4k.jpg','/assets/book/leather-normal-2k.jpg','/assets/book/leather-roughness-2k.jpg']);
  const textures=useMemo(makeTextures,[]);
  const fibre=useMemo(makeFibreTexture,[]);useEffect(()=>()=>fibre.dispose(),[fibre]);
  const leatherMaps=useMemo(()=>leather.map((t,i)=>{const m=t.clone();m.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;m.anisotropy=16;m.needsUpdate=true;return m;}),[...leather]);
  useEffect(()=>()=>leatherMaps.forEach(t=>t.dispose()),[leatherMaps]);
  useEffect(()=>()=>Object.values(textures).forEach(map=>map.dispose()),[textures]);
  useFrame((state,delta)=>{
    if(!root.current||!hinge.current)return;
    const dt=Math.min(delta,.08),target=clamp(motion?.progress??(typeof progress==='object'?progress.current:progress),0,1);
    damped.current=THREE.MathUtils.damp(damped.current,target,reducedMotion?30:6.2,dt);
    inspection.current=THREE.MathUtils.damp(inspection.current,motion?.inspection?1:0,5,dt);
    pointer.current.x=THREE.MathUtils.damp(pointer.current.x,reducedMotion?0:(motion?.pointerX||0),5,dt);
    pointer.current.y=THREE.MathUtils.damp(pointer.current.y,reducedMotion?0:(motion?.pointerY||0),5,dt);
    const p=damped.current,opening=smooth(.23,.56,p)*(1-smooth(.78,1,p)),turn=smooth(.03,.23,p),end=smooth(.72,1,p),t=state.clock.elapsedTime;
    const travelling=(motion?.journey||0)>.62;
    root.current.position.y=(reducedMotion||travelling||resting?0:Math.sin(t*.58)*.038)+opening*.02;
    root.current.rotation.x=.10+turn*.11-opening*.17+pointer.current.y*(.035+inspection.current*.08);
    root.current.rotation.y=-.34+turn*.34+opening*.10-end*.36+pointer.current.x*(.065+inspection.current*.16);
    root.current.rotation.z=-.09+turn*.13-end*.055+(reducedMotion?0:Math.sin(t*.33)*.006);
    hinge.current.rotation.y=-opening*2.96;
  });
  const leatherMaterial={map:leatherMaps[0],normalMap:leatherMaps[1],normalScale:new THREE.Vector2(.22,.22),roughnessMap:leatherMaps[2],roughness:.83,metalness:0,clearcoat:.025,clearcoatRoughness:.9,color:'#9b1530'};
  const goldMaterial={color:'#dfbb72',metalness:.86,roughness:.28};
  return <group ref={root} rotation={[.10,-.34,-.09]}>
    <RoundedBox args={[W,H,.14]} radius={.052} smoothness={4} position={[0,0,-.355]} castShadow receiveShadow><meshPhysicalMaterial {...leatherMaterial}/></RoundedBox>
    <PageBlock/><Headbands/>
    <mesh position={[.018,0,.208]} receiveShadow><planeGeometry args={[3.28,4.37]}/><meshStandardMaterial map={textures.page} bumpMap={fibre} bumpScale={.0025} roughness={.95}/></mesh>
    {portalAnchor&&<PagePortal anchor={portalAnchor} motion={motion} enabled={portalEnabled} type={portalType}/>}
    {[0,1,2].map(index=><TurningLeaf key={index} index={index} motion={motion} progress={progress} reducedMotion={reducedMotion} page={textures.page} endpaper={textures.endpaper} fibre={fibre}/>)}
    <RoundedBox args={[.19,H-.01,.735]} radius={.067} smoothness={5} position={[-HALF+.035,0,-.016]} castShadow receiveShadow><meshPhysicalMaterial {...leatherMaterial}/></RoundedBox>
    {[-1.86,-1.35,1.35,1.86].map(y=><RoundedBox key={y} args={[.205,.071,.75]} radius={.029} smoothness={3} position={[-HALF+.025,y,-.016]} castShadow><meshPhysicalMaterial {...leatherMaterial} color="#bda16e" metalness={.68} roughness={.53}/></RoundedBox>)}
    <mesh position={[-HALF-.063,0,-.015]} rotation={[0,-Math.PI/2,0]}><planeGeometry args={[.57,4.36]}/><meshPhysicalMaterial {...goldMaterial} alphaMap={textures.spineFoil} transparent alphaTest={.07} depthWrite={false}/></mesh>
    <group ref={hinge} position={[-HALF,0,.29]}>
      <RoundedBox args={[W,H,.14]} radius={.052} smoothness={5} position={[HALF,0,0]} castShadow receiveShadow><meshPhysicalMaterial {...leatherMaterial}/></RoundedBox>
      {/* Shallow board channels and fine raised stitching catch actual light. */}
      <RoundedBox args={[.045,H-.17,.012]} radius={.009} smoothness={2} position={[.16,0,.072]}><meshStandardMaterial color="#25030b" roughness={.94}/></RoundedBox>
      <mesh position={[HALF,0,.071]}><planeGeometry args={[W-.085,H-.09]}/><meshPhysicalMaterial {...goldMaterial} alphaMap={textures.foil} transparent alphaTest={.08} bumpMap={textures.foil} bumpScale={.0025} depthWrite={false}/></mesh>
      <EmbossedTitles/><RaisedCrest/><Stitching/>
      <mesh position={[HALF,0,-.071]} rotation={[0,Math.PI,0]} receiveShadow><planeGeometry args={[W-.18,H-.18]}/><meshStandardMaterial map={textures.endpaper} bumpMap={fibre} bumpScale={.002} roughness={.96}/></mesh>
    </group>
    <Ribbon motion={motion} reducedMotion={reducedMotion}/>
  </group>;
}
