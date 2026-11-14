import React,{Suspense,useEffect,useMemo,useRef,useState} from 'react';
import './HarvardArchiveWorld.css';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Environment,Html,Lightformer,RoundedBox} from '@react-three/drei';
import {EffectComposer,N8AO,Bloom} from '@react-three/postprocessing';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {useViewportRenderQuality} from './RenderQuality';
import ArchiveKinetics from './ArchiveKinetics';
import ArchiveRigidBatch from './ArchiveRigidBatch';
import ArchiveCourier from './ArchiveRealCourier';
import ArchiveStreetPorter from './ArchiveStreetPorter';
import ArchiveScholars from './ArchiveScholars';
import ArchiveWarehouseHandling from './ArchiveWarehouseHandling';
import ArchiveStreets from './ArchiveStreets';
import ArchiveGroundLogistics from './ArchiveGroundLogistics';
import ArchiveKnowledgeEngine from './ArchiveKnowledgeEngine';
import {ImportedTree} from './ArchiveReadyModels';
import ArchiveCollectionModels,{ReadyArchiveTable} from './ArchiveCollectionModels';
import ReadyShelvedBooks from './ArchiveShelvedBooks';
import ArchiveDeskDetails from './ArchiveDeskDetails';
import earthLand from './data/naturalEarthLand.json';

/*
 * An original, deliberately illustrated knowledge atelier, not a reconstruction
 * or a scan of any Harvard interior. Authored geometry uses procedural fallbacks;
 * local, CC0 photographic PBR surfaces progressively finish the wood and plaster.
 * Attribution/source: public/assets/atelier-materials/CREDITS.md.
 */
const INK='#192d36',IVORY='#eeeae3',GOLD='#b59c70',WINE='#a51c30';
const EDGE_BOX=new RoundedBoxGeometry(1,1,1,3,.035);
const EDGE_ROD=new THREE.CylinderGeometry(1,1,1,16);
const clamp=n=>THREE.MathUtils.clamp(Number(n)||0,0,1);
const smooth=(value,a=0,b=1)=>{const n=clamp((value-a)/(b-a));return n*n*(3-2*n);};
const EMPTY_MOTION={progress:0};
function randomGenerator(seed=1636){return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};}

function materialAssets(){
 const textures=[];
 const make=(type)=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const context=canvas.getContext('2d'),r=randomGenerator(type==='wood'?1915:1636);
  context.fillStyle=type==='wood'?'#a29683':type==='paper'?'#e9dfc8':'#e3e4df';context.fillRect(0,0,256,256);
  for(let i=0;i<3500;i++){
   const x=r()*256,y=r()*256;
   context.fillStyle=type==='wood'?'rgba(35,22,12,'+(r()*.035)+')':'rgba(78,66,44,'+(r()*(type==='paper'?.045:.012))+')';
   context.fillRect(x,y,type==='wood'?1:1+r()*2,type==='wood'?4+r()*80:1);
  }
  if(type==='wood')for(let i=0;i<80;i++){
   const x=r()*256;context.strokeStyle='rgba(237,215,165,.10)';context.lineWidth=.6;
   context.beginPath();context.moveTo(x,0);context.bezierCurveTo(x+12,80,x-9,180,x+3,256);context.stroke();
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;
  if(type==='wood')map.repeat.set(1,2);
  textures.push(map);return map;
 };
 const wood=make('wood'),paper=make('paper'),stone=make('stone');
 const normalCanvas=document.createElement('canvas');normalCanvas.width=normalCanvas.height=128;
 const nc=normalCanvas.getContext('2d'),pixels=nc.createImageData(128,128),r=randomGenerator(1701);
 for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=128+(r()-.5)*10;pixels.data[i+1]=128+(r()-.5)*10;pixels.data[i+2]=254;pixels.data[i+3]=255;}
 nc.putImageData(pixels,0,0);const normal=new THREE.CanvasTexture(normalCanvas);normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.repeat.set(6,6);textures.push(normal);
 const standard=(color,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness:.48,clearcoat:.28,clearcoatRoughness:.25,...extra});
 const spineCanvas=document.createElement('canvas');spineCanvas.width=256;spineCanvas.height=1024;
 const spine=spineCanvas.getContext('2d');spine.fillStyle='#eee9df';spine.fillRect(0,0,256,1024);
 for(let i=0;i<12000;i++){spine.fillStyle=i%2?'#ffffff12':'#0000000b';spine.fillRect((i*71)%256,(i*137)%1024,1,3);}
 spine.strokeStyle='#fcf3d9';spine.lineWidth=3;spine.strokeRect(22,35,212,954);
 spine.textAlign='center';spine.fillStyle='#fff6dd';spine.font='27px Georgia';
 ['HARVARD','LIBRARY'].forEach((text,i)=>spine.fillText(text,128,150+i*42));
 spine.font='22px Georgia';['NATURAL','PHILOSOPHY'].forEach((text,i)=>spine.fillText(text,128,430+i*36));
 spine.font='18px Georgia';spine.fillText('MDCCC',128,875);
 const spineMap=new THREE.CanvasTexture(spineCanvas);spineMap.colorSpace=THREE.SRGBColorSpace;spineMap.anisotropy=8;textures.push(spineMap);
 const mats={
  ink:standard(INK,{roughness:.24,metalness:.16,clearcoat:.75,clearcoatRoughness:.18}),
  ivory:standard('#e8e9e3',{roughness:.27,clearcoat:.7,clearcoatRoughness:.18}),
  stone:standard('#d8dad4',{map:stone,normalMap:normal,normalScale:new THREE.Vector2(.025,.025),roughness:.56,clearcoat:.1}),
  wood:standard('#e4c5a3',{map:wood,normalMap:normal,normalScale:new THREE.Vector2(.08,.08),roughness:.36,clearcoat:.45}),
  floor:standard('#e5e3da',{map:wood,normalMap:normal,normalScale:new THREE.Vector2(.035,.035),roughness:.36,clearcoat:.42,clearcoatRoughness:.22}),
  walnut:standard('#b49476',{map:wood,normalMap:normal,normalScale:new THREE.Vector2(.15,.15),roughness:.39}),
  gold:standard('#bda371',{roughness:.25,metalness:.86,clearcoat:.35}),
  paper:standard('#fff6df',{map:paper,normalMap:normal,normalScale:new THREE.Vector2(.07,.07),roughness:.93}),
  cloth:standard('#ffffff',{map:spineMap,normalMap:normal,normalScale:new THREE.Vector2(.10,.10),roughness:.72,clearcoat:.06}),
  wine:standard(WINE,{roughness:.30,clearcoat:.65}),green:standard('#466652',{roughness:.61,clearcoat:.05}),
  glass:standard('#aac1b7',{roughness:.13,metalness:.30}),
  dark:standard('#28302a',{roughness:.86}),
  leaf:standard('#527844',{roughness:.73,side:THREE.DoubleSide}),clay:standard('#bc896c',{roughness:.78}),
 };
 return{mats,textures,box:new RoundedBoxGeometry(1,1,1,3,.025),cylinder:new THREE.CylinderGeometry(1,1,1,32),sphere:new THREE.SphereGeometry(1,24,16)};
}

function PhotoFinish({assets}){
 const {gl}=useThree(),finishes=useRef([]);
 useEffect(()=>{
  let alive=true,expired=false;const loaded=[],loader=new THREE.TextureLoader();
  const deadline=setTimeout(()=>{expired=true;loaded.forEach(t=>t.dispose());},20000);
  const load=(file,color=false)=>new Promise((resolve,reject)=>{
   loader.load('/assets/atelier-materials/'+file,texture=>{
    if(!alive||expired){texture.dispose();resolve(null);return;}
    texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());loaded.push(texture);resolve(texture);
   },undefined,reject);
  });
  const apply=(mat,maps,type)=>{
   const repeat=type==='floor'?[.38,.36]:type==='wood'?[.25,.5]:[.8,.8];
   const copies=maps.map((t,index)=>{
    let copy;
    if(index===0&&(type==='floor'||type==='wood')){
     const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
     const context=canvas.getContext('2d');context.drawImage(t.image,0,0,1024,1024);
     context.globalAlpha=type==='floor'?.48:.22;context.fillStyle=type==='floor'?'#d6d8d2':'#c2b6a2';context.fillRect(0,0,1024,1024);
     copy=new THREE.CanvasTexture(canvas);copy.colorSpace=THREE.SRGBColorSpace;copy.wrapS=copy.wrapT=THREE.RepeatWrapping;copy.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());
    }else copy=t.clone();
    copy.repeat.set(...repeat);copy.needsUpdate=true;loaded.push(copy);return copy;
   });
   mat.map=copies[0];mat.normalMap=copies[1];mat.roughnessMap=copies[2];
   mat.normalScale.setScalar(type==='plaster'?.025:type==='floor'?.035:.065);mat.needsUpdate=true;
  };
  Promise.all([
   Promise.all([load('floor-color-4k.jpg',true),load('floor-normal-2k.jpg'),load('floor-roughness-2k.jpg')]),
   Promise.all([load('stone-color-2k.jpg',true),load('stone-normal-2k.jpg'),load('stone-roughness-2k.jpg')])
  ]).then(([wood,stone])=>{
   clearTimeout(deadline);if(!alive||expired||[...wood,...stone].some(t=>!t))return;
   assets.mats.floor.color.set('#f2f2ec');assets.mats.floor.roughness=.36;
   assets.mats.wood.color.set('#e1d4bd');assets.mats.wood.roughness=.30;
   assets.mats.walnut.color.set('#96785c');assets.mats.walnut.roughness=.39;
   apply(assets.mats.floor,wood,'floor');apply(assets.mats.wood,wood,'wood');apply(assets.mats.walnut,wood,'wood');apply(assets.mats.stone,stone,'plaster');
  }).catch(()=>{clearTimeout(deadline);expired=true;loaded.forEach(t=>t.dispose());});
  return()=>{alive=false;clearTimeout(deadline);finishes.current=[];loaded.forEach(t=>t.dispose());};
 },[assets,gl]);
 useFrame((_,dt)=>finishes.current.forEach(f=>{
  f.blend.value=Math.min(1,f.blend.value+Math.min(dt,.05)*.7);
  f.mat.normalScale.setScalar(f.target*f.blend.value);
 }));
 return null;
}

// Imported table UVs, colour maps and geometry are retained. A separate varnish
// lobe makes the wide tabletops read as finished furniture under studio light.
function ImportedTableFinish(){
 const {scene}=useThree(),state=useRef({elapsed:0,next:0,groups:new WeakSet(),materials:new Map()});
 useEffect(()=>()=>state.current.materials.forEach(m=>m.dispose()),[]);
 useFrame((_,dt)=>{
  const s=state.current;s.elapsed+=dt;if(s.elapsed<s.next)return;s.next=s.elapsed+1;
  scene.traverse(group=>{
   if(group.userData?.collectionModel!=='painted_wooden_table'||s.groups.has(group))return;
   s.groups.add(group);group.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const finish=source=>{
     if(s.materials.has(source))return s.materials.get(source);
     const material=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(material,source);
     material.clearcoat=.72;material.clearcoatRoughness=.19;material.roughness=.33;material.roughnessMap=null;
     material.normalScale?.multiplyScalar(.45);material.needsUpdate=true;s.materials.set(source,material);return material;
    };
    mesh.material=Array.isArray(mesh.material)?mesh.material.map(finish):finish(mesh.material);
   });
  });
 });return null;
}

function Batch({items,geometry,material}){
 const ref=useRef();
 useEffect(()=>{
  const dummy=new THREE.Object3D();
  items.forEach((item,index)=>{
   dummy.position.set(...item.p);dummy.scale.set(...item.s);dummy.rotation.set(...(item.r||[0,0,0]));dummy.updateMatrix();ref.current.setMatrixAt(index,dummy.matrix);
   if(item.c)ref.current.setColorAt(index,new THREE.Color(item.c));
  });
  ref.current.instanceMatrix.needsUpdate=true;if(ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;
  ref.current.computeBoundingSphere();
 },[items]);
 return <instancedMesh ref={ref} args={[geometry,material,items.length]} castShadow receiveShadow frustumCulled={false}/>;
}

function atelierLayout(){
 const layers={floor:{},walls:{},shelves:{},archive:{},objects:{}};
 const add=(layer,mat,p,s,r,c)=>{(layers[layer][mat]??=[]).push({p,s,r,c});};
 const box=(layer,mat,p,s,r)=>add(layer,mat,p,s,r);
 // Fine-grained parquet, brass inlay and the two level transitions.
 for(let x=0;x<15;x++)for(let z=0;z<12;z++){
  const odd=(x+z)%2;box('floor','floor',[-5.6+x*.79,.055,-4.2+z*.735],[.775,.075,.72],[0,odd?Math.PI:0,0]);
 }
 box('floor','gold',[.8,.075,0],[.035,.03,9.1]);
 box('floor','gold',[-1.9,.075,4.25],[5.4,.03,.035]);
 // Open cutaway walls: panelling is built up instead of a solid featureless box.
 box('walls','ivory',[-.2,2.12,-4.65],[11.9,4.15,.23]);
 box('walls','ivory',[-6.08,2.12,-.6],[.23,4.15,8.2]);
 box('walls','ink',[-.2,.55,-4.48],[11.9,1.02,.16]);
 box('walls','ink',[-5.92,.55,-.6],[.16,1.02,8.2]);
 for(let x=0;x<8;x++){
  const px=-5.65+x*1.57;
  box('walls','ivory',[px,2.1,-4.45],[.18,4.05,.22]);
  box('walls','gold',[px+.13,2.1,-4.31],[.025,3.6,.025]);
 }
 for(let z=0;z<6;z++)box('walls','ivory',[-5.85,2.1,-4.1+z*1.38],[.30,4.05,.16]);
 for(const y of[1.03,3.91,4.15]){
  box('walls','ivory',[-.2,y,-4.48],[12.1,.11,.30]);
  box('walls','ivory',[-5.93,y,-.6],[.30,.11,8.3]);
 }
 box('walls','gold',[-.2,4.02,-4.27],[12.1,.035,.045]);
 // An unroofed reading gallery retains a clear view of its working interior.
 for(const x of[-5.25,.45,5.5]){
  box('walls','ink',[x,2.20,-3.95],[.25,4.35,.25]);
  box('walls','gold',[x,4.17,-3.95],[.43,.12,.43]);
  box('walls','ivory',[x,.22,-3.95],[.44,.40,.44]);
 }
 box('walls','ink',[.1,4.4,-3.95],[11.2,.30,.32]);
 // Four bookcases: individual spines, exposed paper, joints and brass bands.
 const bookColors=['#344c43','#74654c','#753e45','#a28f71','#28414b','#b1a080','#575e48','#c1ad8c'];
 const r=randomGenerator(1881);
 const bookcase=(x,z,w=2.5,rotation=0)=>{
  const transform=p=>[x+p[0]*Math.cos(rotation)+p[2]*Math.sin(rotation),p[1],z-p[0]*Math.sin(rotation)+p[2]*Math.cos(rotation)];
  const local=(mat,p,s)=>box('shelves',mat,transform(p),s,[0,rotation,0]);
  local('walnut',[0,1.83,0],[w,3.54,.32]);
  for(const sx of[-1,1])local('wood',[sx*(w/2+.04),1.85,.20],[.13,3.7,.61]);
  local('ink',[0,.19,.20],[w+.26,.25,.65]);local('gold',[0,3.75,.24],[w+.31,.05,.65]);
  for(let row=0;row<5;row++){
   const y=.38+row*.66;local('wood',[0,y,.23],[w,.10,.62]);
  }
 };
 bookcase(-4.1,-4.02,2.45);bookcase(-1.35,-4.02,2.45);bookcase(-5.57,-1.70,2.5,Math.PI/2);
 // Archival cabinet: drawer front and label frame are separately articulated.
 box('archive','ink',[3.13,1.49,-3.80],[4.4,2.86,.84]);
 box('archive','wood',[3.13,2.99,-3.75],[4.62,.16,1.02]);
 for(let c=0;c<6;c++)for(let row=0;row<4;row++){
  const x=1.29+c*.735,y=.45+row*.63;
  if(c===4&&row===2)continue; // This drawer is the independently moving assembly below.
  box('archive','wood',[x,y,-3.29],[.64,.52,.16]);
  box('archive','gold',[x,y+.025,-3.195],[.27,.12,.025]);
  box('archive','paper',[x,y+.025,-3.175],[.21,.072,.012]);
  box('archive','gold',[x,y-.14,-3.16],[.22,.035,.05]);
 }
 // Desk joinery: reading desk, intake station and a brass-topped catalogue.
 const desk=(x,z,w,d,h=1.15)=>{
  box('objects','wood',[x,h,z],[w,.16,d]);box('objects','ink',[x,h-.13,z],[w-.12,.10,d-.1]);
  for(const sx of[-1,1])for(const sz of[-1,1]){
   box('objects','walnut',[x+sx*(w/2-.17),h/2,z+sz*(d/2-.15)],[.14,h,.14]);
   box('objects','gold',[x+sx*(w/2-.17),.15,z+sz*(d/2-.15)],[.15,.16,.15]);
  }
 };
 box('objects','green',[-2.75,1.245,.6],[2.4,.025,1.12]);
 box('objects','ink',[3.5,1.14,-1.18],[2.24,.035,1.04]);
 // Resting document folders, a stack of folios and a magnifier case.
 for(let i=0;i<3;i++)box('objects','paper',[2.85+i*.12,1.19+i*.045,-1.35],[.75,.035,.68],[0,-.2+i*.12,0]);
 box('objects','wine',[4.23,1.22,-1.0],[.53,.08,.69],[0,.22,0]);
 // Central archival delivery ribbon and paper rails.

 return layers;
}

function ConstructedWorld({motion,assets}){
 const groups=useRef({}),layout=useMemo(atelierLayout,[]);
 useFrame(()=>{
  const p=clamp(motion.progress);
  for(const [index,name] of Object.keys(layout).entries()){
   const group=groups.current[name];if(!group)continue;
   const f=smooth(p,index*.035,.23+index*.045);
   group.position.y=(1-f)*(name==='floor'?-.22:.65+index*.08);
   group.scale.setScalar(1);
   group.rotation.y=0;
  }
 });
 return <>{Object.entries(layout).map(([layer,batches])=><group key={layer} ref={g=>{groups.current[layer]=g;}}>{Object.entries(batches).map(([mat,items])=><Batch key={mat} items={items} geometry={assets.box} material={assets.mats[mat]}/>)}{layer==='shelves'&&<Suspense fallback={null}><ReadyShelvedBooks/></Suspense>}</group>)}</>;
}

function Cube({p,s,mat,rotation,children}){
 return <mesh position={p} scale={s} rotation={rotation} geometry={EDGE_BOX} material={mat} castShadow receiveShadow dispose={null}>{children}</mesh>;
}
function Rod({p,r=.035,h=1,mat,rotation}){
 return <mesh position={p} rotation={rotation} scale={[r,h,r]} geometry={EDGE_ROD} material={mat} castShadow receiveShadow dispose={null}/>;
}

// A single cast plinth joins the archive and receiving wing. Its stepped outline
// leaves the existing service street and all its vehicle clearances untouched.
function AtelierPlinth({assets}){
 const parts=useMemo(()=>{
  const make=(inset,depth,bevel)=>{
   const points=[[-6.62+inset,-5.22+inset],[12.55-inset,-5.22+inset],[12.55-inset,1.16-inset],[6.61-inset,1.16-inset],[6.61-inset,5.22-inset],[-6.62+inset,5.22-inset]];
   const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
   const geometry=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:3});
   geometry.rotateX(-Math.PI/2);geometry.computeBoundingSphere();return geometry;
  };
  return{body:make(.06,.48,.075),trim:make(.025,.025,.018),edge:make(.035,.085,.035)};
 },[]);
 useEffect(()=>()=>Object.values(parts).forEach(g=>g.dispose()),[parts]);
 return <ArchiveRigidBatch name="One continuous bevelled Harvard atelier plinth">
  <mesh geometry={parts.body} position={[0,-.76,0]} material={assets.mats.ivory} castShadow receiveShadow/>
  <mesh geometry={parts.trim} position={[0,-.29,0]} material={assets.mats.gold} castShadow/>
  <mesh geometry={parts.edge} position={[0,-.245,0]} material={assets.mats.ink} castShadow receiveShadow/>
  <Cube p={[0,-.52,5.237]} s={[4.35,.29,.075]} mat={assets.mats.ink}/>
  <Cube p={[0,-.685,5.244]} s={[4.13,.014,.079]} mat={assets.mats.gold}/>
 </ArchiveRigidBatch>;
}

function ReceivingArchitecture({assets}){
 const m=assets.mats;
 const details=useMemo(()=>{
  const pieces=[];
  const add=(mat,p,s)=>pieces.push({mat,p,s});
  // Structural panelling sits behind the real rack and scanner; the entire
  // working front remains open so tasks are readable from the overview.
  add('ivory',[9.49,1.70,-4.85],[5.92,3.22,.18]);
  add('ink',[9.49,.53,-4.735],[5.92,.82,.075]);
  add('gold',[9.49,.97,-4.679],[5.92,.027,.023]);
  for(const x of[6.64,8.49,10.48,12.34]){
   add('ivory',[x,1.72,-4.67],[.13,3.28,.24]);
   add('gold',[x+.09,1.75,-4.535],[.018,2.94,.025]);
   add('ink',[x,.22,-4.65],[.24,.29,.29]);
  }
  add('ink',[9.49,3.38,-4.69],[6.13,.20,.36]);
  add('gold',[9.49,3.51,-4.65],[6.13,.035,.36]);
  add('ivory',[9.49,3.61,-4.70],[6.27,.15,.42]);
  // Recessed crimson enamel panels and an ivory architrave give the receiving
  // wing the same miniature architecture and depth as the reading room.
  for(const x of[7.59,9.48,11.40]){
   add('ink',[x,2.73,-4.727],[1.49,.61,.075]);
   add('wine',[x,2.73,-4.679],[1.39,.50,.035]);
   add('gold',[x,2.43,-4.642],[1.49,.018,.026]);
  }
  return Object.entries(pieces.reduce((all,{mat,p,s})=>{(all[mat]??=[]).push({p,s});return all;},{}));
 },[]);
 return <group name="Open receiving wing with raised Harvard enamel and brass architecture">
  {details.map(([mat,items])=><Batch key={mat} items={items} geometry={assets.box} material={m[mat]}/>)}
  <Plaque position={[7.59,2.72,-4.64]} title="ACERVO" subtitle="RECEBER · CONFERIR · CATALOGAR" width={1.25}/>
  <Plaque position={[9.48,2.72,-4.64]} title="VERITAS" subtitle="HARVARD LIBRARY · 1636" width={1.25}/>
  <Plaque position={[11.40,2.72,-4.64]} title="COLEÇÕES" subtitle="PRESERVAR · COMPARTILHAR" width={1.25}/>
 </group>;
}

function Plaque({position,rotation=[0,0,0],title,subtitle,width=2.4}){
 const map=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d');
  c.fillStyle=INK;c.fillRect(0,0,1024,256);c.strokeStyle=GOLD;c.lineWidth=2;c.strokeRect(12,12,1000,232);
  c.fillStyle='#e7d9b5';c.textAlign='center';c.font='52px Georgia';c.fillText(title,512,115);
  c.fillStyle='#bba778';c.font='20px Arial';c.fillText(subtitle,512,178);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
 },[title,subtitle]);useEffect(()=>()=>map.dispose(),[map]);
 return <group position={position} rotation={rotation} name={'Raised enamel plaque — '+title}>
  <RoundedBox args={[width+.065,width*.25+.065,.085]} radius={Math.min(.025,width*.02)} smoothness={3} position={[0,0,-.043]} castShadow receiveShadow><meshPhysicalMaterial color={GOLD} metalness={.8} roughness={.25} clearcoat={.3}/></RoundedBox>
  <mesh position={[0,0,.001]}><planeGeometry args={[width,width*.25]}/><meshPhysicalMaterial map={map} roughness={.31} metalness={.12} clearcoat={.6} clearcoatRoughness={.2}/></mesh>
 </group>;
}

const CART_POINTS=[[-.10,.22,3.5],[.05,.22,1.5],[.1,.22,-1.85],[-1.2,.22,-2.6],[-4.6,.22,-2.45],[-4.9,.22,.35],[-4.85,.22,3.2],[-3,.22,3.65]];
function BookCart({assets,time}){
 const {gl}=useThree();
 const ref=useRef(),wheels=useRef([]),curve=useMemo(()=>new THREE.CatmullRomCurve3(CART_POINTS.map(p=>new THREE.Vector3(...p)),true,'centripetal'),[]);
 const v=useMemo(()=>new THREE.Vector3(),[]);
 useFrame(()=>{
  const f=(time.current*.025)%1,position=curve.getPointAt(f),direction=curve.getTangentAt(f);
  ref.current.position.copy(position);ref.current.rotation.y=Math.atan2(direction.x,direction.z);
  gl.domElement.dataset.worldCartX=position.x.toFixed(4);gl.domElement.dataset.worldCartZ=position.z.toFixed(4);
  wheels.current.forEach(w=>{if(w)w.rotation.x=-time.current*2;});
 });
 const m=assets.mats;
 return <group ref={ref}>
  <Cube p={[0,.33,0]} s={[.68,.08,.94]} mat={m.ink}/><Cube p={[0,.81,0]} s={[.68,.07,.94]} mat={m.wood}/>
  {[-1,1].map(x=>[-1,1].map(z=><group key={x+':'+z}>
   <Rod p={[x*.29,.62,z*.39]} r={.025} h={.94} mat={m.gold}/>
   <mesh ref={el=>{wheels.current[(x+1)+(z===1?1:0)]=el;}} position={[x*.30,.05,z*.34]} rotation={[0,0,Math.PI/2]} material={m.dark} castShadow><cylinderGeometry args={[.105,.105,.055,16]}/></mesh>
  </group>))}
  <Rod p={[0,1.10,-.39]} r={.027} h={.58} rotation={[0,0,Math.PI/2]} mat={m.gold}/>
  {[0,1,2,3,4].map((i)=><group key={i} position={[-.22+i*.11,.99,.04]} rotation={[0,0,(i-2)*.03]}>
   <Cube p={[0,0,0]} s={[.09,.30+i%2*.08,.48]} mat={i%2?m.wine:m.ink}/><Cube p={[0,.01,.02]} s={[.065,.28+i%2*.08,.43]} mat={m.paper}/>
   <Cube p={[0,.08,.25]} s={[.085,.015,.015]} mat={m.gold}/>
  </group>)}
  {[0,1,2].map(i=><group key={i}><Cube p={[0,.43+i*.08,0]} s={[.53,.07,.68]} mat={i%2?m.wine:m.green}/><Cube p={[0,.43+i*.08,.02]} s={[.47,.045,.65]} mat={m.paper}/></group>)}
 </group>;
}

function DeskLamp({position,assets,time}){
 const shade=useRef(),m=assets.mats;
 useFrame(()=>{shade.current.rotation.z=Math.sin(time.current*.45)*.025;});
 return <group position={position}>
  <mesh material={m.gold} position={[0,.045,0]} castShadow><cylinderGeometry args={[.24,.29,.09,32]}/></mesh>
  <Rod p={[0,.40,0]} r={.035} h={.68} mat={m.gold}/><Rod p={[.20,.73,0]} r={.03} h={.42} rotation={[0,0,Math.PI/2]} mat={m.gold}/>
  <group ref={shade} position={[.41,.72,0]}>
   <mesh rotation={[0,0,-.2]} material={m.green} castShadow><sphereGeometry args={[.30,32,16,0,Math.PI*2,0,Math.PI*.55]}/></mesh>
   <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.01,0]}><circleGeometry args={[.275,32]}/><meshStandardMaterial color="#ffe7a7" emissive="#ffda86" emissiveIntensity={1.2} side={THREE.DoubleSide}/></mesh>
   <pointLight position={[0,-.12,0]} intensity={1.7} distance={3} decay={2} color="#ffe3a8"/>
  </group>
 </group>;
}

function OpenFolio({assets,time}){
 const page=useRef(),pageMaterial=useRef(),m=assets.mats;
 const map=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1280;const c=canvas.getContext('2d');c.scale(2,2);
  c.fillStyle='#ede3cc';c.fillRect(0,0,512,640);c.strokeStyle='#c0a66e';c.lineWidth=2;c.strokeRect(30,30,452,580);
  c.fillStyle=INK;c.textAlign='center';c.font='bold 38px Georgia';c.fillText('VERITAS',256,119);c.font='15px Georgia';c.fillText('IN PURSUIT OF KNOWLEDGE',256,155);
  c.fillStyle='#9c8152';c.fillRect(235,190,42,2);c.strokeStyle='#8f9278';
  c.beginPath();c.arc(256,315,91,0,Math.PI*2);c.stroke();c.beginPath();c.ellipse(256,315,40,91,0,0,Math.PI*2);c.stroke();
  c.textAlign='left';c.fillStyle=INK;c.font='15px Georgia';
  ['O conhecimento começa com uma pergunta.','Entre livros, memórias e descobertas,','cada geração encontra novas maneiras','de compreender e transformar o mundo.'].forEach((line,i)=>c.fillText(line,93,452+i*23));
  c.textAlign='center';
  c.fillStyle='#9c8152';c.font='15px Georgia';c.fillText('HARVARD · 1636',256,584);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;return tex;
 },[]);
 const geometry=useMemo(()=>{
  const g=new THREE.PlaneGeometry(.59,.83,18,12),pos=g.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i)+.295;pos.setZ(i,Math.sin(x/.59*Math.PI)*.055);}g.computeVertexNormals();return g;
 },[]);
 useEffect(()=>()=>{map.dispose();geometry.dispose();},[map,geometry]);
 useFrame(()=>{const phase=(time.current*.12)%1;page.current.rotation.y=-Math.PI*smooth(phase,.13,.82);pageMaterial.current.opacity=smooth(phase,0,.08)*(1-smooth(phase,.88,.99));});
 return <group position={[-2.95,1.29,.53]} rotation={[-Math.PI/2,0,.09]}><ArchiveRigidBatch dynamicRefs={[page]}>
  <Cube p={[0,0,-.055]} s={[1.32,.91,.07]} mat={m.ink}/><Cube p={[-.325,0,-.012]} s={[.61,.84,.045]} mat={m.paper}/><Cube p={[.325,0,-.012]} s={[.61,.84,.045]} mat={m.paper}/>
  {[-1,1].map(side=><mesh key={side} position={[side*.325,0,.018]}><planeGeometry args={[.59,.83]}/><meshStandardMaterial map={map} roughness={.9}/></mesh>)}
  <group ref={page}><mesh geometry={geometry} position={[.295,0,.035]}><meshStandardMaterial ref={pageMaterial} map={map} roughness={.88} side={THREE.DoubleSide} transparent depthWrite={false}/></mesh></group>
 </ArchiveRigidBatch></group>;
}

function ArchiveMotion({assets,time,motion}){
 const drawer=useRef(),sheets=useRef([]),m=assets.mats,{gl}=useThree();
 const prints=useMemo(()=>{
  const make=(w,h,paint)=>{const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;};
  return{
   label:make(1024,256,(c,w,h)=>{c.fillStyle='#e6dcc5';c.fillRect(0,0,w,h);c.fillStyle=INK;c.textAlign='center';c.font='52px Georgia';c.fillText('VI · HISTÓRIAS',w/2,113);c.font='25px Georgia';c.fillText('HARVARD / 1636',w/2,178);}),
   cover:make(1536,2048,(c,w,h)=>{c.fillStyle='#253644';c.fillRect(0,0,w,h);const r=randomGenerator(1915);for(let i=0;i<35000;i++){c.fillStyle=r()>.5?'#ffffff08':'#00000012';c.fillRect(r()*w,r()*h,1,r()*8+1);}c.strokeStyle='#b79b66';c.lineWidth=5;c.strokeRect(82,90,w-164,h-180);c.lineWidth=1.5;c.strokeRect(105,113,w-210,h-226);c.fillStyle='#d6bf8c';c.textAlign='center';c.font='80px Georgia';c.fillText('HARVARD',w/2,535);c.font='130px Georgia';c.fillText('VERITAS',w/2,1030);c.font='36px Georgia';c.fillText('UM ATLAS DE IDEIAS',w/2,1140);c.font='40px Georgia';c.fillText('1636',w/2,1770);}),
  };
 },[]);
 useEffect(()=>()=>Object.values(prints).forEach(t=>t.dispose()),[prints]);
 useFrame(()=>{
  const p=clamp(motion.progress),entry=smooth(p,.65,.81);
  drawer.current.position.z=-3.12+THREE.MathUtils.lerp((.5+.5*Math.sin(time.current*.65))*.35,1.38,entry);
  gl.domElement.dataset.worldDrawerOpen=entry.toFixed(4);
  sheets.current.forEach((sheet,i)=>{
   if(!sheet)return;const f=(time.current*.095+i/5)%1;
   sheet.position.set(1.22+(3.25-1.22)*f,1.16+Math.sin(f*Math.PI)*.91,.65+(-1.15-.65)*f);
   sheet.rotation.set(-Math.PI/2+Math.sin(f*Math.PI)*.30,Math.sin(f*Math.PI)*.25,-.15+f*.40);
   sheet.material.opacity=smooth(f,0,.08)*(1-smooth(f,.88,1));
  });
 });
 return <>
  <group ref={drawer} position={[4.23,1.70,-3.12]}><ArchiveRigidBatch>
   <RoundedBox args={[.62,.49,.11]} radius={.013} smoothness={3} material={m.wood} castShadow receiveShadow/>
   <Cube p={[0,-.20,-.42]} s={[.60,.06,.82]} mat={m.walnut}/>
   <Cube p={[0,-.166,-.43]} s={[.54,.012,.74]} mat={m.ink}/>
   {[-1,1].map(x=><group key={x}><Cube p={[x*.29,-.02,-.43]} s={[.035,.39,.8]} mat={m.wood}/><Cube p={[x*.288,.182,-.43]} s={[.044,.014,.81]} mat={m.gold}/><Cube p={[x*.312,-.14,-.43]} s={[.012,.025,.73]} mat={m.gold}/></group>)}
   <Cube p={[0,-.02,-.82]} s={[.58,.36,.035]} mat={m.walnut}/>
   <RoundedBox args={[.285,.129,.018]} radius={.012} smoothness={3} position={[0,.01,.068]} material={m.gold}/>
   <mesh position={[0,.01,.080]}><planeGeometry args={[.237,.084]}/><meshStandardMaterial map={prints.label} roughness={.91}/></mesh>
   {[-1,1].map(s=><mesh key={s} position={[s*.125,.01,.084]} material={m.gold}><sphereGeometry args={[.009,12,8]}/></mesh>)}
   <Rod p={[-.105,-.13,.11]} r={.014} h={.04} rotation={[Math.PI/2,0,0]} mat={m.gold}/><Rod p={[.105,-.13,.11]} r={.014} h={.04} rotation={[Math.PI/2,0,0]} mat={m.gold}/>
   <Rod p={[0,-.13,.13]} r={.013} h={.21} rotation={[0,0,Math.PI/2]} mat={m.gold}/>
   <group position={[0,-.12,-.44]}>
    <RoundedBox args={[.47,.025,.64]} radius={.008} smoothness={3} material={m.ink}/>
    {[0,1,2,3,4].map(i=><Cube key={i} p={[.003,.021+i*.007,0]} s={[.445,.005,.61]} mat={m.paper}/>)}
    <RoundedBox args={[.47,.019,.64]} radius={.007} smoothness={3} position={[0,.061,0]} material={m.ink}/>
    <mesh position={[0,.071,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.463,.630]}/><meshPhysicalMaterial map={prints.cover} roughness={.82} normalMap={m.paper.normalMap} normalScale={new THREE.Vector2(.06,.06)} clearcoat={.12}/></mesh>
   </group>
  </ArchiveRigidBatch></group>
 </>;
}

function Globe({assets,time}){
 const spin=useRef(),m=assets.mats;
 const maps=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;
  const relief=document.createElement('canvas');relief.width=2048;relief.height=1024;
  const c=canvas.getContext('2d'),d=relief.getContext('2d');
  c.fillStyle='#245c73';c.fillRect(0,0,2048,1024);d.fillStyle='#080808';d.fillRect(0,0,2048,1024);
  const trace=(ctx,rings)=>{ctx.beginPath();rings.forEach(ring=>{ring.forEach(([lon,lat],i)=>{const x=(lon+180)/360*2048,y=(90-lat)/180*1024;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();});};
  earthLand.polygons.forEach(rings=>{
   trace(c,rings);c.fillStyle='#dfcf99';c.fill('evenodd');c.strokeStyle='#efe5c6';c.lineWidth=1.1;c.stroke();
   trace(d,rings);d.fillStyle='#c9c9c9';d.fill('evenodd');
  });
  c.lineWidth=.8;c.strokeStyle='rgba(184,218,218,.32)';
  for(let lon=0;lon<2048;lon+=2048/24){c.beginPath();c.moveTo(lon,0);c.lineTo(lon,1024);c.stroke();}
  for(let lat=0;lat<1024;lat+=1024/12){c.beginPath();c.moveTo(0,lat);c.lineTo(2048,lat);c.stroke();}
  c.textAlign='center';c.font='500 19px Georgia';c.fillStyle='#e4eef0';
  [[-128,3,'PACÍFICO'],[-29,7,'ATLÂNTICO'],[82,-20,'ÍNDICO']].forEach(([lon,lat,name])=>c.fillText(name,(lon+180)/360*2048,(90-lat)/180*1024));
  const color=new THREE.CanvasTexture(canvas),height=new THREE.CanvasTexture(relief);
  color.colorSpace=THREE.SRGBColorSpace;color.anisotropy=8;height.colorSpace=THREE.NoColorSpace;
  return {color,height};
 },[]);
 useEffect(()=>()=>{maps.color.dispose();maps.height.dispose();},[maps]);
 useFrame(()=>{spin.current.rotation.y=time.current*.10;});
 return <group position={[4.65,.72,2.75]}><ArchiveRigidBatch dynamicRefs={[spin]}>
  <mesh material={m.gold} castShadow><cylinderGeometry args={[.35,.45,.10,40]}/></mesh><Rod p={[0,.25,0]} r={.055} h={.48} mat={m.gold}/>
  <mesh material={m.ink} position={[0,.063,0]}><cylinderGeometry args={[.29,.32,.018,40]}/></mesh>
  <group position={[0,.91,0]} rotation={[0,0,-.27]}>
   <mesh material={m.gold} rotation={[0,Math.PI/2,0]} castShadow><torusGeometry args={[.72,.022,12,96]}/></mesh>
   <mesh material={m.gold} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.704,.009,8,96]}/></mesh>
   <mesh ref={spin} castShadow receiveShadow><sphereGeometry args={[.65,128,80]}/><meshPhysicalMaterial map={maps.color} displacementMap={maps.height} displacementScale={.014} bumpMap={maps.height} bumpScale={.012} roughness={.37} metalness={.11} clearcoat={.22} clearcoatRoughness={.3}/></mesh>
  </group>
 </ArchiveRigidBatch></group>;
}

function ReadingFigure({position,rotation=0,assets,time,variant=0}){
 const arm=useRef(),head=useRef(),m=assets.mats;
 useFrame(()=>{arm.current.rotation.x=-.58+Math.sin(time.current*.85+variant*2)*.12;head.current.rotation.y=Math.sin(time.current*.40+variant)*.07;});
 return <group position={position} rotation={[0,rotation,0]}>
  <Cube p={[0,.55,0]} s={[.55,.10,.50]} mat={m.ink}/><Cube p={[0,.90,.20]} s={[.55,.65,.10]} mat={m.wood}/>
  {[-1,1].map(x=>[-1,1].map(z=><Rod key={x+':'+z} p={[x*.22,.28,z*.18]} r={.025} h={.53} mat={m.gold}/>))}
  <group position={[0,.64,-.03]}>
   <mesh rotation={[.12,0,0]} material={variant?m.green:m.wine} castShadow><capsuleGeometry args={[.18,.36,6,12]}/></mesh>
   <group ref={head} position={[0,.48,-.02]}>
    <mesh castShadow><sphereGeometry args={[.145,20,16]}/><meshStandardMaterial color={variant?'#a97b59':'#d2af83'} roughness={.85}/></mesh>
    <mesh position={[0,.065,.024]} material={m.dark} castShadow><sphereGeometry args={[.146,20,12,0,Math.PI*2,0,Math.PI*.48]}/></mesh>
   </group>
   {[-1,1].map(side=><group key={side} ref={side===1?arm:undefined} position={[side*.20,.22,-.01]} rotation={[-.58,0,side*.12]}>
    <mesh position={[0,-.15,0]} material={variant?m.green:m.wine} castShadow><capsuleGeometry args={[.062,.22,4,10]}/></mesh>
    <mesh position={[0,-.31,-.05]} rotation={[1.15,0,0]} castShadow><capsuleGeometry args={[.052,.21,4,10]}/><meshStandardMaterial color={variant?'#a97b59':'#d2af83'} roughness={.85}/></mesh>
   </group>)}
   {[-1,1].map(side=><group key={side} position={[side*.11,-.13,-.06]}><Cube p={[0,-.14,-.08]} s={[.15,.34,.17]} mat={m.ink}/><Cube p={[0,-.34,-.16]} s={[.16,.10,.28]} mat={m.dark}/></group>)}
  </group>
 </group>;
}

function WalkingAcademic({assets,time,index=0}){
 const ref=useRef(),legs=useRef([]),knees=useRef([]),arms=useRef([]),head=useRef(),{gl}=useThree();
 const m=assets.mats,coat=index?m.green:m.ink;
 useFrame(()=>{
  const t=time.current,phase=(t*(index?.037:.043)+index*.34)%1;
  const forward=.5-.5*Math.cos(phase*Math.PI*2),stride=t*(index?5.4:5.8)+index*Math.PI;
  const heading=Math.PI*smooth(phase,.45,.55)+Math.PI*smooth(phase,.94,1);
  if(index){
   ref.current.position.set(THREE.MathUtils.lerp(-4.7,4.7,forward),.12,4.58);
   ref.current.rotation.y=Math.PI/2+heading;
  }else{
   ref.current.position.set(-.65,.12,THREE.MathUtils.lerp(-2.38,3.42,forward));
   ref.current.rotation.y=heading;
  }
  ref.current.position.y+=Math.abs(Math.sin(stride))*.016;
  for(let side=0;side<2;side++){
   const step=Math.sin(stride+side*Math.PI);
   legs.current[side].rotation.x=step*.39;knees.current[side].rotation.x=Math.max(0,-step)*.58;
   arms.current[side].rotation.x=side?-.20-step*.28:-.38+step*.055;
  }
  head.current.rotation.y=Math.sin(t*.63+index)*.075;
  gl.domElement.dataset['worldActor'+(index+1)+'X']=ref.current.position.x.toFixed(4);
  gl.domElement.dataset['worldActor'+(index+1)+'Z']=ref.current.position.z.toFixed(4);
 });
 return <group ref={ref}>
  <group position={[0,.66,0]}>
   <mesh material={coat} castShadow><capsuleGeometry args={[.165,.31,6,16]}/></mesh>
   <Cube p={[0,.14,.141]} s={[.034,.23,.025]} mat={m.ivory}/>
   <Cube p={[0,.13,.16]} s={[.024,.12,.012]} mat={m.wine}/>
   <group ref={head} position={[0,.43,0]}>
    <mesh castShadow><sphereGeometry args={[.13,20,16]}/><meshStandardMaterial color={index?'#a67954':'#d0aa80'} roughness={.83}/></mesh>
    <mesh position={[0,.062,-.02]} material={m.walnut} castShadow><sphereGeometry args={[.132,20,12,0,Math.PI*2,0,Math.PI*.53]}/></mesh>
    <mesh position={[0,-.005,.121]}><sphereGeometry args={[.024,10,8]}/><meshStandardMaterial color={index?'#a67954':'#d0aa80'} roughness={.83}/></mesh>
   </group>
   {[-1,1].map((side,i)=><group key={side} ref={el=>{arms.current[i]=el;}} position={[side*.19,.14,0]}>
    <mesh position={[0,-.13,0]} material={coat} castShadow><capsuleGeometry args={[.055,.18,4,12]}/></mesh>
    <mesh position={[0,-.285,.04]} rotation={[-.35,0,0]} castShadow><capsuleGeometry args={[.046,.14,4,10]}/><meshStandardMaterial color={index?'#a67954':'#d0aa80'} roughness={.84}/></mesh>
   </group>)}
   <group position={[-.16,-.055,.155]} rotation={[0,0,-.13]}>
    <Cube p={[0,0,0]} s={[.12,.29,.20]} mat={index?m.wine:m.gold}/><Cube p={[.01,0,.006]} s={[.087,.25,.18]} mat={m.paper}/>
    <Cube p={[-.056,.07,0]} s={[.012,.014,.195]} mat={m.gold}/>
   </group>
   {[-1,1].map((side,i)=><group key={side} ref={el=>{legs.current[i]=el;}} position={[side*.085,-.20,0]}>
    <mesh position={[0,-.13,0]} material={m.ink} castShadow><capsuleGeometry args={[.064,.17,4,12]}/></mesh>
    <group ref={el=>{knees.current[i]=el;}} position={[0,-.25,0]}>
     <mesh position={[0,-.11,0]} material={m.ink} castShadow><capsuleGeometry args={[.052,.15,4,12]}/></mesh>
     <Cube p={[0,-.225,.055]} s={[.115,.075,.22]} mat={m.dark}/>
    </group>
   </group>)}
  </group>
 </group>;
}

function ArchivePress({assets,time}){
 const lever=useRef(),platen=useRef(),paper=useRef(),{gl}=useThree(),m=assets.mats;
 useFrame(()=>{
  const cycle=(time.current*.19)%1,stroke=.5-.5*Math.cos(cycle*Math.PI*2);
  lever.current.rotation.z=-.13+stroke*.51;platen.current.position.y=1.18-stroke*.25;
  paper.current.position.z=.12+smooth(cycle,.53,.96)*.43;
  gl.domElement.dataset.worldPressStroke=stroke.toFixed(4);
 });
 return <group position={[4.68,.12,.65]}><ArchiveRigidBatch dynamicRefs={[lever,platen,paper]}>
  <Cube p={[0,.20,0]} s={[1.32,.32,1.05]} mat={m.walnut}/>
  <Cube p={[0,.39,0]} s={[1.39,.07,1.12]} mat={m.gold}/>
  {[-1,1].map(side=><group key={side}>
   <Cube p={[side*.53,1.14,-.27]} s={[.19,1.55,.25]} mat={m.ink}/>
   <Cube p={[side*.53,.50,-.27]} s={[.25,.14,.31]} mat={m.gold}/>
   <Cube p={[side*.53,1.87,-.27]} s={[.26,.10,.32]} mat={m.gold}/>
  </group>)}
  <Cube p={[0,1.99,-.27]} s={[1.48,.20,.38]} mat={m.walnut}/>
  <Cube p={[0,.78,.05]} s={[1.09,.14,.85]} mat={m.ink}/>
  <Rod p={[0,1.50,-.16]} r={.071} h={.81} mat={m.gold}/>
  {[0,1,2,3,4,5].map(i=><mesh key={i} position={[0,1.22+i*.083,-.16]} rotation={[Math.PI/2,0,0]} material={m.gold}><torusGeometry args={[.085,.012,6,24]}/></mesh>)}
  <group ref={platen} position={[0,1.1,0]}>
   <Cube p={[0,0,0]} s={[1.01,.13,.77]} mat={m.gold}/><Cube p={[0,-.08,0]} s={[.94,.045,.70]} mat={m.ink}/>
  </group>
  <group ref={lever} position={[0,1.73,-.27]}>
   <Rod p={[.65,0,0]} r={.034} h={1.30} rotation={[0,0,Math.PI/2]} mat={m.gold}/>
   <mesh position={[1.31,0,0]} material={m.walnut} castShadow><sphereGeometry args={[.10,20,12]}/></mesh>
  </group>
  <group ref={paper} position={[0,.88,.12]}><ArchiveRigidBatch>
   <Cube p={[0,0,0]} s={[.78,.019,.63]} mat={m.paper}/>
   {[0,1,2,3,4].map(i=><Cube key={i} p={[0,.011,-.16+i*.058]} s={[i? .44:.31,.005,.009]} mat={i?m.walnut:m.wine}/>)}
  </ArchiveRigidBatch></group>
 </ArchiveRigidBatch></group>;
}

function CourtyardTree({assets,time}){
 const crown=useRef(),leafRef=useRef(),branchRef=useRef(),m=assets.mats;
 const model=useMemo(()=>{
  const r=randomGenerator(1636),leaves=[],branches=[];
  const leafShape=new THREE.Shape();leafShape.moveTo(0,-.5);leafShape.bezierCurveTo(-.42,-.18,-.3,.3,0,.5);leafShape.bezierCurveTo(.3,.3,.42,-.18,0,-.5);
  const leaf=new THREE.ExtrudeGeometry(leafShape,{depth:.014,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1,steps:1,curveSegments:6});
  const trunk=new THREE.CylinderGeometry(1,1,1,8),dummy=new THREE.Object3D();
  const branch=(from,to,radius)=>{
   const start=new THREE.Vector3(...from),end=new THREE.Vector3(...to),delta=end.clone().sub(start);
   dummy.position.copy(start).add(end).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());dummy.scale.set(radius,delta.length(),radius);dummy.updateMatrix();branches.push(dummy.matrix.clone());
  };
  branch([0,.23,0],[.025,1.78,-.01],.049);
  for(let j=0;j<12;j++){
   const angle=j*2.399,height=.85+(j/12)*1.03,reach=.55+r()*.24;
   const base=[.02,height,0],tip=[Math.cos(angle)*reach,height+.47,Math.sin(angle)*reach];branch(base,tip,.013+(12-j)*.0011);
   for(let k=0;k<3;k++){
    const u=.5+k*.19,twig=[tip[0]*u,base[1]+.47*u,tip[2]*u],a=angle+(k%2?-.6:.6),end=[twig[0]+Math.cos(a)*.26,twig[1]+.24,twig[2]+Math.sin(a)*.26];branch(twig,end,.007);
    for(let n=0;n<8;n++){
     const t=n/7,side=n%2?-1:1;
     leaves.push({p:[twig[0]+(end[0]-twig[0])*t+Math.sin(a)*side*.085,twig[1]+.24*t+(r()-.5)*.035,twig[2]+(end[2]-twig[2])*t+Math.cos(a)*side*.085],r:[-.70+r()*.45,a+side*.65,r()*.40-.20],s:[.11+r()*.035,.22+r()*.045,1],c:new THREE.Color().setHSL(.24+r()*.06,.31+r()*.14,.25+r()*.15)});
    }
   }
  }
  return {leaf,trunk,leaves,branches};
 },[]);
 useEffect(()=>{
  const dummy=new THREE.Object3D();model.leaves.forEach((l,i)=>{dummy.position.set(...l.p);dummy.rotation.set(...l.r);dummy.scale.set(...l.s);dummy.updateMatrix();leafRef.current.setMatrixAt(i,dummy.matrix);leafRef.current.setColorAt(i,l.c);});
  leafRef.current.instanceMatrix.needsUpdate=true;leafRef.current.instanceColor.needsUpdate=true;leafRef.current.computeBoundingSphere();
  model.branches.forEach((matrix,i)=>branchRef.current.setMatrixAt(i,matrix));branchRef.current.instanceMatrix.needsUpdate=true;branchRef.current.computeBoundingSphere();
  return()=>{model.leaf.dispose();model.trunk.dispose();};
 },[model]);
 useFrame(()=>{crown.current.rotation.z=Math.sin(time.current*.55)*.014;crown.current.rotation.x=Math.sin(time.current*.37)*.008;});
 return <group position={[2.02,.44,2.04]}>
  <mesh material={m.clay} castShadow receiveShadow><cylinderGeometry args={[.41,.32,.53,40,3,true]}/></mesh>
  <mesh material={m.clay} position={[0,.25,0]} rotation={[Math.PI/2,0,0]} castShadow><torusGeometry args={[.395,.029,8,48]}/></mesh>
  <mesh position={[0,.22,0]} material={m.dark} receiveShadow><cylinderGeometry args={[.36,.36,.025,32]}/></mesh>
  <group ref={crown}>
   <instancedMesh ref={branchRef} args={[model.trunk,m.walnut,model.branches.length]} castShadow receiveShadow/>
   <instancedMesh ref={leafRef} args={[model.leaf,m.leaf,model.leaves.length]} castShadow receiveShadow/>
  </group>
 </group>;
}

function GoldRoute({assets}){
 const curve=useMemo(()=>new THREE.CatmullRomCurve3(CART_POINTS.map(p=>new THREE.Vector3(p[0],.11,p[2])),true,'centripetal'),[]);
 const geometry=useMemo(()=>new THREE.TubeGeometry(curve,100,.018,6,true),[curve]);useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} material={assets.mats.gold}/>;
}
function ArchiveHotspot({position,id,kicker,name,onSelect,motion,focused}){
 const {size}=useThree(),compact=size.width<700,button=useRef();
 useFrame(()=>{if(button.current){const visible=clamp(motion.progress)<.67&&!focused;button.current.style.visibility=visible?'visible':'hidden';button.current.inert=!visible;}});
 const calculatePosition=(el,camera,viewport)=>{
  const p=new THREE.Vector3().setFromMatrixPosition(el.matrixWorld).project(camera),margin=compact?61:114;
  return[THREE.MathUtils.clamp((p.x*.5+.5)*viewport.width,margin,viewport.width-margin),THREE.MathUtils.clamp((-p.y*.5+.5)*viewport.height,80,viewport.height-76)];
 };
 return <Html position={position} center calculatePosition={calculatePosition} zIndexRange={[9,3]} style={{pointerEvents:'none'}}>
  <button ref={button} type="button" onClick={()=>onSelect?.(id)} aria-label={'Explorar '+name} className="archive-world-hotspot">
   <span className="archive-world-hotspot__number">{kicker.slice(0,2)}</span>
   <span className="archive-world-hotspot__caption">{{origins:'As origens',library:'Biblioteca',collections:'Coleções'}[id]}<span aria-hidden="true">↗</span></span>
  </button>
 </Html>;
}
function ReceivingFocusVisibility({motion,active,focused,onFocus,button}){
 useFrame(()=>{
  const visible=active&&clamp(motion.progress)<.67;
  if(button.current){button.current.hidden=!visible;button.current.inert=!visible;}
  if(!visible&&focused)onFocus(false);
 });
 return null;
}
function Director({motion,onReady,reduced,focused}){
 const inspect=useMemo(()=>import.meta.env.DEV?new URLSearchParams(window.location.search).get('inspect'):null,[]);
 const {camera,size,gl}=useThree(),ready=useRef(false),focusBlend=useRef(0),overlayHidden=useRef(false),previous=useRef({p:-1,width:0,height:0,reduced:null});
 useEffect(()=>()=>gl.domElement.closest('.harvard-journey')?.classList.remove('has-receiving-focus'),[gl]);
 const vectors=useMemo(()=>({target:new THREE.Vector3(),base:new THREE.Vector3(),direction:new THREE.Vector3(),right:new THREE.Vector3(),screenUp:new THREE.Vector3(),offset:new THREE.Vector3(),up:new THREE.Vector3(0,0,-1),entry:new THREE.Vector3(4.23,1.65,-2.18),receivingPosition:new THREE.Vector3(),receivingTarget:new THREE.Vector3(9.4,1.2,-2.1),corners:[-6.9,12.8].flatMap(x=>[-.9,5.2].flatMap(y=>[-5.5,9.45].map(z=>new THREE.Vector3(x,y,z)))),path:new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(10,11,9),new THREE.Vector3(6.1,6,-.2),new THREE.Vector3(4.3,3.6,-1.6),new THREE.Vector3(4.23,2.4,-2.18),new THREE.Vector3(4.23,1.72,-2.18)],false,'centripetal')}),[]);
 useFrame((_,dt)=>{
  const p=clamp(motion.progress),portrait=size.width/size.height<1.1;
  const goal=focused&&p<.67?1:0;
  focusBlend.current=reduced?goal:THREE.MathUtils.damp(focusBlend.current,goal,4,Math.min(dt,.1));
  if(Math.abs(focusBlend.current-goal)<.001)focusBlend.current=goal;
  const blend=focusBlend.current,hide=goal>0||blend>.02;
  if(overlayHidden.current!==hide){overlayHidden.current=hide;gl.domElement.closest('.harvard-journey')?.classList.toggle('has-receiving-focus',hide);}
  const last=previous.current;if(last.p===p&&last.width===size.width&&last.height===size.height&&last.reduced===reduced&&last.blend===blend)return;
  Object.assign(last,{p,width:size.width,height:size.height,reduced,blend});
  // Development-only inspection uses the actual live receiving scene, without
  // altering the production camera or the operation's shared clock.
  if(inspect==='receiving'){
   camera.position.set(16,9.5,10.5);camera.up.set(0,1,0);camera.lookAt(9.4,1.2,-2.1);
   camera.fov=32;camera.zoom=1;camera.near=.1;camera.far=100;camera.updateProjectionMatrix();
   gl.domElement.dataset.worldInspect='receiving';
   if(!ready.current){ready.current=true;onReady?.();}return;
  }
  // A long-lens establishing view keeps the approved isometric composition.
  // The last part is a perspective dolly through the actual open drawer.
  const overview=Math.min(p,.66),angle=THREE.MathUtils.lerp(.72,.54,smooth(overview,.12,.66));
  const {target,base,direction,right,screenUp,offset,corners,path,entry,up}=vectors;
  target.set(portrait?2.35:2.45,1.1,1.75);
  direction.set(Math.sin(angle)*22,17.8,Math.cos(angle)*22).normalize();
  right.set(direction.z,0,-direction.x).normalize();screenUp.crossVectors(direction,right).normalize();
  const tangent=Math.tan(THREE.MathUtils.degToRad(9)),aspect=size.width/Math.max(1,size.height);
  let distance=0;
  // Fit the whole joined maquette, including its receiving bay and service
  // street, rather than reusing the dimensions of the former square base.
  for(const corner of corners){offset.subVectors(corner,target);const depth=offset.dot(direction);distance=Math.max(distance,depth+Math.abs(offset.dot(right))/(tangent*aspect),depth+Math.abs(offset.dot(screenUp))/tangent);}
  distance*=portrait?1.055:1.045;
  base.copy(direction).multiplyScalar(distance).add(target);
  const dive=reduced?0:smooth(p,.67,1);
  camera.fov=THREE.MathUtils.lerp(18,43,smooth(dive,0,.68));camera.up.set(0,1,0).lerp(up,smooth(dive,.25,.83)).normalize();
  if(dive>0){path.points[0].copy(base);path.getPoint(dive,camera.position);target.lerp(entry,smooth(dive,0,.70));}
  else camera.position.copy(base);
  if(blend>0){
   const {receivingPosition,receivingTarget}=vectors;
   // A close live perspective on the scanner, its loading side and the rack.
   // Portrait moves back along the same sightline to retain the whole station.
   receivingPosition.set(6.6,8.3,12.6).multiplyScalar(Math.max(1,.90/Math.max(.25,aspect))).add(receivingTarget);
   camera.position.lerp(receivingPosition,blend);target.lerp(receivingTarget,blend);
   camera.fov=THREE.MathUtils.lerp(camera.fov,32,blend);camera.up.lerp(new THREE.Vector3(0,1,0),blend).normalize();
  }
  gl.domElement.dataset.worldFocus=blend>.01?'receiving':'atelier';
  gl.domElement.dataset.worldFocusBlend=blend.toFixed(3);
  // Keep depth precision high in the overview. A permanently tiny near plane
  // makes distant parquet, paper and trim fight for the same depth values.
  camera.near=Math.max(.004,Math.min(.8,camera.position.distanceTo(target)*.025));
  camera.far=Math.max(50,camera.position.length()+45);
  camera.lookAt(target);camera.zoom=1;
  camera.updateProjectionMatrix();
  gl.domElement.dataset.worldDive=dive.toFixed(4);
  gl.domElement.dataset.worldCameraY=camera.position.y.toFixed(4);
  if(!ready.current){ready.current=true;onReady?.();}
 });return null;
}
function PlacedObjects({motion,children}){
 const ref=useRef();
 useFrame(()=>{const f=smooth(clamp(motion.progress),.14,.41);ref.current.position.y=(1-f)*.65;ref.current.scale.setScalar(1);});
 return <group ref={ref}>{children}</group>;
}
function RenderMetrics({active}){
 const {gl}=useThree(),stats=useRef({elapsed:0,frames:0,index:0,samples:[]});
 useEffect(()=>{const previous=gl.info.autoReset;gl.info.autoReset=false;return()=>{gl.info.autoReset=previous;};},[gl]);
 useFrame((_,dt)=>{
  if(active){
   const s=stats.current;s.elapsed+=dt;s.frames++;s.samples[s.index++%180]=dt*1000;
   if(s.elapsed>.8){
    const sorted=[...s.samples].sort((a,b)=>a-b);
    Object.assign(gl.domElement.dataset,{worldFps:(s.frames/s.elapsed).toFixed(1),worldFrameP95Ms:sorted[Math.floor((sorted.length-1)*.95)].toFixed(2),worldDrawCalls:String(gl.info.render.calls),worldTriangles:String(gl.info.render.triangles),worldTextures:String(gl.info.memory.textures),worldGeometries:String(gl.info.memory.geometries),worldRenderPixels:String(gl.domElement.width*gl.domElement.height)});
    s.elapsed=0;s.frames=0;
   }
  }
  gl.info.reset();
 },2);
 return null;
}

function AtelierStudioLight({quality}){
 const aim=useMemo(()=>{const target=new THREE.Object3D();target.position.set(2.5,.5,1.0);return target;},[]);
 const shadowSize=quality==='cinema'?4096:quality==='auto'?1536:2048;
 return <>
  <primitive object={aim}/>
  <ambientLight intensity={.06}/><hemisphereLight args={['#f5f7ff','#9ca7af',.52]}/>
  <directionalLight position={[-7,17,12]} target={aim} intensity={2.4} color="#fffdf6" castShadow shadow-mapSize={[shadowSize,shadowSize]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={13.5} shadow-camera-bottom={-13.5} shadow-camera-near={1} shadow-camera-far={55} shadow-normalBias={.014} shadow-bias={-.000045} shadow-radius={4}/>
  <directionalLight position={[10,8,-8]} target={aim} intensity={.64} color="#dce7ff"/>
  <Environment resolution={quality==='auto'?128:256} frames={1} environmentIntensity={.88}>
   <Lightformer form="rect" intensity={2.6} color="#fffefa" position={[-2,10,5]} rotation={[-Math.PI/2,0,0]} scale={[15,9,1]}/>
   <Lightformer form="rect" intensity={2.3} position={[-10,5,6]} rotation={[0,Math.PI/2,0]} scale={[3,8,1]}/>
   <Lightformer form="rect" intensity={2.8} color="#e5edff" position={[14,5,-5]} rotation={[0,-Math.PI/3,0]} scale={[2,9,1]}/>
   <Lightformer form="rect" intensity={1.1} color="#ffffff" position={[4,3,14]} rotation={[0,Math.PI,0]} scale={[12,1.2,1]}/>
  </Environment>
 </>;
}

function Scene({motion,reduced,paused,active,onReady,onSelect,quality,focused,onFocus,focusButton}){
 const {gl}=useThree();
 const qa=useMemo(()=>import.meta.env.DEV?new URLSearchParams(window.location.search):null,[]);
 const time=useRef(Math.max(0,Number(qa?.get('worldTime'))||0)),assets=useMemo(materialAssets,[]);
 useEffect(()=>()=>{Object.values(assets.mats).forEach(m=>m.dispose());assets.textures.forEach(t=>t.dispose());assets.box.dispose();assets.cylinder.dispose();assets.sphere.dispose();},[assets]);
 useFrame((_,dt)=>{if(active&&!paused&&!reduced&&qa?.get('freezeScene')!=='1')time.current+=Math.min(dt,.05);gl.domElement.dataset.worldProgress=clamp(motion.progress).toFixed(4);gl.domElement.dataset.worldTime=time.current.toFixed(4);gl.domElement.dataset.worldPaused=String(paused||reduced);gl.domElement.dataset.worldActorCount=String(Number(gl.domElement.dataset.worldScholarCount||15)+8);},-100);
 return <>
  <color attach="background" args={['#f5f4ef']}/>
  <AtelierStudioLight quality={quality}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.91,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#f5f4ef" roughness={.82}/></mesh>
  <AtelierPlinth assets={assets}/>
  <ConstructedWorld motion={motion} assets={assets}/>
  <ReceivingArchitecture assets={assets}/>
  <ArchiveWarehouseHandling time={time}/>
  <ArchiveStreets assets={assets} time={time}/>
  <Cube p={[0,.05,4.57]} s={[11.85,.09,.59]} mat={assets.mats.ivory}/>
  <Cube p={[0,.101,4.84]} s={[11.85,.02,.025]} mat={assets.mats.gold}/>
  <PhotoFinish assets={assets}/>
  <ImportedTableFinish/>
  <PlacedObjects motion={motion}><ArchiveCollectionModels time={time}/><ArchiveDeskDetails assets={assets}/>
  <Suspense fallback={null}><ReadyArchiveTable position={[1.7,.095,.5]} width={1.5} depth={.65} height={.90}/><ReadyArchiveTable position={[-2.75,.095,.6]} width={3.5} depth={1.55} height={1.135}/><ReadyArchiveTable position={[3.5,.095,-1.2]} width={3} depth={1.45} height={1.025}/></Suspense>
  <OpenFolio assets={assets} time={time}/><ArchiveMotion assets={assets} time={time} motion={motion}/>
  <Suspense fallback={null}><ImportedTree time={time} position={[4.9,.095,3.8]} height={2.2}/></Suspense>
  <Cube p={[4.65,.38,2.75]} s={[1.3,.58,1.3]} mat={assets.mats.stone}/><Cube p={[4.65,.69,2.75]} s={[1.33,.025,1.33]} mat={assets.mats.gold}/><Globe assets={assets} time={time}/>
  <ArchiveScholars assets={assets} time={time}/><ArchivePress assets={assets} time={time}/>
  <ArchiveKinetics time={time} materials={assets.mats} reduced={reduced}/></PlacedObjects>
  <ArchiveCourier assets={assets} time={time}/><ArchiveStreetPorter assets={assets} time={time}/><ArchiveGroundLogistics assets={assets} time={time}/>
  <ArchiveKnowledgeEngine assets={assets} time={time} position={[8.5,3.7,-4.55]}/>
  <Plaque position={[-1.24,4.64,-3.97]} title="O ATELIÊ DE IDEIAS" subtitle="HARVARD · UM MUNDO DE POSSIBILIDADES" width={4.0}/>
  <Plaque position={[0,-.52,5.287]} title="VERITAS" subtitle="UM ARQUIVO VIVO · 1636" width={2.5}/>
  <ArchiveHotspot focused={focused} motion={motion} position={[-4.6,4.7,-3.1]} id="origins" kicker="01 / AS ORIGENS" name="O começo de uma ideia" onSelect={onSelect}/>
  <ArchiveHotspot focused={focused} motion={motion} position={[-3.9,.22,3.9]} id="library" kicker="02 / A BIBLIOTECA" name="Abra o conhecimento" onSelect={onSelect}/>
  <ArchiveHotspot focused={focused} motion={motion} position={[4.3,3.8,-2.2]} id="collections" kicker="03 / AS COLEÇÕES" name="Histórias para descobrir" onSelect={onSelect}/>
  <Director motion={motion} onReady={onReady} reduced={reduced} focused={focused}/>
  <ReceivingFocusVisibility motion={motion} active={active} focused={focused} onFocus={onFocus} button={focusButton}/>
  <EffectComposer multisampling={quality==='cinema'?4:quality==='auto'?0:2} enableNormalPass={false}>
   <N8AO aoRadius={.34} intensity={1.25} distanceFalloff={1.6} quality={quality==='cinema'?'high':quality==='auto'?'low':'medium'} halfRes color="#343235"/>
   <Bloom luminanceThreshold={1.65} intensity={.10} mipmapBlur/>
  </EffectComposer>
  <RenderMetrics active={active}/>
 </>;
}

export default function HarvardArchiveWorld({motion=EMPTY_MOTION,quality='high',reduced=false,paused=false,active=true,onReady,onSelect}){
 const profile=useViewportRenderQuality(quality),[focused,setFocused]=useState(false),focusButton=useRef();
 return <div className="archive-world-canvas-stage" onKeyDown={event=>{if(event.key==='Escape'&&focused){event.preventDefault();setFocused(false);}}}><Canvas shadows={{type:THREE.PCFSoftShadowMap}} dpr={profile.dpr} frameloop={active?'always':'demand'} camera={{position:[30,34,34],fov:18,near:.006,far:250}} gl={{antialias:false,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=.88;gl.transmissionResolutionScale=.35;gl.setClearColor('#f5f4ef',1);}} style={{width:'100%',height:'100%',touchAction:'pan-y'}}>
  <Scene motion={motion} reduced={reduced} paused={paused} active={active} onReady={onReady} onSelect={onSelect} quality={quality} focused={focused} onFocus={setFocused} focusButton={focusButton}/>
 </Canvas>
 <button ref={focusButton} className="archive-receiving-focus" type="button" aria-pressed={focused} onClick={()=>setFocused(value=>!value)}>
  <span aria-hidden="true">{focused?'↙':'⌗'}</span>{focused?'Voltar ao ateliê':'Ver o scanner 3D'}<span aria-hidden="true">{focused?'':'↗'}</span>
 </button></div>;
}
