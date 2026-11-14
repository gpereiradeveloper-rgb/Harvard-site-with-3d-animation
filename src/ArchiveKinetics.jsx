import React,{useEffect,useMemo,useRef} from 'react';
import ArchiveRigidBatch from './ArchiveRigidBatch';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Add inside HarvardArchiveWorld's PlacedObjects:
 *   <ArchiveKinetics time={time} materials={assets.mats}/>
 *
 * time is the existing {current: seconds} ref (a number is also accepted).
 * This module never advances that clock, requests frames, or changes React state.
 * The parent freezes it for pause/reduced-motion. Optional reduced also freezes
 * the supplied time at the last sampled instant. All geometry is authored.
 */
const TAU=Math.PI*2;
const readTime=time=>Number.isFinite(typeof time==='number'?time:time?.current)?(typeof time==='number'?time:time.current):0;
const mod=n=>((n%1)+1)%1;
function makeAssets(){
 const resources=[],own=value=>(resources.push(value),value);
 const material=(color,roughness=.52,metalness=0)=>own(new THREE.MeshStandardMaterial({color,roughness,metalness}));
 const texture=(w,h,draw,color=false)=>{const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);const map=own(new THREE.CanvasTexture(canvas));map.anisotropy=8;if(color)map.colorSpace=THREE.SRGBColorSpace;return map;};
 const cloth=texture(256,256,(c,w,h)=>{c.fillStyle='#969696';c.fillRect(0,0,w,h);for(let i=0;i<w;i+=4){c.fillStyle=i%8?'#999':'#666';c.fillRect(i,0,1,h);c.fillRect(0,i,w,1);}for(let i=0;i<3600;i++){const x=(i*73)%256,y=(i*137)%256;c.fillStyle=i%2?'#adadad':'#858585';c.fillRect(x,y,1,1);}});cloth.wrapS=cloth.wrapT=THREE.RepeatWrapping;cloth.repeat.set(3,4);
 const pageEdges=texture(512,128,(c,w,h)=>{c.fillStyle='#eee7d4';c.fillRect(0,0,w,h);for(let y=1;y<h;y+=3){c.fillStyle=y%2?'#cfc6ae':'#ddd3bc';c.fillRect(0,y,w,1);}for(let i=0;i<450;i++){c.fillStyle='#bdb298';c.fillRect((i*43)%w,(i*71)%h,1,1);}},true);
 const bookPrint=texture(768,1024,(c,w,h)=>{c.fillStyle='black';c.fillRect(0,0,w,h);c.strokeStyle='white';c.fillStyle='white';c.lineWidth=3;c.strokeRect(40,38,w-80,h-76);c.lineWidth=1;c.strokeRect(51,49,w-102,h-98);for(const x of [64,w-64])for(const y of [64,h-64]){c.beginPath();c.moveTo(x-20,y);c.bezierCurveTo(x+27,y-26,x-27,y+26,x+20,y);c.stroke();}c.textAlign='center';c.font='bold 63px Georgia';c.fillText('HARVARD',w/2,235);c.font='17px Georgia';c.fillText('U N I V E R S I T Y',w/2,274);c.lineWidth=4;c.beginPath();c.moveTo(275,376);c.lineTo(493,376);c.lineTo(493,510);c.quadraticCurveTo(489,584,384,633);c.quadraticCurveTo(279,584,275,510);c.closePath();c.stroke();[[330,423,'VE'],[438,423,'RI'],[384,517,'TAS']].forEach(([x,y,t])=>{c.lineWidth=2;c.beginPath();c.moveTo(x-32,y-15);c.quadraticCurveTo(x-14,y-25,x,y-13);c.quadraticCurveTo(x+14,y-25,x+32,y-15);c.lineTo(x+32,y+23);c.quadraticCurveTo(x+14,y+13,x,y+25);c.quadraticCurveTo(x-14,y+13,x-32,y+23);c.closePath();c.stroke();c.font='bold 18px Georgia';c.fillText(t,x,y+7);});c.font='32px Georgia';c.fillText('THE LIVING ARCHIVE',w/2,738);c.font='13px Georgia';c.fillText('RESEARCH · IDEAS · DISCOVERY',w/2,780);c.font='25px Georgia';c.fillText('1636',w/2,904);});
 const dronePrint=texture(512,256,(c,w,h)=>{c.fillStyle='black';c.fillRect(0,0,w,h);c.fillStyle='white';c.textAlign='center';c.font='bold 58px Arial';c.fillText('VERITAS',w/2,117);c.font='23px Arial';c.fillText('ARCHIVE COURIER',w/2,167);c.fillRect(123,189,266,4);});
 const labelMap=texture(512,256,(c,w,h)=>{c.fillStyle='#e8ebe6';c.fillRect(0,0,w,h);c.fillStyle='#193a31';c.font='bold 52px Arial';c.fillText('VERITAS / 01',24,72);c.font='24px Arial';c.fillText('DOCUMENT TRANSFER',24,113);for(let x=24;x<310;x+=5){c.fillRect(x,143,x%3+1,66);}c.font='bold 33px Arial';c.fillText('HV',352,181);c.font='22px Arial';c.fillText('1636',349,214);},true);
 const shell=new THREE.Shape();shell.moveTo(-.18,-.22);shell.bezierCurveTo(-.32,-.18,-.32,.16,-.17,.23);shell.quadraticCurveTo(0,.29,.17,.23);shell.bezierCurveTo(.32,.16,.32,-.18,.18,-.22);shell.quadraticCurveTo(0,-.28,-.18,-.22);
 const blade=new THREE.Shape();blade.moveTo(-.026,-.02);blade.bezierCurveTo(-.22,-.065,-.27,-.015,-.245,.022);blade.quadraticCurveTo(-.13,.049,0,.018);blade.bezierCurveTo(.22,.065,.27,.015,.245,-.022);blade.quadraticCurveTo(.13,-.049,-.026,-.02);
 const portal=new THREE.Shape();portal.moveTo(-.43,.015);portal.lineTo(-.43,.53);portal.quadraticCurveTo(-.43,.72,-.25,.72);portal.lineTo(.25,.72);portal.quadraticCurveTo(.43,.72,.43,.53);portal.lineTo(.43,.015);portal.lineTo(.315,.015);portal.lineTo(.315,.52);portal.quadraticCurveTo(.315,.605,.235,.605);portal.lineTo(-.235,.605);portal.quadraticCurveTo(-.315,.605,-.315,.52);portal.lineTo(-.315,.015);portal.closePath();
 return{
  resources,box:own(new RoundedBoxGeometry(1,1,1,3,.045)),cylinder:own(new THREE.CylinderGeometry(1,1,1,32)),sphere:own(new THREE.SphereGeometry(1,32,20)),ring:own(new THREE.TorusGeometry(1,.035,10,64)),plane:own(new THREE.PlaneGeometry(1,1)),
  bookCover:own(new RoundedBoxGeometry(.40,.025,.53,4,.008)),pages:own(new RoundedBoxGeometry(.354,.083,.485,3,.004)),
  shell:own(new THREE.ExtrudeGeometry(shell,{depth:.085,bevelEnabled:true,bevelSize:.024,bevelThickness:.025,bevelSegments:4,steps:1,curveSegments:20})),
  blade:own(new THREE.ExtrudeGeometry(blade,{depth:.007,bevelEnabled:true,bevelSize:.002,bevelThickness:.003,bevelSegments:2,steps:1,curveSegments:12})),
  portal:own(new THREE.ExtrudeGeometry(portal,{depth:.77,bevelEnabled:true,bevelSize:.011,bevelThickness:.011,bevelSegments:3,curveSegments:18})).translate(0,0,-.385),
  portalRib:own(new THREE.ExtrudeGeometry(portal,{depth:.018,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,curveSegments:18})).translate(0,0,-.009),
  mats:{ink:material('#223632',.33,.15),ivory:material('#e5dfcf',.64),gold:material('#b99555',.24,.82),wood:material('#a77d57',.46),walnut:material('#664932',.44),paper:material('#f3e8d1',.91),dark:material('#25302a',.88),wine:material('#713b42',.56),green:material('#466652',.56),glass:own(new THREE.MeshPhysicalMaterial({color:'#9bbab2',roughness:.09,metalness:.14,clearcoat:1,clearcoatRoughness:.07}))},
  steel:material('#c2cbd0',.25,.83),rubber:material('#18201f',.84,.02),carbon:material('#182b2a',.36,.38),copper:material('#b87737',.30,.74),
  chassis:own(new THREE.MeshPhysicalMaterial({color:'#163b32',roughness:.27,metalness:.32,clearcoat:.85,clearcoatRoughness:.19})),
  ceramic:own(new THREE.MeshPhysicalMaterial({color:'#f0f1e9',roughness:.26,metalness:.08,clearcoat:.72,clearcoatRoughness:.17})),
  bookCloth:own(new THREE.MeshPhysicalMaterial({color:'#193d37',bumpMap:cloth,bumpScale:.0028,roughnessMap:cloth,roughness:.72,metalness:.02,sheen:.25,sheenColor:'#577f67'})),
  bookFoil:own(new THREE.MeshStandardMaterial({color:'#d1ad60',alphaMap:bookPrint,metalness:.85,roughness:.29,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1})),
  droneLabel:own(new THREE.MeshStandardMaterial({color:'#e0c17c',alphaMap:dronePrint,metalness:.5,roughness:.36,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1})),
  machineLabel:own(new THREE.MeshStandardMaterial({map:labelMap,roughness:.48,metalness:.18})),pageMaterial:own(new THREE.MeshStandardMaterial({map:pageEdges,color:'#fffaf0',roughness:.94})),
  orange:own(new THREE.MeshStandardMaterial({color:'#fb861e',metalness:.3,roughness:.29,emissive:'#f87613',emissiveIntensity:.52})),light:own(new THREE.MeshStandardMaterial({color:'#ffcf73',emissive:'#ff8b21',emissiveIntensity:2.8,roughness:.2})),status:own(new THREE.MeshStandardMaterial({color:'#91f3c4',emissive:'#42d994',emissiveIntensity:.8,roughness:.3})),
 };
}
function Box({a,m,p=[0,0,0],s=[1,1,1],r=[0,0,0]}){
 return <mesh geometry={a.box} material={m} position={p} scale={s} rotation={r} castShadow receiveShadow/>;
}
function Cylinder({a,m,p=[0,0,0],radius=.04,height=.3,r=[0,0,0]}){
 return <mesh geometry={a.cylinder} material={m} position={p} scale={[radius,height,radius]} rotation={r} castShadow receiveShadow/>;
}
function Ring({a,m,p=[0,0,0],radius=.3,r=[0,0,0]}){
 return <mesh geometry={a.ring} material={m} position={p} scale={radius} rotation={r} castShadow/>;
}
function Book({a,m,p=[0,0,0],r=[0,0,0],scale=1}){
 return <group position={p} rotation={r} scale={scale}>
  {[-.052,.052].map(y=><mesh key={y} geometry={a.bookCover} material={a.bookCloth} position={[0,y,0]} castShadow receiveShadow/>)}
  <mesh geometry={a.pages} material={a.pageMaterial} position={[.012,0,0]} castShadow receiveShadow/>
  <Box a={a} m={a.bookCloth} p={[-.19,0,0]} s={[.035,.112,.53]}/>
  {[-.19,-.11,.11,.19].map(z=><Box key={z} a={a} m={m.gold} p={[-.209,0,z]} s={[.012,.112,.009]}/>)}
  <mesh geometry={a.plane} material={a.bookFoil} position={[0,.0657,0]} rotation={[-Math.PI/2,0,0]} scale={[.375,.505,1]}/>
  <Box a={a} m={m.gold} p={[.158,-.003,.247]} s={[.026,.004,.022]}/>
 </group>;
}

export const ARCHIVE_TRANSFER_CYCLE=40;
export const ARCHIVE_TRANSFER_STATIONS=Object.freeze({
 source:[-5.60,.63-Math.sin(.15)*1.30+Math.cos(.15)*.10,2.80],
 catalogue:[3.50,1.235,-.73],
 archive:[3.10,3.22,-3.44],
});
const PICKUP_HOVER=[-5.60,4.85,2.80],TABLE_HOVER=[3.50,3.50,-.73],ARCHIVE_HOVER=[3.10,4.85,-3.44],SECOND_HOME=[5.03,4.43,-2.0];
const ease=n=>{const f=Math.min(1,Math.max(0,n));return f*f*(3-2*f);};
const between=(p,a,b)=>ease((p-a)/(b-a));
const mix=(a,b,t)=>a+(b-a)*t;
const flight=(a,c,b,t)=>a.map((value,i)=>(1-t)*(1-t)*value+2*(1-t)*t*c[i]+t*t*b[i]);

/** Deterministic task choreography; all transfer boundaries are stationary. */
export function archiveTransferState(seconds,index=0){
 const phase=mod(seconds/ARCHIVE_TRANSFER_CYCLE)*ARCHIVE_TRANSFER_CYCLE;
 let position=(index?SECOND_HOME:PICKUP_HOVER).slice(),cable=.40,load=false,task='aguardar',tilt=0;
 if(index===0){
  const pickupLength=PICKUP_HOVER[1]-ARCHIVE_TRANSFER_STATIONS.source[1],dropLength=TABLE_HOVER[1]-ARCHIVE_TRANSFER_STATIONS.catalogue[1];
  if(phase>=3&&phase<5){cable=mix(.40,pickupLength,between(phase,3,5));task='baixar-guincho-coleta';}
  else if(phase>=5&&phase<7){cable=mix(pickupLength,.40,between(phase,5,7));load=true;task='recolher-livro';tilt=.15*(1-between(phase,5,7));}
  else if(phase>=7&&phase<12){position=flight(PICKUP_HOVER,[-1.0,5.35,1.8],TABLE_HOVER,between(phase,7,12));load=true;task='transportar-para-mesa';}
  else if(phase>=12&&phase<14){position=TABLE_HOVER.slice();cable=mix(.40,dropLength,between(phase,12,14));load=true;task='baixar-livro-na-bandeja';}
  else if(phase>=14&&phase<16){position=TABLE_HOVER.slice();cable=mix(dropLength,.40,between(phase,14,16));task='recolher-guincho-vazio';}
  else if(phase>=16&&phase<23){position=flight(TABLE_HOVER,[-.7,5.45,3.3],PICKUP_HOVER,between(phase,16,23));task='retornar-vazio';}
 }else{
  const pickupLength=TABLE_HOVER[1]-ARCHIVE_TRANSFER_STATIONS.catalogue[1],dropLength=ARCHIVE_HOVER[1]-ARCHIVE_TRANSFER_STATIONS.archive[1];
  if(phase>=16&&phase<18){position=flight(SECOND_HOME,[5.1,4.7,-.4],TABLE_HOVER,between(phase,16,18));task='ir-para-mesa';}
  else if(phase>=18&&phase<20){position=TABLE_HOVER.slice();cable=mix(.40,pickupLength,between(phase,18,20));task='baixar-guincho-coleta';}
  else if(phase>=20&&phase<22){position=TABLE_HOVER.slice();cable=mix(pickupLength,.40,between(phase,20,22));load=true;task='recolher-livro-processado';}
  else if(phase>=22&&phase<26){position=flight(TABLE_HOVER,[4.8,5.25,-2.0],ARCHIVE_HOVER,between(phase,22,26));load=true;task='transportar-para-arquivo';}
  else if(phase>=26&&phase<28){position=ARCHIVE_HOVER.slice();cable=mix(.40,dropLength,between(phase,26,28));load=true;task='baixar-livro-na-gaveta';}
  else if(phase>=28&&phase<30){position=ARCHIVE_HOVER.slice();cable=mix(dropLength,.40,between(phase,28,30));task='recolher-guincho-vazio';}
  else if(phase>=30&&phase<34){position=flight(ARCHIVE_HOVER,[4.9,5.20,-3.2],SECOND_HOME,between(phase,30,34));task='retornar-vazio';}
 }
 return{phase,position,cable,load,task,tilt};
}

function DeliveryDrone({a,m,time,index=0}){
 const body=useRef(),propellers=useRef([]),cargo=useRef(),load=useRef(),wire=useRef(),{gl}=useThree();
 useFrame(()=>{
  const t=time.current,state=archiveTransferState(t,index),key='worldDrone'+(index+1);
  body.current.position.set(...state.position);cargo.current.position.y=-state.cable;cargo.current.rotation.x=state.tilt;
  load.current.visible=state.load;wire.current.position.y=-state.cable/2;wire.current.scale.y=state.cable;
  propellers.current.forEach((rotor,i)=>{if(rotor)rotor.rotation.y=t*(i%2?-18:18);});
  gl.domElement.dataset[key+'X']=state.position[0].toFixed(4);gl.domElement.dataset[key+'Z']=state.position[2].toFixed(4);
  gl.domElement.dataset[key+'Task']=state.task;gl.domElement.dataset[key+'Load']=String(state.load);gl.domElement.dataset[key+'Phase']=state.phase.toFixed(3);
  if(index===0){gl.domElement.dataset.worldDroneX=state.position[0].toFixed(4);gl.domElement.dataset.worldDroneZ=state.position[2].toFixed(4);}
 });
 return <group ref={body}><ArchiveRigidBatch dynamicRefs={[propellers,cargo,wire]}>
  {/* Sculpted two-piece fuselage: the seam, vents and fasteners are geometry. */}
  <mesh geometry={a.shell} material={index?a.chassis:a.ceramic} position={[0,.095,0]} rotation={[Math.PI/2,0,0]} castShadow receiveShadow/>
  <mesh geometry={a.shell} material={a.carbon} position={[0,.002,0]} rotation={[Math.PI/2,0,0]} scale={[.985,.985,.23]} castShadow receiveShadow/>
  <Box a={a} m={a.chassis} p={[0,.115,-.025]} s={[.31,.040,.22]}/>
  <mesh geometry={a.plane} material={a.droneLabel} position={[0,.137,-.026]} rotation={[-Math.PI/2,0,0]} scale={[.27,.135,1]}/>
  {[-1,1].map(side=><group key={'vents'+side}>
   {[0,1,2,3,4].map(i=><Box key={i} a={a} m={a.rubber} p={[side*.229,.049,-.09+i*.037]} s={[.016,.018,.019]}/>)}
   {[-.17,.17].map(z=><Cylinder key={z} a={a} m={a.steel} p={[side*.16,.106,z]} radius={.008} height={.012}/>)}
   <mesh geometry={a.sphere} material={a.status} position={[side*.135,.035,-.25]} scale={[.022,.016,.009]}/>
  </group>)}
  <Cylinder a={a} m={a.steel} p={[0,-.095,.205]} radius={.026} height={.10}/>
  <mesh geometry={a.sphere} material={a.carbon} position={[0,-.153,.216]} scale={[.078,.065,.065]} castShadow/>
  <Cylinder a={a} m={a.steel} p={[0,-.151,.273]} radius={.044} height={.025} r={[Math.PI/2,0,0]}/>
  <mesh geometry={a.sphere} material={m.glass} position={[0,-.151,.291]} scale={[.032,.032,.012]}/>
  {[-1,1].map(x=>[-1,1].map(z=>{
   const rotorIndex=(x+1)+(z===1?1:0);
   return <group key={x+':'+z}>
    <Box a={a} m={a.chassis} p={[x*.28,.008,z*.28]} s={[.082,.068,.57]} r={[0,x*z*Math.PI/4,0]}/>
    <Box a={a} m={a.steel} p={[x*.28,.044,z*.28]} s={[.023,.009,.51]} r={[0,x*z*Math.PI/4,0]}/>
    <Cylinder a={a} m={a.carbon} p={[x*.47,.034,z*.47]} radius={.073} height={.105}/>
    <Cylinder a={a} m={a.copper} p={[x*.47,.050,z*.47]} radius={.062} height={.055}/>
    {[0,1,2,3,4,5].map(i=><Box key={i} a={a} m={a.carbon} p={[x*.47+Math.cos(i*TAU/6)*.061,.051,z*.47+Math.sin(i*TAU/6)*.061]} s={[.013,.054,.013]}/>)}
    <group position={[x*.47,.115,z*.47]}>
     <group ref={el=>{propellers.current[rotorIndex]=el;}}>
      <mesh geometry={a.blade} material={a.carbon} rotation={[Math.PI/2,0,0]} castShadow/>
     </group>
     <Cylinder a={a} m={a.steel} p={[0,.012,0]} radius={.026} height={.037}/>
    </group>
    <Ring a={a} m={a.chassis} p={[x*.47,.108,z*.47]} radius={.281} r={[Math.PI/2,0,0]}/>
    {[0,1,2].map(i=><Box key={i} a={a} m={a.chassis} p={[x*.47+Math.cos(i*TAU/3)*.177,.080,z*.47+Math.sin(i*TAU/3)*.177]} s={[.215,.015,.018]} r={[0,-i*TAU/3,0]}/>)}
   </group>;
  }))}
  {[-1,1].map(x=><group key={x}>
   {[-.135,.135].map(z=><Cylinder key={z} a={a} m={a.steel} p={[x*.19,-.155,z]} radius={.013} height={.20} r={[0,0,x*.12]}/>)}
   <Box a={a} m={a.carbon} p={[x*.20,-.255,0]} s={[.054,.031,.46]}/>
  </group>)}
  <Cylinder a={a} m={a.carbon} p={[0,-.10,-.015]} radius={.075} height={.11}/>
  <Cylinder a={a} m={a.copper} p={[0,-.14,-.015]} radius={.052} height={.027}/>
  <mesh ref={wire} geometry={a.cylinder} material={a.steel} position={[0,-.2,0]} scale={[.006,.4,.006]}/>
  <group ref={cargo} position={[0,-.40,0]}>
   <group ref={load} visible={false}><Book a={a} m={m} scale={.83}/></group>
   <Box a={a} m={a.carbon} p={[0,.078,0]} s={[.027,.016,.44]}/>
   {[-1,1].map(side=><group key={side}>
    <Box a={a} m={a.steel} p={[side*.17,.035,0]} s={[.018,.095,.05]}/>
    <Box a={a} m={a.rubber} p={[side*.164,.012,0]} s={[.010,.034,.045]}/>
   </group>)}
  </group>
 </ArchiveRigidBatch></group>;
}

function AmberConveyorTunnel({a,m}){
 return <group position={[0,.065,-1.25]} name="ribbed-steel-amber-book-tunnel">
  <mesh geometry={a.portal} material={a.steel} castShadow receiveShadow/>
  {Array.from({length:31},(_,i)=><mesh key={i} geometry={a.portalRib} material={i%2?a.steel:m.ink} position={[0,0,-.375+i*.025]} castShadow receiveShadow/>)}
  <Box a={a} m={a.carbon} p={[0,.31,-.374]} s={[.625,.59,.018]}/>
  {[-1,1].map(side=><group key={side}>
   <Box a={a} m={a.orange} p={[side*.313,.31,-.015]} s={[.015,.59,.69]}/>
   <Box a={a} m={a.light} p={[side*.304,.31,.352]} s={[.008,.58,.009]}/>
   {Array.from({length:18},(_,i)=><Box key={i} a={a} m={a.copper} p={[side*.301,.31,-.34+i*.038]} s={[.008,.56,.006]}/>)}
  </group>)}
  <Box a={a} m={a.orange} p={[0,.601,-.015]} s={[.62,.018,.69]}/>
  <Box a={a} m={a.light} p={[0,.591,.354]} s={[.595,.009,.009]}/>
  <Box a={a} m={a.orange} p={[0,.010,0]} s={[.62,.012,.72]}/>
  <pointLight position={[0,.32,.12]} color="#ff940f" intensity={1.1} distance={2.1} decay={2}/>
  <pointLight position={[0,.28,.54]} color="#ffb14d" intensity={.45} distance={1.6} decay={2}/>
 </group>;
}

function DocumentConveyor({a,m,time}){
 const slats=useRef(),books=useRef([]),rollers=useRef([]),{gl}=useThree();
 const dummy=useMemo(()=>new THREE.Object3D(),[]);
 const count=24;
 useFrame(()=>{
  const t=time.current,p=mod(t/ARCHIVE_TRANSFER_CYCLE)*ARCHIVE_TRANSFER_CYCLE;
  for(let i=0;i<count;i++){
   const f=mod(i/count+t*.21);
   dummy.position.set(0,.035,-1.53+f*3.06);dummy.scale.set(.43,.033,.092);dummy.rotation.set(0,0,0);dummy.updateMatrix();slats.current.setMatrixAt(i,dummy.matrix);
  }
  slats.current.instanceMatrix.needsUpdate=true;
  books.current.forEach((book,i)=>{
   if(!book)return;
   if(i===0){book.visible=p<5||p>=31;book.position.set(0,.10,p>=31&&p<37?mix(-1.64,1.30,between(p,31,37)):1.30);book.rotation.y=0;}
   else{book.position.set(0,.18+i*.10,-1.73);book.rotation.y=0;}
  });
  rollers.current.forEach(roller=>{if(roller)roller.rotation.x=t*2.8;});
  gl.domElement.dataset.worldConveyorPhase=p.toFixed(3);gl.domElement.dataset.worldConveyorTask=p>=31&&p<37?'abastecer-coleta':p<5||p>=37?'livro-pronto':'aguardar-novo-livro';
 });
 return <group>
  {/* A clear left-hand service lane; it never crosses the readers or walkers. */}
  {[.20,1.55,2.90].map(z=>{
   const h=.63-(z-1.5)*.15;
   return <group key={z} position={[-5.60,0,z]}>
    <Box a={a} m={m.gold} p={[0,.14,0]} s={[.51,.06,.31]}/>
    <Box a={a} m={m.ink} p={[0,(h+.10)/2,0]} s={[.15,h,.16]}/>
    <Box a={a} m={m.gold} p={[0,h-.045,0]} s={[.54,.075,.19]}/>
   </group>;
  })}
  <group position={[-5.60,.63,1.50]} rotation={[.15,0,0]}>
   <Box a={a} m={m.ink} p={[0,-.035,0]} s={[.58,.16,3.24]}/>
   <instancedMesh ref={slats} args={[a.box,a.steel,count]} castShadow receiveShadow frustumCulled={false}/>
   {[-1,1].map(side=><group key={side}>
    <Box a={a} m={m.walnut} p={[side*.295,.03,0]} s={[.075,.14,3.32]}/>
    <Box a={a} m={m.gold} p={[side*.294,.13,0]} s={[.022,.025,3.30]}/>
    {[-1.52,1.52].map(z=><group key={z} position={[side*.24,.01,z]}>
     <group ref={el=>{rollers.current[(side+1)+(z>0?1:0)]=el;}}>
      <Cylinder a={a} m={m.gold} radius={.08} height={.06} r={[0,0,Math.PI/2]}/>
      <Box a={a} m={m.dark} s={[.074,.034,.10]}/>
     </group>
    </group>)}
   </group>)}
   {[0,1,2,3].map(i=><group key={i} ref={el=>{books.current[i]=el;}}>
    {i%2?<group>
     {[0,1,2].map(j=><Box key={j} a={a} m={m.paper} p={[0,j*.027,0]} s={[.345,.022,.41]}/>)}
     <Box a={a} m={m.gold} p={[0,.083,-.12]} s={[.11,.013,.073]}/>
    </group>:<Book a={a} m={m} color={i?m.green:m.wine} scale={.83}/>}
   </group>)}
   <AmberConveyorTunnel a={a} m={m}/>
   <Box a={a} m={a.steel} p={[0,-.02,1.64]} s={[.56,.065,.25]}/>
  </group>
 </group>;
}

function TransferStations({a,m,time}){
 const tableBook=useRef(),archiveTray=useRef(),archiveBook=useRef(),{gl}=useThree();
 useFrame(()=>{
  const p=mod(time.current/ARCHIVE_TRANSFER_CYCLE)*ARCHIVE_TRANSFER_CYCLE;
  tableBook.current.visible=p>=14&&p<20;
  const opening=between(p,22,25),closing=between(p,30,34);
  archiveTray.current.position.z=mix(-4.05,-3.44,opening*(1-closing));
  archiveBook.current.visible=p>=28;
  gl.domElement.dataset.worldCatalogueLoad=String(tableBook.current.visible);
  gl.domElement.dataset.worldArchiveLoad=String(archiveBook.current.visible);
  gl.domElement.dataset.worldArchiveDock=p>=30&&p<34?'arquivar-fechando':p>=22&&p<30?'gaveta-aberta':'gaveta-fechada';
 });
 return <group>
  <group position={[3.5,1.17,-.73]}>
   <Box a={a} m={m.gold} s={[.56,.035,.59]}/>
   <Box a={a} m={m.ink} p={[0,.025,0]} s={[.51,.025,.54]}/>
   <group ref={tableBook} position={[0,.065,0]} visible={false}><Book a={a} m={m} color={m.wine} scale={.83}/></group>
  </group>
  <group position={[3.1,3.25,-4.05]}>
   <Box a={a} m={m.ink} p={[0,.17,0]} s={[.79,.07,.64]}/>
   <Box a={a} m={m.wood} p={[0,-.15,0]} s={[.79,.06,.64]}/>
   <Box a={a} m={m.wood} p={[0,0,-.30]} s={[.79,.30,.05]}/>
   {[-1,1].map(side=><Box key={side} a={a} m={m.wood} p={[side*.37,0,0]} s={[.055,.30,.64]}/>)}
   <Box a={a} m={m.gold} p={[0,.215,.08]} s={[.30,.018,.18]}/>
  </group>
  <group ref={archiveTray} position={[3.1,3.15,-4.05]}>
   <Box a={a} m={m.gold} s={[.65,.045,.60]}/>
   <Box a={a} m={m.ink} p={[0,.026,0]} s={[.61,.018,.56]}/>
   <group ref={archiveBook} position={[0,.07,0]} visible={false}><Book a={a} m={m} color={m.wine} scale={.83}/></group>
  </group>
 </group>;
}

function Microscope({a,m,time}){
 const objective=useRef(),focus=useRef();
 useFrame(()=>{objective.current.rotation.y=time.current*.16;focus.current.rotation.z=time.current*.18;});
 return <group position={[3.70,1.145,-1.60]} scale={.87} rotation={[0,-.35,0]}>
  <Box a={a} m={m.ivory} p={[0,.055,0]} s={[.59,.11,.50]}/>
  <Box a={a} m={m.gold} p={[0,.116,0]} s={[.49,.018,.42]}/>
  <Box a={a} m={m.ink} p={[0,.47,-.15]} s={[.12,.68,.15]} r={[.16,0,0]}/>
  <Box a={a} m={m.ivory} p={[0,.80,-.09]} s={[.17,.23,.18]} r={[-.25,0,0]}/>
  <Box a={a} m={m.dark} p={[0,.41,.04]} s={[.45,.05,.38]}/>
  <Box a={a} m={m.glass} p={[0,.442,.065]} s={[.22,.012,.10]}/>
  {[-1,1].map(side=><Box key={side} a={a} m={m.gold} p={[side*.16,.452,.065]} s={[.025,.018,.16]}/>)}
  <group position={[0,.69,.06]}>
   <group ref={objective}>
    <Cylinder a={a} m={m.gold} radius={.14} height={.047}/>
    {[0,1,2].map(i=><group key={i} position={[Math.cos(i*TAU/3)*.095,-.09,Math.sin(i*TAU/3)*.095]}>
     <Cylinder a={a} m={m.ink} radius={.033} height={.15}/>
     <Cylinder a={a} m={m.gold} p={[0,-.08,0]} radius={.037} height={.035}/>
    </group>)}
   </group>
  </group>
  <Cylinder a={a} m={m.ink} p={[0,.96,-.08]} radius={.066} height={.23} r={[-.25,0,0]}/>
  <Cylinder a={a} m={m.gold} p={[0,1.085,-.111]} radius={.075} height={.038} r={[-.25,0,0]}/>
  <Cylinder a={a} m={m.glass} p={[0,1.107,-.116]} radius={.052} height={.01} r={[-.25,0,0]}/>
  <group ref={focus} position={[.115,.62,-.13]} rotation={[0,0,Math.PI/2]}>
   <Cylinder a={a} m={m.gold} radius={.09} height={.06}/>
   <Cylinder a={a} m={m.ink} p={[0,.035,0]} radius={.067} height={.025}/>
  </group>
  <Cylinder a={a} m={m.gold} p={[0,.18,.07]} radius={.085} height={.05}/>
 </group>;
}

function Astrolabe({a,m,time}){
 const celestial=useRef(),needle=useRef();
 useFrame(()=>{celestial.current.rotation.y=time.current*.10;needle.current.rotation.z=-time.current*.07;});
 return <group position={[-1.95,1.25,.10]} rotation={[0,.20,0]}>
  <Box a={a} m={m.walnut} p={[0,.045,0]} s={[.51,.09,.39]}/>
  <Box a={a} m={m.gold} p={[0,.097,0]} s={[.43,.023,.31]}/>
  <Cylinder a={a} m={m.gold} p={[0,.22,0]} radius={.045} height={.25}/>
  <group position={[0,.58,0]}>
   <Ring a={a} m={m.gold} radius={.31}/>
   <Ring a={a} m={m.gold} radius={.28} r={[Math.PI/2,0,0]}/>
   <group ref={celestial} rotation={[0,0,.35]}>
    <Ring a={a} m={m.gold} radius={.24} r={[0,Math.PI/2,0]}/>
    <Ring a={a} m={m.gold} radius={.21} r={[.45,0,0]}/>
    <mesh geometry={a.sphere} material={m.ink} scale={.076} castShadow/>
   </group>
   <group ref={needle}><Box a={a} m={m.gold} s={[.018,.55,.025]}/><mesh geometry={a.sphere} material={m.gold} scale={.042}/></group>
   {Array.from({length:12},(_,i)=><Box key={i} a={a} m={m.ink} p={[Math.sin(i*TAU/12)*.306,Math.cos(i*TAU/12)*.306,.014]} s={[.012,.030,.015]} r={[0,0,-i*TAU/12]}/>)}
  </group>
 </group>;
}

function ArchiveCamera({a,m,time}){
 const lens=useRef();
 useFrame(()=>{lens.current.position.z=.21+Math.sin(time.current*.65)*.025;});
 return <group position={[2.08,3.10,-3.68]} rotation={[0,-.30,0]}>
  <Box a={a} m={m.walnut} p={[0,.05,0]} s={[.68,.10,.52]}/>
  <Box a={a} m={m.ink} p={[0,.29,-.13]} s={[.53,.43,.22]}/>
  <Box a={a} m={m.gold} p={[0,.29,-.004]} s={[.48,.38,.025]}/>
  <Box a={a} m={m.walnut} p={[0,.29,.075]} s={[.40,.33,.14]}/>
  {[0,1,2,3,4].map(i=><Box key={i} a={a} m={m.ink} p={[0,.29,.015+i*.032]} s={[.41-i*.012,.34-i*.009,.021]}/>)}
  <group ref={lens} position={[0,.29,.21]}>
   <Cylinder a={a} m={m.gold} radius={.13} height={.17} r={[Math.PI/2,0,0]}/>
   <Cylinder a={a} m={m.ink} p={[0,0,.09]} radius={.135} height={.035} r={[Math.PI/2,0,0]}/>
   <Cylinder a={a} m={m.glass} p={[0,0,.111]} radius={.10} height={.012} r={[Math.PI/2,0,0]}/>
  </group>
  <Box a={a} m={m.gold} p={[.19,.51,-.13]} s={[.09,.04,.08]}/>
  <Box a={a} m={m.dark} p={[-.03,.55,-.13]} s={[.17,.06,.12]}/>
 </group>;
}

export default function ArchiveKinetics({time,materials,reduced=false}){
 const a=useMemo(makeAssets,[]),sampledTime=useRef(readTime(time)),m=materials||a.mats;
 useEffect(()=>()=>{a.resources.forEach(resource=>resource.dispose());},[a]);
 useFrame(()=>{if(!reduced)sampledTime.current=readTime(time);},-1);
 return <group dispose={null}>
  <DeliveryDrone a={a} m={m} time={sampledTime}/>
  <DeliveryDrone a={a} m={m} time={sampledTime} index={1}/>
  <DocumentConveyor a={a} m={m} time={sampledTime}/>
  <TransferStations a={a} m={m} time={sampledTime}/>
  <Microscope a={a} m={m} time={sampledTime}/>
  <Astrolabe a={a} m={m} time={sampledTime}/>
  <ArchiveCamera a={a} m={m} time={sampledTime}/>
 </group>;
}
