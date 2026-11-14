import React,{useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const TAU=Math.PI*2,CYCLE=40;
const clock=time=>Number.isFinite(typeof time==='number'?time:time?.current)?(typeof time==='number'?time:time.current):0;
const smooth=n=>{const p=THREE.MathUtils.clamp(n,0,1);return p*p*(3-2*p);};
const ramp=(p,a,b)=>smooth((p-a)/(b-a));

/** Scene counters, not institutional Harvard metrics. Matches ArchiveKinetics. */
export function archiveKnowledgeAt(seconds){
 const p=((seconds%CYCLE)+CYCLE)%CYCLE;
 return{
  phase:p,task:p<5?'aguardar-coleta':p<14?'receber':p<28?'catalogar':'preservar',
  status:[p<5?'Aguarda coleta':'1 volume coletado',p<14?'Aguarda chegada':p<20?'Volume na bandeja':'1 volume catalogado',p<28?'Aguarda depósito':'1 volume arquivado'],
  bars:[ramp(p,3,7),ramp(p,12,20),ramp(p,26,34)],
  flow:[ramp(p,5,14),ramp(p,20,28)],
  stage:p<5?0:p<14?1:p<28?2:3,
 };
}

function progressRing(radius=.105,tube=.012,segments=64,sides=8){
 const positions=[],normals=[],indices=[];
 for(let i=0;i<=segments;i++){
  const a=Math.PI/2-i/segments*TAU,ca=Math.cos(a),sa=Math.sin(a);
  for(let j=0;j<=sides;j++){
   const b=j/sides*TAU,cb=Math.cos(b),sb=Math.sin(b);
   positions.push(ca*(radius+tube*cb),sa*(radius+tube*cb),tube*sb);
   normals.push(ca*cb,sa*cb,sb);
  }
 }
 for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){
  const a=i*(sides+1)+j,b=a+sides+1;
  indices.push(a,b,a+1,b,b+1,a+1);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 geometry.setIndex(indices);geometry.computeBoundingSphere();
 return geometry;
}

function makePanel(mats){
 const owned=[],geo=new RoundedBoxGeometry(1,1,1,3,.065),sphere=new THREE.SphereGeometry(1,12,8);
 const ring=progressRing(),progress=progressRing(),batches={};
 const signal=new THREE.MeshStandardMaterial({color:'#ed9f51',roughness:.32,metalness:.22,emissive:'#fb7526',emissiveIntensity:.38});
 const white=new THREE.MeshStandardMaterial({color:'#f7f8f3',roughness:.52,metalness:.03});
 owned.push(signal,white);
 const materials={...mats,signal,face:white};
 const box=(mat,p,s,r=[0,0,0])=>(batches[mat]??=[]).push({p,s,r});
 // The housing has actual sides, a recessed waist and separate front plates.
 box('ink',[0,0,-.018],[3.80,1.20,.115]);
 box('gold',[0,0,.037],[3.76,1.16,.028]);
 box('face',[0,0,.071],[3.72,1.12,.062]);
 box('ink',[0,.235,.108],[3.48,.012,.014]);
 for(const x of[-.59,.59])box('ink',[x,-.075,.112],[.011,.53,.012]);
 for(const x of[-1.10,0,1.10]){
  box('ivory',[x,-.064,.125],[.99,.40,.034]);
  box('gold',[x,-.067,.143],[.98,.398,.010]);
  box('face',[x,-.055,.152],[.965,.375,.023]);
 }
 // Four recessed fasteners and the slotted lower edge make the frame tangible.
 for(const x of[-1.77,1.77])for(const y of[-.51,.51]){
  box('gold',[x,y,.120],[.055,.055,.012]);
  box('ink',[x,y,.129],[.029,.006,.007],[0,0,.5]);
 }
 for(let i=0;i<26;i++)box('ink',[-1.40+i*.112,-.543,.096],[.041,.015,.015]);
 // Receiving: a small archive crate with separate boards, strap and label.
 box('wood',[-1.34,-.055,.211],[.22,.18,.125]);
 box('walnut',[-1.34,-.055,.278],[.225,.016,.014]);
 for(const x of[-1.42,-1.26])box('gold',[x,-.055,.279],[.012,.18,.014]);
 box('paper',[-1.34,-.005,.284],[.075,.037,.009]);
 // Cataloguing: two boards, page block, raised spine and gilt bands.
 box('wine',[-.25,-.055,.204],[.20,.185,.028],[0,0,-.16]);
 box('paper',[-.243,-.052,.225],[.165,.155,.030],[0,0,-.16]);
 box('wine',[-.239,-.049,.248],[.20,.185,.019],[0,0,-.16]);
 box('gold',[-.31,-.039,.261],[.015,.18,.009],[0,0,-.16]);
 for(const y of[-.095,-.008])box('gold',[-.25,y,.261],[.115,.009,.008],[0,0,-.16]);
 // Preservation: layered, closed folios on a visible shelf with bookends.
 for(let i=0;i<3;i++){
  const y=-.12+i*.061;
  box(i%2?'green':'ink',[.85,y,.205],[.225,.043,.12]);
  box('paper',[.86,y,.269],[.18,.025,.010]);
  box('gold',[.77,y,.279],[.015,.035,.008]);
 }
 box('gold',[.85,-.160,.208],[.29,.015,.15]);
 for(const x of[.695,1.005])box('gold',[x,-.08,.208],[.015,.175,.15]);
 // Individual backing channels remain visible behind every moving data marker.
 const curves=[new THREE.CatmullRomCurve3([
  new THREE.Vector3(-1.10,-.285,.20),new THREE.Vector3(-1.10,-.40,.20),new THREE.Vector3(-.53,-.40,.20),new THREE.Vector3(0,-.40,.20),new THREE.Vector3(0,-.285,.20),
 ]),new THREE.CatmullRomCurve3([
  new THREE.Vector3(0,-.285,.20),new THREE.Vector3(0,-.44,.20),new THREE.Vector3(.53,-.44,.20),new THREE.Vector3(1.10,-.44,.20),new THREE.Vector3(1.10,-.285,.20),
 ])];
 const tubes=curves.map(curve=>new THREE.TubeGeometry(curve,48,.014,6,false));
 const channels=mergeGeometries(tubes,false);tubes.forEach(g=>g.dispose());
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=640;
 const context=canvas.getContext('2d');
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const labels=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false});
 owned.push(labels);
 const labelPlane=new THREE.PlaneGeometry(3.64,1.10);
 const paint=state=>{
  context.clearRect(0,0,2048,640);
  const text=(str,x,y,size=25,color='#203c35',weight=500,align='left')=>{
   context.font=`${weight} ${size}px system-ui, -apple-system, sans-serif`;context.fillStyle=color;context.textAlign=align;context.fillText(str,x,y);
  };
  text('FLUXO DO CONHECIMENTO',66,91,41,'#18382f',700);
  text('HARVARD LIBRARY · CONHECIMENTO EM MOVIMENTO',69,129,22,'#50665c',500);
  text('VERITAS',1910,121,22,'#29473b',600,'center');
  ['RECEBER','CATALOGAR','PRESERVAR'].forEach((title,i)=>{
   const cx=405+i*619;
   text(`0${i+1} / ${title}`,cx,232,26,'#264b3e',700,'center');
   text(state.status[i],cx,466,23,'#3d5649',550,'center');
  });
  text('COLETA',405,578,18,'#385547',650,'center');
  text('REGISTRO',1024,578,18,'#385547',650,'center');
  text('ARQUIVO',1643,578,18,'#385547',650,'center');
  texture.needsUpdate=true;
 };
 paint(archiveKnowledgeAt(0));
 return{geo,sphere,ring,progress,channels,labelPlane,labels,texture,owned,materials,batches,curves,paint};
}

function StaticInstances({geometry,material,items}){
 const ref=useRef();
 useEffect(()=>{
  const object=new THREE.Object3D();
  items.forEach(({p,s,r},i)=>{object.position.set(...p);object.scale.set(...s);object.rotation.set(...r);object.updateMatrix();ref.current.setMatrixAt(i,object.matrix);});
  ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere();
 },[items]);
 return <instancedMesh ref={ref} args={[geometry,material,items.length]} castShadow receiveShadow frustumCulled={false}/>;
}

/** Original, dimensional scene dashboard. The parent clock also freezes motion. */
export default function ArchiveKnowledgeEngine({assets,time,position=[7.35,3.20,-3.50]}){
 const panel=useMemo(()=>makePanel(assets.mats),[assets]),bars=useRef(),markers=useRef(),lastState=useRef(''),{gl}=useThree();
 const object=useMemo(()=>new THREE.Object3D(),[]),point=useMemo(()=>new THREE.Vector3(),[]);
 useEffect(()=>()=>{
  [panel.geo,panel.sphere,panel.ring,panel.progress,panel.channels,panel.labelPlane].forEach(g=>g.dispose());
  panel.texture.dispose();panel.owned.forEach(m=>m.dispose());
 },[panel]);
 useFrame(()=>{
  const state=archiveKnowledgeAt(clock(time)),stateKey=state.status.join('|');
  if(lastState.current!==stateKey){panel.paint(state);lastState.current=stateKey;}
  for(let stage=0;stage<3;stage++)for(let i=0;i<3;i++){
   const h=.045+(.10+i*.044)*state.bars[stage];
   object.position.set(-1.10+stage*1.10+.10+i*.083,-.14+h/2,.222);
   object.scale.set(.053,h,.067);object.rotation.set(0,0,0);object.updateMatrix();bars.current.setMatrixAt(stage*3+i,object.matrix);
  }
  bars.current.instanceMatrix.needsUpdate=true;
  for(let i=0;i<2;i++){
   panel.curves[i].getPointAt(state.flow[i],point);object.position.copy(point);object.scale.setScalar(.033);object.rotation.set(0,0,0);object.updateMatrix();markers.current.setMatrixAt(i,object.matrix);
  }
  markers.current.instanceMatrix.needsUpdate=true;
  panel.progress.setDrawRange(0,Math.max(1,Math.floor(state.phase/CYCLE*64))*8*6);
  gl.domElement.dataset.worldKnowledgePhase=state.phase.toFixed(3);
  gl.domElement.dataset.worldKnowledgeTask=state.task;
  gl.domElement.dataset.worldKnowledgeCounters=state.status.join(' | ');
  gl.domElement.dataset.worldKnowledgeFlow=state.flow.map(v=>v.toFixed(3)).join(',');
 });
 return <group position={position} name="archive-knowledge-engine">
  {Object.entries(panel.batches).map(([mat,items])=><StaticInstances key={mat} geometry={panel.geo} material={panel.materials[mat]} items={items}/>)}
  <mesh geometry={panel.labelPlane} material={panel.labels} position={[0,0,.177]}/>
  <mesh geometry={panel.channels} material={assets.mats.gold} castShadow/>
  <mesh geometry={panel.ring} material={assets.mats.ink} position={[1.575,.375,.167]}/>
  <mesh geometry={panel.progress} material={panel.materials.signal} position={[1.575,.375,.178]}/>
  <instancedMesh ref={bars} args={[panel.geo,assets.mats.green,9]} castShadow receiveShadow frustumCulled={false}/>
  <instancedMesh ref={markers} args={[panel.sphere,panel.materials.signal,2]} frustumCulled={false}/>
  <ArchiveRaisedGraph assets={assets} time={time}/>
 </group>;
}

function ArchiveRaisedGraph({assets,time}){
 const marker=useRef([]),lines=useRef([]),m=assets.mats;
 const graph=useMemo(()=>{
  const series=[[-.38,-.24,-.26,-.04,.01,.12,.18,.31],[-.44,-.35,-.28,-.31,-.12,-.03,.10,.22]];
  const curves=series.map(row=>new THREE.CatmullRomCurve3(row.map((y,i)=>new THREE.Vector3(-1.49+i*.425,y,.15)),false,'centripetal'));
  const tubes=curves.map(c=>new THREE.TubeGeometry(c,112,.012,8,false));
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=640;const c=canvas.getContext('2d');
  c.clearRect(0,0,1536,640);c.fillStyle='#26363e';c.font='600 41px Arial';c.fillText('COLEÇÕES EM MOVIMENTO',72,91);c.font='23px Arial';c.fillStyle='#766345';c.fillText('RECEBER',78,147);c.fillStyle='#a51c30';c.fillText('PRESERVAR',312,147);
  c.strokeStyle='#9b9b9555';c.lineWidth=1.4;
  for(let i=0;i<5;i++){const y=215+i*77;c.beginPath();c.moveTo(105,y);c.lineTo(1450,y);c.stroke();}
  c.fillStyle='#647173';c.font='20px Arial';['I','II','III','IV','V','VI','VII','VIII'].forEach((s,i)=>c.fillText(s,123+i*184,597));
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return{curves,tubes,texture};
 },[]);
 useEffect(()=>()=>{graph.tubes.forEach(g=>g.dispose());graph.texture.dispose();},[graph]);
 const p=useMemo(()=>new THREE.Vector3(),[]);
 useFrame(()=>{const phase=(clock(time)%40)/40;graph.curves.forEach((curve,i)=>{const progress=Math.min(1,Math.max(0,(phase-i*.12)/.80));curve.getPointAt(progress,p);marker.current[i]?.position.copy(p);const geom=graph.tubes[i];geom.setDrawRange(0,Math.max(1,Math.floor(progress*112))*8*6);});});
 return <group position={[0,-1.28,.02]} name="raised-animated-library-data-graph">
  <mesh geometry={new RoundedBoxGeometry(3.80,1.32,.10,3,.035)} material={m.ink} castShadow/>
  <mesh position={[0,0,.065]}><boxGeometry args={[3.73,1.25,.045]}/><meshPhysicalMaterial color="#faf9f3" roughness={.46} clearcoat={.2}/></mesh>
  <mesh position={[0,0,.091]}><planeGeometry args={[3.70,1.23]}/><meshStandardMaterial map={graph.texture} transparent roughness={.65}/></mesh>
  {graph.tubes.map((g,i)=><React.Fragment key={i}><mesh ref={el=>{lines.current[i]=el;}} geometry={g} material={i?m.wine:m.gold} castShadow/>
   <mesh ref={el=>{marker.current[i]=el;}} material={i?m.wine:m.gold} castShadow><sphereGeometry args={[.035,20,14]}/></mesh>
   {graph.curves[i].points.map((v,j)=><mesh key={j} position={v} material={i?m.wine:m.gold}><torusGeometry args={[.033,.008,8,24]}/></mesh>)}
  </React.Fragment>)}
 </group>;
}
