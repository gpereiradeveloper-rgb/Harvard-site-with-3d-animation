import React,{useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Original cutaway conservation / digitisation atelier, not a Harvard floor plan.
 * Mount directly in the existing R3F scene:
 * <ArchiveConservationWing assets={assets} time={time} motion={motion}/>
 *
 * Reuses the world's PBR materials and frozen clock; has no loader, RAF or state
 * updates. New static objects are instanced by material and geometry type.
 */
const clamp=n=>THREE.MathUtils.clamp(Number(n)||0,0,1);
const ease=n=>{const p=clamp(n);return p*p*(3-2*p);};
const phase=(t,d)=>((t%d)+d)%d;
const step=(p,a,b)=>ease((p-a)/(b-a));
const lerp=(a,b,p)=>a+(b-a)*p;
const mix3=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));
const readClock=t=>Number.isFinite(typeof t==='number'?t:t?.current)?(typeof t==='number'?t:t.current):0;
const INPUT=[6.98,1.14,-1.08],PRESS=[7.57,1.165,-2.12],OUTPUT=[8.12,1.14,-1.08];
const WING_DEPTH=.77,WING_Z=-1.32;
export const ARCHIVE_CONSERVATION_BOUNDS={x:[6.54,10.94],z:[-4.82,-1.00]};

export function conservationBindingAt(seconds){
 const p=phase(seconds,20),raised=1.85;
 let gripper=[INPUT[0],raised,INPUT[2]],load=false,pressStroke=0,task='livro-na-entrada';
 if(p>=1&&p<3){gripper[1]=lerp(raised,INPUT[1],step(p,1,3));task='recolher-livro';}
 else if(p>=3&&p<4){gripper[1]=lerp(INPUT[1],raised,step(p,3,4));load=true;task='elevar-livro';}
 else if(p>=4&&p<7){gripper=mix3([INPUT[0],raised,INPUT[2]],[PRESS[0],raised,PRESS[2]],step(p,4,7));load=true;task='levar-para-encadernacao';}
 else if(p>=7&&p<8){gripper=[PRESS[0],lerp(raised,PRESS[1],step(p,7,8)),PRESS[2]];load=true;task='colocar-na-prensa';}
 else if(p>=8&&p<9){gripper=[PRESS[0],lerp(PRESS[1],raised,step(p,8,9)),PRESS[2]];task='liberar-prensa';}
 else if(p>=9&&p<12){
  gripper=[PRESS[0],raised,PRESS[2]];pressStroke=step(p,9,10)*(1-step(p,11,12));task='prensar-encadernacao';
 }else if(p>=12&&p<13){gripper=[PRESS[0],lerp(raised,PRESS[1],step(p,12,13)),PRESS[2]];task='recolher-livro-pronto';}
 else if(p>=13&&p<14){gripper=[PRESS[0],lerp(PRESS[1],raised,step(p,13,14)),PRESS[2]];load=true;task='elevar-livro-pronto';}
 else if(p>=14&&p<17){gripper=mix3([PRESS[0],raised,PRESS[2]],[OUTPUT[0],raised,OUTPUT[2]],step(p,14,17));load=true;task='levar-para-saida';}
 else if(p>=17&&p<18){gripper=[OUTPUT[0],lerp(raised,OUTPUT[1],step(p,17,18)),OUTPUT[2]];load=true;task='depositar-livro-pronto';}
 else if(p>=18&&p<19){gripper=[OUTPUT[0],lerp(OUTPUT[1],raised,step(p,18,19)),OUTPUT[2]];task='descarregar-livro';}
 else if(p>=19){gripper=mix3([OUTPUT[0],raised,OUTPUT[2]],[INPUT[0],raised,INPUT[2]],step(p,19,20));task='retornar-vazio';}
 return{
  phase:p,gripper,load,pressStroke,task,
  books:[
   {visible:p<3||p>=18,position:p>=18?[INPUT[0],INPUT[1],lerp(-.55,INPUT[2],step(p,18,20))]:INPUT},
   {visible:p>=8&&p<13,position:PRESS},
   {visible:p>=18,position:[OUTPUT[0],OUTPUT[1],lerp(OUTPUT[2],-.55,step(p,18,20))]},
   {visible:load,position:gripper},
  ],
 };
}
export function conservationScannerAt(seconds){
 const p=phase(seconds,18);
 const z=p<2?.36:p<8?lerp(.36,-.36,step(p,2,8)):p<12?-.36:p<16?lerp(-.36,.36,step(p,12,16)):.36;
 return{phase:p,z,lift:step(p,8,10)*(1-step(p,10,12)),task:p<2?'alinhar-leitura':p<8?'digitalizar-pagina':p<12?'inspecionar-folha':p<16?'retornar-scanner':'pagina-digitalizada'};
}

function buildWing(){
 const batches={},put=(mat,p,s,r=[0,0,0],c,type='box')=>{const key=type+':'+mat;(batches[key]??={mat,type,items:[]}).items.push({p,s,r,c});};
 const box=(mat,p,s,r,c)=>put(mat,p,s,r,c);
 const cylinder=(mat,p,s,r)=>put(mat,p,s,r,undefined,'cylinder');
 // A slim contiguous terrace joins the main plinth without a new camera cut.
 box('ivory',[8.74,-.43,-2.05],[4.35,.62,4.91]);
 box('ink',[8.74,-.12,-2.05],[4.30,.11,4.87]);
 box('gold',[8.74,-.18,-2.05],[4.33,.026,4.90]);
 for(let x=0;x<7;x++)for(let z=0;z<8;z++)box('floor',[6.88+x*.605,.055,-4.20+z*.59],[.59,.075,.575],[0,(x+z)%2?Math.PI:0,0]);
 // Only the rear is full height; the front and camera-facing elevation stay open.
 box('ivory',[8.74,1.70,-4.40],[4.32,3.34,.17]);
 box('ink',[8.74,.45,-4.29],[4.32,.85,.12]);
 box('ivory',[10.88,.44,-2.05],[.16,.86,4.85]);
 for(const y of[.90,3.23,3.41])box('ivory',[8.74,y,-4.26],[4.39,.095,.26]);
 box('gold',[8.74,3.29,-4.10],[4.37,.025,.035]);
 for(const x of[6.64,8.75,10.83]){
  box('ink',[x,1.76,-4.12],[.16,3.40,.20]);
  box('gold',[x,3.34,-4.12],[.26,.10,.30]);
 }
 // Two shallow archive cases, individual documents and numbered drawer pulls.
 const palette=['#486454','#384d51','#8b6b57','#754950','#a39778','#465748'];
 for(const x of[7.65,9.77]){
  box('walnut',[x,1.40,-4.00],[1.73,2.56,.32]);
  for(const side of[-1,1])box('wood',[x+side*.91,1.43,-3.88],[.11,2.69,.57]);
  for(let row=0;row<4;row++){
   const y=.29+row*.64;box('wood',[x,y,-3.83],[1.85,.085,.65]);
   for(let i=0;i<14;i++){
    const h=.36+(i*7%5)*.032,bx=x-.79+i*.12;
    box('ink',[bx,y+h/2+.05,-3.53],[.102,h,.048],undefined,palette[(i+row)%palette.length]);
    box('paper',[bx,y+h/2+.05,-3.74],[.078,h*.91,.35]);
    for(const band of[-.28,.29])box('gold',[bx,y+h/2+.05+h*band,-3.50],[.083,.012,.009]);
   }
  }
  box('gold',[x,2.84,-3.86],[1.95,.032,.65]);
 }
 // Two timber work benches, brass shoes and visible cabinet joints.
 const table=(x,z,w,d)=>{
  box('wood',[x,.95,z],[w,.13,d]);box('ink',[x,.85,z],[w-.10,.10,d-.08]);
  for(const sx of[-1,1])for(const sz of[-1,1]){
   const px=x+sx*(w/2-.14),pz=z+sz*(d/2-.14);
   box('ink',[px,.47,pz],[.10,.88,.10]);box('gold',[px,.16,pz],[.115,.17,.115]);
  }
 };
 table(7.56,-1.64,1.91,2.59);table(9.65,-1.36,1.90,1.57);
 box('green',[9.65,1.03,-1.36],[1.55,.026,1.27]);
 // The scanning book: sewn spine, boards, stationary left page and paper stack.
 box('wine',[9.65,1.064,-1.34],[1.10,.05,.79]);
 box('paper',[9.39,1.101,-1.34],[.49,.055,.71]);
 box('paper',[9.91,1.101,-1.34],[.49,.055,.71]);
 box('gold',[9.65,1.115,-1.34],[.017,.023,.73]);
 for(let i=0;i<7;i++)box('wood',[9.39,1.132,-1.57+i*.071],[.29-(i%3)*.025,.005,.010]);
 // Scanner rails and small roller guides; the bridge travels on these rails.
 for(const side of[-1,1]){
  box('ink',[9.65+side*.69,1.16,-1.34],[.075,.21,1.23]);
  box('gold',[9.65+side*.69,1.285,-1.34],[.026,.026,1.16]);
  for(const z of[-1.86,-.82])cylinder('gold',[9.65+side*.69,1.30,z],[.038,.045,.038],[0,0,Math.PI/2]);
 }
 // Binder gantry: the gripper moves only between feeder, press and output.
 for(const x of[6.76,8.40]){
  for(const z of[-2.83,-.89])box('ink',[x,1.60,z],[.085,1.43,.10]);
  box('gold',[x,2.34,-1.86],[.035,.035,2.05]);
 }
 box('ink',[7.58,2.27,-2.82],[1.82,.14,.15]);
 box('ink',[7.58,2.27,-.88],[1.82,.14,.15]);
 // An actual compression station, with guides, a platen and a lower bed.
 box('ink',[PRESS[0],1.03,PRESS[2]],[.64,.10,.69]);
 box('gold',[PRESS[0],1.087,PRESS[2]],[.59,.021,.64]);
 for(const side of[-1,1])cylinder('gold',[PRESS[0]+side*.32,1.42,PRESS[2]-.30],[.024,.68,.024]);
 box('ink',[PRESS[0],1.81,PRESS[2]-.30],[.83,.13,.19]);
 box('ink',[PRESS[0],1.45,PRESS[2]-.43],[.18,.76,.15]);
 // Opaque feeder hoods conceal replenishment/removal rather than blinking books.
 for(const x of[INPUT[0],OUTPUT[0]]){
  box('gold',[x,1.055,-.87],[.53,.035,.91]);
  box('ink',[x,1.33,-.55],[.56,.085,.65]);
  box('wood',[x,1.18,-.24],[.56,.30,.06]);
  for(const side of[-1,1])box('wood',[x+side*.255,1.18,-.55],[.055,.30,.65]);
  box('gold',[x,1.383,-.55],[.22,.014,.13]);
 }
 // Conservative shelf accessories, storage boxes and a clean route inlay.
 for(let i=0;i<3;i++){
  box('ivory',[9.28+i*.34,.38,-2.69],[.29,.51,.47]);
  box('gold',[9.28+i*.34,.42,-2.445],[.15,.10,.018]);
  box('paper',[9.28+i*.34,.42,-2.432],[.11,.060,.01]);
 }
 box('gold',[8.66,.105,-2.04],[.022,.018,4.51]);
 return Object.values(batches);
}

function Instances({batch,geometry,material}){
 const ref=useRef();
 useEffect(()=>{
  const obj=new THREE.Object3D();
  batch.items.forEach((item,i)=>{
   obj.position.set(...item.p);obj.rotation.set(...item.r);obj.scale.set(...item.s);obj.updateMatrix();ref.current.setMatrixAt(i,obj.matrix);
   if(item.c)ref.current.setColorAt(i,new THREE.Color(item.c));
  });
  ref.current.instanceMatrix.needsUpdate=true;if(ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;ref.current.computeBoundingSphere();
 },[batch]);
 return <instancedMesh ref={ref} args={[geometry,material,batch.items.length]} castShadow receiveShadow frustumCulled={false}/>;
}
function makeBookGeometry(rounded){
 const shapes={
  wine:[{p:[0,.052,0],s:[.36,.025,.43]},{p:[0,-.052,0],s:[.36,.025,.43]},{p:[-.17,0,0],s:[.025,.11,.43]}],
  paper:[{p:[.008,0,0],s:[.32,.08,.39]}],
  gold:[{p:[0,.068,0],s:[.14,.006,.17]},{p:[-.187,0,-.13],s:[.009,.112,.012]},{p:[-.187,0,.13],s:[.009,.112,.012]}],
 };
 const result={},obj=new THREE.Object3D();
 for(const [mat,parts] of Object.entries(shapes)){
  const pieces=parts.map(part=>{obj.position.set(...part.p);obj.scale.set(...part.s);obj.updateMatrix();return rounded.clone().applyMatrix4(obj.matrix);});
  result[mat]=mergeGeometries(pieces,false);pieces.forEach(g=>g.dispose());
 }
 return result;
}
function BoundBooks({geometries,materials,time}){
 const refs=useRef({}),obj=useMemo(()=>new THREE.Object3D(),[]);
 useFrame(()=>{
  const state=conservationBindingAt(readClock(time));
  for(const mesh of Object.values(refs.current)){
   state.books.forEach((book,i)=>{
    obj.position.set(...book.position);obj.rotation.set(0,0,0);obj.scale.setScalar(book.visible?1:1e-5);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);
   });mesh.instanceMatrix.needsUpdate=true;
  }
 });
 return <>{Object.entries(geometries).map(([mat,g])=><instancedMesh key={mat} ref={el=>{if(el)refs.current[mat]=el;}} args={[g,materials[mat],4]} castShadow receiveShadow frustumCulled={false}/>)}</>;
}
function Part({geometry,material,position,scale,rotation}){
 return <mesh geometry={geometry} material={material} position={position} scale={scale} rotation={rotation} castShadow receiveShadow/>;
}
function BindingMachine({owned,m,time}){
 const cross=useRef(),carriage=useRef(),grip=useRef(),piston=useRef(),platen=useRef(),{gl}=useThree();
 useFrame(()=>{
  const state=conservationBindingAt(readClock(time)),p=state.gripper;
  cross.current.position.z=p[2];carriage.current.position.set(p[0],2.31,p[2]);grip.current.position.set(p[0],p[1]+.07,p[2]);
  const length=2.22-p[1]-.07;piston.current.position.set(p[0],p[1]+.07+length/2,p[2]);piston.current.scale.y=length;
  platen.current.position.y=1.53-state.pressStroke*.24;
  gl.domElement.dataset.worldBindingTask=state.task;gl.domElement.dataset.worldBindingPhase=state.phase.toFixed(3);
  gl.domElement.dataset.worldBindingLoad=String(state.load);gl.domElement.dataset.worldBindingStroke=state.pressStroke.toFixed(4);
  gl.domElement.dataset.worldBindingGripperX=p[0].toFixed(4);gl.domElement.dataset.worldBindingGripperZ=(p[2]*WING_DEPTH+WING_Z).toFixed(4);
 });
 return <>
  <group ref={cross} position={[7.58,2.34,-1.08]}>
   <Part geometry={owned.rounded} material={m.ink} scale={[1.72,.11,.13]}/>
   <Part geometry={owned.rounded} material={m.gold} position={[0,.068,0]} scale={[1.67,.018,.045]}/>
  </group>
  <group ref={carriage} position={[INPUT[0],2.31,INPUT[2]]}>
   <Part geometry={owned.rounded} material={m.ivory} scale={[.23,.24,.26]}/>
   <Part geometry={owned.rounded} material={m.ink} position={[0,.04,.04]} scale={[.20,.19,.23]}/>
  </group>
  <mesh ref={piston} geometry={owned.cylinder} material={m.gold} scale={[.027,.4,.027]} castShadow/>
  <group ref={grip}>
   <Part geometry={owned.rounded} material={m.gold} position={[0,.08,0]} scale={[.44,.055,.11]}/>
   {[-1,1].map(side=><Part key={side} geometry={owned.rounded} material={m.ink} position={[side*.192,.005,0]} scale={[.027,.12,.08]}/>)}
  </group>
  <group ref={platen} position={[PRESS[0],1.53,PRESS[2]]}>
   <Part geometry={owned.rounded} material={m.gold} scale={[.58,.08,.62]}/>
   <Part geometry={owned.rounded} material={m.ink} position={[0,-.048,0]} scale={[.54,.025,.58]}/>
  </group>
 </>;
}

function flexiblePage(){
 const g=new THREE.PlaneGeometry(.48,.68,10,12),position=g.attributes.position;
 // Shift the hinge to x=0: the outer edge can flex without moving the spine.
 for(let i=0;i<position.count;i++)position.setX(i,position.getX(i)+.24);
 return g;
}
function Scanner({owned,m,time}){
 const head=useRef(),probe=useRef(),{gl}=useThree(),base=useMemo(()=>Float32Array.from(owned.page.attributes.position.array),[owned]);
 useFrame(()=>{
  const state=conservationScannerAt(readClock(time));head.current.position.z=-1.34+state.z;
  const position=owned.page.attributes.position;
  for(let i=0;i<position.count;i++){
   const x=base[i*3],y=base[i*3+1];
   const corner=Math.pow(x/.48,2)*step(y,-.22,.34);
   position.setZ(i,state.lift*.15*corner);
  }
  position.needsUpdate=true;owned.page.computeVertexNormals();
  probe.current.rotation.x=-.20-state.lift*.38;
  gl.domElement.dataset.worldScannerZ=((-1.34+state.z)*WING_DEPTH+WING_Z).toFixed(4);gl.domElement.dataset.worldScannerTask=state.task;
  gl.domElement.dataset.worldConservationPageLift=state.lift.toFixed(4);
 });
 return <>
  <mesh geometry={owned.page} material={m.paper} position={[9.65,1.135,-1.34]} rotation={[-Math.PI/2,0,0]} receiveShadow castShadow/>
  <group ref={head} position={[9.65,1.39,-.98]}>
   <Part geometry={owned.rounded} material={m.ink} scale={[1.49,.15,.17]}/>
   <Part geometry={owned.rounded} material={m.gold} position={[0,.085,0]} scale={[1.39,.023,.085]}/>
   <Part geometry={owned.rounded} material={owned.scanMaterial} position={[0,-.085,0]} scale={[1.02,.018,.032]}/>
   <Part geometry={owned.rounded} material={m.glass} position={[0,.035,.092]} scale={[.21,.052,.018]}/>
  </group>
  <group ref={probe} position={[10.12,1.23,-1.02]} rotation={[-.2,0,0]}>
   <Part geometry={owned.rounded} material={m.gold} scale={[.025,.045,.29]}/>
   <Part geometry={owned.rounded} material={m.ivory} position={[0,-.025,-.14]} scale={[.07,.035,.07]}/>
  </group>
 </>;
}
function Label({position,title,detail,width=1.45}){
 const data=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;const c=canvas.getContext('2d');
  c.fillStyle='#223632';c.fillRect(0,0,768,192);c.strokeStyle='#b99555';c.lineWidth=2;c.strokeRect(10,10,748,172);
  c.fillStyle='#e5dfcf';c.textAlign='center';c.font='37px Georgia';c.fillText(title,384,83);
  c.fillStyle='#c1ac7c';c.font='18px Arial';c.fillText(detail,384,133);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return{texture,geometry:new THREE.PlaneGeometry(width,width/4),material:new THREE.MeshStandardMaterial({map:texture,roughness:.63})};
 },[title,detail,width]);useEffect(()=>()=>{data.texture.dispose();data.geometry.dispose();data.material.dispose();},[data]);
 return <mesh position={position} geometry={data.geometry} material={data.material}/>;
}
function Wing({assets,time,motion}){
 const ref=useRef(),{gl}=useThree(),m=assets.mats,batches=useMemo(buildWing,[]);
 const owned=useMemo(()=>{
  const rounded=new RoundedBoxGeometry(1,1,1,1,.055);
  return{
   rounded,box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,12),books:makeBookGeometry(rounded),page:flexiblePage(),
   scanMaterial:new THREE.MeshStandardMaterial({color:'#d2c4a1',emissive:'#e8d7a3',emissiveIntensity:.12,roughness:.44,metalness:.13}),
  };
 },[]);
 useEffect(()=>()=>{owned.rounded.dispose();owned.box.dispose();owned.cylinder.dispose();owned.page.dispose();owned.scanMaterial.dispose();Object.values(owned.books).forEach(g=>g.dispose());},[owned]);
 useFrame(()=>{
  const built=ease(clamp(motion?.progress??1));ref.current.scale.y=.97+.03*built;
  gl.domElement.dataset.worldConservationTime=readClock(time).toFixed(3);
 });
 return <group ref={ref} dispose={null} position={[0,0,WING_Z]} scale={[1,1,WING_DEPTH]}>
  {batches.map((batch,i)=><Instances key={i} batch={batch} geometry={batch.type==='cylinder'?owned.cylinder:owned.box} material={m[batch.mat]||m.ivory}/>)}
  <BoundBooks geometries={owned.books} materials={m} time={time}/>
  <BindingMachine owned={owned} m={m} time={time}/>
  <Scanner owned={owned} m={m} time={time}/>
  <Label position={[7.65,3.02,-4.09]} title="CONSERVAÇÃO" detail="CUIDAR · ENCADERNAR · PRESERVAR" width={1.65}/>
  <Label position={[9.77,3.02,-4.09]} title="DIGITALIZAÇÃO" detail="LER · REGISTRAR · COMPARTILHAR" width={1.65}/>
 </group>;
}
export default function ArchiveConservationWing({assets,time,motion}){
 if(!assets?.mats)return null;
 return <Wing assets={assets} time={time} motion={motion}/>;
}
