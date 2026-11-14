import React,{useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Html,RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {useViewportRenderQuality} from './RenderQuality';

/* An authored architectural illustration of Harvard Yard. Building positions
 * follow the relationships in Harvard's visitor map; dimensions are composed
 * for this atlas rather than presented as a cadastral / photogrammetric survey.
 * https://www.harvard.edu/visit/maps-directions/
 * https://college.harvard.edu/sites/default/files/2021-06/admissions_office_map_edited_5.13.20.pdf
 */
const C={brick:'#a56249',brickDark:'#754534',brickLight:'#b77455',stone:'#e7ddc6',stoneDark:'#c6b99e',roof:'#5c625c',copper:'#697c73',glass:'#3c514f',windowLight:'#acb5a2',grass:'#819173',grassLight:'#97a184',path:'#d9cbb3',road:'#717570',gold:'#a88343',bark:'#625342',leaf:'#64785a'};
const clamp=n=>THREE.MathUtils.clamp(n,0,1);
const ease=(n,a=0,b=1)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
function seedRandom(seed=1636){return()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};}
const _dummy=new THREE.Object3D();
function transform(position,scale,rotation=[0,0,0],color){return{position,scale,rotation,color};}

function buildCampus(){
 const boxes={},columns=[],roofs=[];
 const add=(mat,p,s,r=[0,0,0],color)=>{(boxes[mat]??=[]).push(transform(p,s,r,color));};
 const cylinder=(p,s,color=C.stone)=>columns.push(transform(p,s,[0,0,0],color));
 const roof=(p,w,d,h,color=C.roof,rotation=0)=>roofs.push({p,w,d,h,color,rotation});
 function local(origin,rotation,p){const c=Math.cos(rotation),s=Math.sin(rotation);return[origin[0]+p[0]*c+p[2]*s,p[1],origin[2]-p[0]*s+p[2]*c];}
 function building({x,z,w,d,h,rotation=0,mat='brick',gable=1.7,roofColor=C.roof,stories=3,bays=5,chimneys=true}){
  const o=[x,0,z],box=(m,p,s)=>add(m,local(o,rotation,p),s,[0,rotation,0]);
  box(mat,[0,h/2+.22,0],[w,h,d]);
  box('stoneDark',[0,.23,0],[w+.3,.45,d+.28]);
  box('stone',[0,h+.24,0],[w+.5,.28,d+.5]);
  box('stoneDark',[0,h+.08,0],[w+.26,.13,d+.26]);
  roof([x,h+.4,z],w+.5,d+.5,gable,roofColor,rotation);
  // Window openings, reveals and sash form one instanced batch per material.
  for(const side of[-1,1])for(let row=0;row<stories;row++)for(let col=0;col<bays;col++){
   const wx=(col-(bays-1)/2)*w/(bays+.2),wy=.9+row*(h-.9)/stories;
   const ww=Math.min(.65,w/(bays*1.8)),wh=Math.min(1.2,(h-.8)/stories*.62),sz=side*(d/2+.025);
   box('stoneDark',[wx,wy+wh*.35,sz],[ww+.18,wh+.22,.10]);
   box('glass',[wx,wy+wh*.35,sz+side*.06],[ww,wh,.055]);
   box('stone',[wx,wy+wh*.35,sz+side*.095],[.045,wh,.025]);
   box('stone',[wx,wy+wh*.35,sz+side*.095],[ww,.045,.025]);
   box('stone',[wx,wy-wh*.15-.1,sz+side*.09],[ww+.25,.10,.17]);
  }
  // Return elevations are visible during the orbit too.
  const endBays=Math.max(2,Math.round(d/1.8));
  for(const side of[-1,1])for(let row=0;row<stories;row++)for(let col=0;col<endBays;col++){
   const zz=(col-(endBays-1)/2)*d/(endBays+.3),wy=1.05+row*(h-.9)/stories,wh=Math.min(1.1,(h-.8)/stories*.62),xx=side*(w/2+.055);
   box('stoneDark',[xx,wy+.25,zz],[.08,wh+.17,.69]);box('glass',[xx+side*.05,wy+.25,zz],[.04,wh,.53]);box('stone',[xx+side*.08,wy+.25,zz],[.025,.04,.53]);
  }
  for(const side of[-1,1]){
   box('stone',[0,1.05,side*(d/2+.12)],[.85,1.6,.16]);box('door',[0,.99,side*(d/2+.22)],[.60,1.37,.08]);box('gold',[.15,1.0,side*(d/2+.275)],[.035,.16,.025]);
  }
  if(chimneys)for(const xx of[-w*.36,w*.36]){box(mat,[xx,h+gable+.25,0],[.64,1.2,.68]);box('stone',[xx,h+gable+.9,0],[.85,.16,.85]);}
  return box;
 }

 // Widener anchors the southern edge of the Yard, its colonnade facing inward.
 const widener=building({x:7.5,z:13,w:15,d:7,h:6.7,gable:.3,stories:3,bays:10,chimneys:false});
 widener('stone',[0,7.2,-3.65],[15.7,.60,1.5]);widener('stoneDark',[0,6.85,-3.72],[15.4,.13,1.58]);
 for(let i=0;i<12;i++){
  const x=7.5+(i-5.5)*1.04,z=8.5;
  cylinder([x,3.84,z],[.25,5.6,.25]);
  cylinder([x,.96,z],[.36,.22,.36]);cylinder([x,1.12,z],[.30,.17,.30]);
  add('stone',[x,6.72,z],[.76,.29,.76]);add('stoneDark',[x,6.5,z],[.60,.18,.60]);
 }
 for(let i=0;i<7;i++)add('stone',[7.5,.11+i*.105,7.1+i*.24],[15.5-i*.25,.22,2.5-i*.20]);
 add('stone',[7.5,7.1,8.45],[14.6,.55,2.25]);add('stoneDark',[7.5,7.45,8.45],[15,.16,2.5]);
 for(let i=0;i<24;i++)add('stoneDark',[.3+i*.625,6.76,7.33],[.14,.16,.18]);
 // Layered roof parapets and the two slightly lower reading-room wings.
 for(const side of[-1,1]){
  add('brick',[7.5+side*6.1,6.9,13],[2.6,.65,6.8]);
  add('stone',[7.5+side*6.1,7.28,13],[2.9,.17,7.1]);
 }
 add('stone',[7.5,6.7,7.25],[5.5,.18,.12]);

 // University Hall: pale granite, deep central door and balanced Georgian form.
 const university=building({x:-4,z:0,w:10.6,d:3.3,h:4.6,rotation:Math.PI/2,mat:'stone',gable:1.55,stories:2,bays:7});
 for(let i=0;i<6;i++)university('stoneDark',[(i-2.5)*1.67,2.35,-1.69],[.10,4.0,.10]);
 // Small John Harvard memorial on the western side; an illustrative silhouette.
 add('stoneDark',[-7.1,.43,.6],[.65,.85,.67]);cylinder([-7.1,1.15,.6],[.15,.7,.15],C.gold);

 // Memorial Hall north of Cambridge Street: red brick, steep roof and clock tower.
 const memorial=building({x:13,z:-18.6,w:15,d:5.1,h:4.8,gable:3.5,roofColor:C.roof,stories:2,bays:10,chimneys:false});
 for(const xx of[-6,-3,0,3,6]){memorial('stoneDark',[xx,2.5,-2.65],[.24,4.8,.45]);memorial('stoneDark',[xx,2.5,2.65],[.24,4.8,.45]);}
 add('brickDark',[14,7.1,-18.6],[2.65,13.8,3]);add('stoneDark',[14,11.4,-18.6],[3,.3,3.35]);
 add('stone',[14,13.5,-18.6],[3.1,.45,3.4]);add('brick',[14,14.2,-18.6],[2.3,1.1,2.65]);
 roof([14,14.7,-18.6],3.2,3.55,2.7,C.copper);
 for(const sx of[-1,1])for(const sz of[-1,1]){
  add('stone',[14+sx*1.12,14,-18.6+sz*1.3],[.25,2.4,.25]);
  cylinder([14+sx*1.12,15.4,-18.6+sz*1.3],[.21,.45,.21]);
 }
 for(const y of[6.5,8.8])for(const sx of[-1,1])add('glass',[14+sx*.53,y,-17.06],[.42,1.45,.07]);
 // University Church opposite Widener, with its tall ivory spire.
 building({x:6.8,z:-7.2,w:4.8,d:7.4,h:3.5,gable:2.1,mat:'brickLight',stories:1,bays:4,chimneys:false});
 add('stone',[6.8,4.7,-4.2],[1.6,5.3,1.65]);add('stoneDark',[6.8,7.4,-4.2],[2,.22,2]);
 add('stone',[6.8,8.4,-4.2],[1.25,1.8,1.25]);add('stoneDark',[6.8,9.4,-4.2],[1.65,.22,1.65]);
 for(const side of[-1,1]){add('glass',[6.8+side*.635,8.4,-4.2],[.035,1.1,.65]);add('glass',[6.8,8.4,-4.2+side*.635],[.65,1.1,.035]);}
 cylinder([6.8,9.65,-4.2],[.72,.35,.72]);

 // Residential / teaching edges make the Yard an inhabited ensemble.
 building({x:17,z:1,w:6.8,d:7.7,h:5.6,gable:3.1,mat:'brickDark',stories:3,bays:5,chimneys:false}); // Sever
 building({x:-16,z:11,w:7.9,d:3.7,h:4.35,gable:1.9,stories:3,bays:6}); // Massachusetts Hall
 building({x:-16,z:2,w:6.5,d:4.2,h:4.8,gable:1.8,stories:3,bays:5}); // Harvard Hall
 building({x:-17,z:-7,w:6.9,d:3.8,h:4.3,gable:1.7,stories:3,bays:5}); // Hollis
 building({x:-9,z:-9,w:8,d:3.6,h:4.6,gable:1.6,stories:3,bays:6});
 building({x:-1,z:-9.4,w:6.8,d:3.5,h:4.6,gable:1.6,stories:3,bays:5});
 building({x:21,z:14,w:6,d:4.2,h:4.3,gable:1.6,stories:3,bays:4});
 building({x:-5,z:22,w:13.5,d:3.1,h:4.4,gable:1.6,stories:3,bays:10});
 // Smaller boundary façades create depth without inventing named landmarks.
 for(let i=0;i<4;i++)building({x:-21+i*6.3,z:-25.5,w:4.7,d:3.3,h:3.4+(i%2)*.6,gable:1.4,stories:2,bays:3,chimneys:false});
 return{boxes,columns,roofs};
}

function brickTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const c=canvas.getContext('2d');c.fillStyle='#b0a08a';c.fillRect(0,0,512,512);
 const random=seedRandom(1907),bw=64,bh=24;
 for(let y=-1;y<23;y++)for(let x=-1;x<10;x++){
  const v=Math.round(112+random()*38),r=Math.round(v*1.18),g=Math.round(v*.89),b=Math.round(v*.73);
  c.fillStyle=`rgb(${r},${g},${b})`;c.fillRect(x*bw+(y%2?bw/2:0)+1,y*bh+1,bw-2,bh-2);
  c.fillStyle='rgba(255,237,209,.08)';c.fillRect(x*bw+(y%2?bw/2:0)+2,y*bh+2,bw-4,1);
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,1.3);texture.anisotropy=4;return texture;
}
function Instances({items,geometry,material,castShadow=true,receiveShadow=true}){
 const ref=useRef();
 useEffect(()=>{
  if(!ref.current)return;
  items.forEach((part,i)=>{
   _dummy.position.set(...part.position);_dummy.rotation.set(...part.rotation);_dummy.scale.set(...part.scale);_dummy.updateMatrix();ref.current.setMatrixAt(i,_dummy.matrix);
   if(part.color)ref.current.setColorAt(i,new THREE.Color(part.color));
  });ref.current.instanceMatrix.needsUpdate=true;if(ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;
  ref.current.computeBoundingSphere();
 },[items]);
 return <instancedMesh ref={ref} args={[geometry,material,items.length]} castShadow={castShadow} receiveShadow={receiveShadow} frustumCulled={false}/>;
}
function roofGeometry(w,d,h){
 const p=[-w/2,0,-d/2,w/2,0,-d/2,-w/2,h,0,w/2,h,0,-w/2,0,d/2,w/2,0,d/2];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex([0,2,3,0,3,1,2,4,5,2,5,3,0,1,5,0,5,4,0,4,2,1,3,5]);g.computeVertexNormals();return g;
}
function Architecture({motion}){
 const ref=useRef(),data=useMemo(buildCampus,[]);
 const assets=useMemo(()=>{
  const brick=brickTexture(),box=new THREE.BoxGeometry(1,1,1),column=new THREE.CylinderGeometry(1,.97,1,20);
  const mats=Object.fromEntries(Object.entries(C).map(([key,color])=>[key,new THREE.MeshStandardMaterial({color,roughness:key==='glass'?.22:key==='gold'?.32:.86,metalness:key==='gold'?.65:key==='glass'?.18:0,map:key.startsWith('brick')?brick:null})]));
  mats.door=new THREE.MeshStandardMaterial({color:'#35473c',roughness:.65});
  return{box,column,mats,brick};
 },[]);
 useEffect(()=>()=>{assets.box.dispose();assets.column.dispose();assets.brick.dispose();Object.values(assets.mats).forEach(m=>m.dispose());},[assets]);
 useFrame(()=>{if(ref.current){const rise=ease(motion.progress,0,.11);ref.current.position.y=-6*(1-rise);ref.current.scale.y=.30+.70*rise;}});
 return <group ref={ref}>{Object.entries(data.boxes).map(([mat,items])=><Instances key={mat} items={items} geometry={assets.box} material={assets.mats[mat]}/>)}<Instances items={data.columns} geometry={assets.column} material={assets.mats.stone}/>{data.roofs.map((r,i)=><Roof key={i} {...r}/>)}<mesh position={[6.8,11.55,-4.2]} castShadow><coneGeometry args={[.72,3.7,8]}/><meshStandardMaterial color={C.stone} roughness={.8}/></mesh><Clock position={[14,11.95,-17.066]}/><Clock position={[15.34,11.95,-18.6]} rotation={[0,Math.PI/2,0]}/></group>;
}
function Roof({p,w,d,h,color,rotation}){
 const geometry=useMemo(()=>roofGeometry(w,d,h),[w,d,h]);useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} position={p} rotation-y={rotation} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.79}/></mesh>;
}
function Clock({position,rotation}){
 const texture=useMemo(()=>{
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
  x.fillStyle='#d2c8ad';x.beginPath();x.arc(128,128,123,0,Math.PI*2);x.fill();x.strokeStyle='#756547';x.lineWidth=8;x.stroke();
  for(let i=0;i<12;i++){const a=i*Math.PI/6;x.save();x.translate(128,128);x.rotate(a);x.fillStyle='#514936';x.fillRect(-2,-103,4,11);x.restore();}
  x.strokeStyle='#4b4535';x.lineWidth=5;x.lineCap='round';x.beginPath();x.moveTo(128,128);x.lineTo(100,89);x.moveTo(128,128);x.lineTo(165,113);x.stroke();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
 },[]);useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={position} rotation={rotation}><circleGeometry args={[.59,32]}/><meshStandardMaterial map={texture} roughness={.85}/></mesh>;
}

function Path({points,width=.85,color=C.path}){
 const geometry=useMemo(()=>{
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],.092,p[1])),false,'centripetal');
  const pts=curve.getPoints(90),vertices=[],indices=[];
  for(let i=0;i<pts.length;i++){const prev=pts[Math.max(0,i-1)],next=pts[Math.min(pts.length-1,i+1)],dx=next.x-prev.x,dz=next.z-prev.z,n=Math.hypot(dx,dz)||1;vertices.push(pts[i].x-dz/n*width/2,.10,pts[i].z+dx/n*width/2,pts[i].x+dz/n*width/2,.10,pts[i].z-dx/n*width/2);if(i<pts.length-1){const b=i*2;indices.push(b,b+2,b+1,b+1,b+2,b+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
 },[points,width]);useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color={color} roughness={1} side={THREE.DoubleSide}/></mesh>;
}
const PATHS=[
 [[-25,7],[-15,7],[-7,6],[0,5],[7.5,5],[7.5,8]],
 [[-24,-10],[-13,-10],[-6,-9],[1,-10],[7,-11],[14,-11],[22,-11]],
 [[-10,19],[-9,12],[-9,5],[-9,-3],[-7,-10],[-6,-19]],
 [[1,19],[1,13],[1,5],[1,-1],[1,-8],[1,-18]],
 [[22,19],[22,11],[22,3],[22,-6],[21,-11],[19,-21]],
 [[-9,5],[-4,7],[1,5],[5,0],[8,-2]],
 [[-9,-10],[-4,-6],[1,-3],[8,1],[16,4],[22,7]],
 [[-18,18],[-9,18],[1,18],[7.5,18],[16,18],[25,18]],
];
function SiteGround(){
 const box=useMemo(()=>new THREE.BoxGeometry(1,1,1),[]),mat=useMemo(()=>new THREE.MeshStandardMaterial({color:C.stone,roughness:.95}),[]);
 const streetMarks=useMemo(()=>{
  const a=[];for(let x=-27;x<29;x+=2.6)a.push(transform([x,.14,-13],[1.1,.015,.055]));for(let z=-19;z<27;z+=2.6)a.push(transform([-28.5,.14,z],[.055,.015,1.1]));return a;
 },[]);useEffect(()=>()=>{box.dispose();mat.dispose();},[box,mat]);
 return <>
  <RoundedBox args={[65,1.1,59]} radius={.65} smoothness={3} position={[-1,-.65,0]} receiveShadow><meshStandardMaterial color="#d2c8b3" roughness={.9}/></RoundedBox>
  <RoundedBox args={[64.8,.21,58.8]} radius={.45} smoothness={3} position={[-1,-.05,0]} receiveShadow><meshStandardMaterial color="#dcd4c2" roughness={.95}/></RoundedBox>
  <RoundedBox args={[56,.055,50]} radius={1.1} smoothness={3} position={[.4,.071,1]} receiveShadow><meshStandardMaterial color={C.grass} roughness={1}/></RoundedBox>
  <mesh position={[.3,.095,-13]} receiveShadow><boxGeometry args={[63,.04,3.4]}/><meshStandardMaterial color={C.road} roughness={1}/></mesh>
  <mesh position={[-28.5,.095,1.2]} receiveShadow><boxGeometry args={[3.4,.04,51.4]}/><meshStandardMaterial color={C.road} roughness={1}/></mesh>
  <mesh position={[.4,.105,-11]}><boxGeometry args={[60,.04,.42]}/><meshStandardMaterial color="#c7bea9" roughness={1}/></mesh>
  <mesh position={[-26.5,.105,1]}><boxGeometry args={[.42,.04,49]}/><meshStandardMaterial color="#c7bea9" roughness={1}/></mesh>
  <Instances items={streetMarks} geometry={box} material={mat} castShadow={false}/>
  {PATHS.map((p,i)=><Path key={i} points={p} width={i===0?1.25:.85}/>)}
  <mesh rotation-x={-Math.PI/2} position={[-3,-1.3,1]} receiveShadow><planeGeometry args={[200,200]}/><shadowMaterial transparent opacity={.13}/></mesh>
 </>;
}

function Trees({motion,reduced,paused}){
 const trunks=useRef(),canopies=useRef(),time=useRef(0);
 const trees=useMemo(()=>{
  const rand=seedRandom(1820),out=[];
  // Paired historic Yard alleys keep the labelled landmarks clear.
  for(let z=-13;z<=15;z+=4.4)for(const x of[-11.2,-1.5,11.5,24]){
   if(x===11.5&&z<-5)continue;
   out.push({x:x+(rand()-.5)*1.1,z:z+(rand()-.5)*1.2,h:2.2+rand()*1.4,r:1.1+rand()*.55,phase:rand()*6.28,color:new THREE.Color().setHSL(.22+rand()*.035,.16+rand()*.12,.31+rand()*.10)});
  }
  for(let x=-22;x<25;x+=4.1)out.push({x,z:-19.2,h:2.4+rand(),r:1.15+rand()*.2,phase:rand()*6.28,color:new THREE.Color('#657953')});
  for(let x=-21;x<26;x+=4.7)out.push({x,z:26,h:2.3+rand(),r:1+rand()*.3,phase:rand()*6.28,color:new THREE.Color('#73825d')});
  return out;
 },[]);
 useEffect(()=>{trees.forEach((t,i)=>{_dummy.position.set(t.x,t.h*.48+.1,t.z);_dummy.rotation.set(0,0,0);_dummy.scale.set(.14,t.h,.14);_dummy.updateMatrix();trunks.current.setMatrixAt(i,_dummy.matrix);for(let j=0;j<3;j++)canopies.current.setColorAt(i*3+j,t.color);});trunks.current.instanceMatrix.needsUpdate=true;canopies.current.instanceColor.needsUpdate=true;},[trees]);
 useFrame((_,dt)=>{
  if(!reduced&&!paused)time.current+=Math.min(dt,.05);
  const growth=.5+.5*ease(motion.progress,0,.13);
  trees.forEach((t,i)=>{for(let j=0;j<3;j++){
   const angle=t.phase+j*2.1,wind=reduced?0:Math.sin(time.current*.55+t.phase)*.045;
   _dummy.position.set(t.x+Math.sin(angle)*t.r*.38+wind,t.h+1+j*.12,t.z+Math.cos(angle)*t.r*.38);
   _dummy.rotation.set(wind*.4,angle,wind*.2);_dummy.scale.set(t.r*growth,t.r*(1.0+j*.12)*growth,t.r*.9*growth);_dummy.updateMatrix();canopies.current.setMatrixAt(i*3+j,_dummy.matrix);
  }});canopies.current.instanceMatrix.needsUpdate=true;
 });
 return <><instancedMesh ref={trunks} args={[null,null,trees.length]} castShadow receiveShadow frustumCulled={false}><cylinderGeometry args={[.75,1,1,7]}/><meshStandardMaterial color={C.bark} roughness={1}/></instancedMesh><instancedMesh ref={canopies} args={[null,null,trees.length*3]} castShadow receiveShadow frustumCulled={false}><icosahedronGeometry args={[1,2]}/><meshStandardMaterial roughness={1}/></instancedMesh></>;
}

function Traffic({reduced,paused}){
 const body=useRef(),glass=useRef(),wheels=useRef(),people=useRef(),heads=useRef(),time=useRef(0);
 const carCount=5,personCount=22;
 const carColors=['#e6dccb','#525f55','#983f3b','#bdab8b','#6a7d84'];
 const matrix=new THREE.Matrix4(),local=new THREE.Matrix4(),rotation=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3();
 useEffect(()=>{for(let i=0;i<carCount;i++)for(let j=0;j<3;j++)body.current.setColorAt(i*3+j,new THREE.Color(carColors[i]));body.current.instanceColor.needsUpdate=true;for(let i=0;i<personCount;i++)people.current.setColorAt(i,new THREE.Color(i%4===0?'#874b44':i%3===0?'#c9ba99':'#485a4d'));people.current.instanceColor.needsUpdate=true;},[]);
 useFrame((_,dt)=>{
  if(!reduced&&!paused)time.current+=Math.min(dt,.05);
  function part(ref,index,px,py,pz,sx,sy,sz,carMatrix){_dummy.position.set(px,py,pz);_dummy.rotation.set(0,0,0);_dummy.scale.set(sx,sy,sz);_dummy.updateMatrix();local.multiplyMatrices(carMatrix,_dummy.matrix);ref.current.setMatrixAt(index,local);}
  for(let i=0;i<carCount;i++){
   const north=i<3,direction=i%2?1:-1,travel=((time.current*(1.7+i*.06)+i*15)%60)-30;
   position.set(north?travel:-28.5+(direction===1?.75:-.75),.15,north?-13+(direction===1?.75:-.75):travel*.78);
   rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),north?(direction===1?Math.PI/2:-Math.PI/2):(direction===1?0:Math.PI));matrix.compose(position,rotation,scale.set(1,1,1));
   part(body,i*3,0,.30,0,.76,.30,1.48,matrix);part(body,i*3+1,0,.51,-.04,.66,.26,.78,matrix);part(body,i*3+2,0,.30,-.77,.72,.10,.05,matrix);
   part(glass,i,0,.54,-.03,.675,.18,.62,matrix);
   for(let j=0;j<4;j++)part(wheels,i*4+j,j%2?.39:-.39,.16,j<2?-.45:.45,.13,.30,.30,matrix);
  }
  for(let i=0;i<personCount;i++){
   const path=PATHS[i%PATHS.length],curveIndex=(i*.119+time.current*.012*(i%2?1:-1))%1,f=(curveIndex+1)%1,a=f*(path.length-1),idx=Math.floor(a),mix=a-idx;
   const p=path[idx],n=path[Math.min(idx+1,path.length-1)];const x=THREE.MathUtils.lerp(p[0],n[0],mix)+(i%2?.13:-.13),z=THREE.MathUtils.lerp(p[1],n[1],mix);
   _dummy.position.set(x,.38,z);_dummy.rotation.set(0,0,0);_dummy.scale.set(.11,.36,.10);_dummy.updateMatrix();people.current.setMatrixAt(i,_dummy.matrix);
   _dummy.position.y=.64;_dummy.scale.setScalar(.105);_dummy.updateMatrix();heads.current.setMatrixAt(i,_dummy.matrix);
  }
  for(const r of[body,glass,wheels,people,heads])r.current.instanceMatrix.needsUpdate=true;
 });
 return <><instancedMesh ref={body} args={[null,null,carCount*3]} castShadow frustumCulled={false}><boxGeometry/><meshStandardMaterial roughness={.35} metalness={.12}/></instancedMesh><instancedMesh ref={glass} args={[null,null,carCount]} castShadow frustumCulled={false}><boxGeometry/><meshStandardMaterial color="#344640" roughness={.2} metalness={.25}/></instancedMesh><instancedMesh ref={wheels} args={[null,null,carCount*4]} castShadow frustumCulled={false}><boxGeometry/><meshStandardMaterial color="#333a34" roughness={.9}/></instancedMesh><instancedMesh ref={people} args={[null,null,personCount]} castShadow frustumCulled={false}><cylinderGeometry args={[.8,1,1,5]}/><meshStandardMaterial roughness={1}/></instancedMesh><instancedMesh ref={heads} args={[null,null,personCount]} castShadow frustumCulled={false}><sphereGeometry args={[1,6,5]}/><meshStandardMaterial color="#c4a789" roughness={1}/></instancedMesh></>;
}

const ROUTE_POINTS=[[-24,.18,7],[-13,.18,7],[-9,.18,5],[-9,.18,-9],[1,.18,-11],[14,.18,-11],[18,.18,-8],[19,.18,0],[13,.18,4],[7.5,.18,5],[7.5,.18,8]];
function Route({motion}){
 const pointer=useRef();
 const curve=useMemo(()=>new THREE.CatmullRomCurve3(ROUTE_POINTS.map(p=>new THREE.Vector3(...p)),false,'centripetal'),[]);
 const geometry=useMemo(()=>new THREE.TubeGeometry(curve,180,.035,6,false),[curve]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(()=>{pointer.current.position.copy(curve.getPointAt(clamp(motion.progress)));pointer.current.position.y=.35;});
 return <><mesh geometry={geometry}><meshStandardMaterial color="#b99a60" roughness={.36} metalness={.55}/></mesh><mesh ref={pointer}><sphereGeometry args={[.18,16,12]}/><meshStandardMaterial color="#f0d79b" roughness={.2} metalness={.75}/></mesh></>;
}
function Landmark({motion,id,name,position,onSelect}){
 const ref=useRef();
 useFrame(()=>{if(ref.current){const show=ease(motion.progress,.035,.12);ref.current.style.opacity=String(show);ref.current.style.pointerEvents=show>.9?'auto':'none';}});
 return <Html position={position} center zIndexRange={[8,2]} style={{pointerEvents:'none'}}><button ref={ref} type="button" className="atlas-landmark" onClick={()=>onSelect?.(id)} aria-label={`Descobrir ${name}`}><span className="atlas-landmark__dot"/><span>{name}</span><svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.1"/></svg></button></Html>;
}

const CAMERA_KEYS=[
 {at:0,eye:[43,36,-46],look:[0,1,1]},
 {at:.23,eye:[33,29,-38],look:[11,3,-18]},
 {at:.45,eye:[22,25,-30],look:[-3,2,-2]},
 {at:.67,eye:[26,22,-17],look:[7,2,11]},
 {at:1,eye:[9,9,-5],look:[7.5,3.2,10]},
];
function Director({motion,reduced,onReady}){
 const {camera,size}=useThree(),ready=useRef(false),eye=useMemo(()=>new THREE.Vector3(),[]),look=useMemo(()=>new THREE.Vector3(),[]),a=useMemo(()=>new THREE.Vector3(),[]),b=useMemo(()=>new THREE.Vector3(),[]);
 useFrame(()=>{
  const p=clamp(motion.progress),portrait=size.width/size.height<1.15;
  let index=CAMERA_KEYS.findIndex((k,i)=>i<CAMERA_KEYS.length-1&&p>=k.at&&p<=CAMERA_KEYS[i+1].at);if(index<0)index=CAMERA_KEYS.length-2;
  const from=CAMERA_KEYS[index],to=CAMERA_KEYS[index+1],t=ease(p,from.at,to.at);
  eye.fromArray(from.eye).lerp(b.fromArray(to.eye),t);look.fromArray(from.look).lerp(a.fromArray(to.look),t);
  // The overview must fit the whole plinth before the authored close-ups. A
  // portrait needs a longer camera distance, not a horizontal scene squash.
  const distanceFactor=portrait?THREE.MathUtils.lerp(3.05,2.1,ease(p,0,.85)):THREE.MathUtils.lerp(1.85,1,ease(p,0,.30));
  eye.sub(look).multiplyScalar(distanceFactor).add(look);
  if(!reduced){eye.x+=(motion.pointerX||0)*.70;eye.y+=(motion.pointerY||0)*.40;}
  camera.position.copy(eye);camera.lookAt(look);camera.fov=portrait?47:34;
  if(!portrait)camera.setViewOffset(size.width,size.height,-size.width*.115,0,size.width,size.height);else camera.clearViewOffset();
  camera.updateProjectionMatrix();
  if(!ready.current){ready.current=true;onReady?.();}
 });return null;
}
function Scene({motion,reduced,paused,onReady,onSelect}){
 return <><color attach="background" args={['#e9e5da']}/><fog attach="fog" args={['#e9e5da',230,400]}/><hemisphereLight args={['#f0f0e3','#746b4d',1.45]}/><ambientLight intensity={.28}/><directionalLight position={[-22,42,-28]} intensity={3.5} color="#fff1cd" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-48} shadow-camera-right={48} shadow-camera-top={45} shadow-camera-bottom={-45} shadow-camera-near={1} shadow-camera-far={130} shadow-normalBias={.05} shadow-bias={-.0001} shadow-radius={4}/><directionalLight position={[35,20,20]} intensity={1.05} color="#dbe6e2"/><SiteGround/><Architecture motion={motion}/><Trees motion={motion} reduced={reduced} paused={paused}/><Traffic reduced={reduced} paused={paused}/><Route motion={motion}/><Landmark motion={motion} id="memorial" name="Memorial Hall" position={[14,17.7,-18.6]} onSelect={onSelect}/><Landmark motion={motion} id="university" name="University Hall" position={[-4,7.6,0]} onSelect={onSelect}/><Landmark motion={motion} id="widener" name="Widener Library" position={[7.5,9.3,12]} onSelect={onSelect}/><Landmark motion={motion} id="yard" name="Harvard Yard" position={[-11.5,1.2,10]} onSelect={onSelect}/><Director motion={motion} reduced={reduced} onReady={onReady}/></>;
}

export default function CampusAtlas({motion,quality='high',reduced=false,paused=false,active=true,onReady,onSelect}){
 const profile=useViewportRenderQuality(quality);
 return <Canvas shadows={{type:THREE.PCFSoftShadowMap}} dpr={profile.dpr} frameloop={active?'always':'demand'} camera={{position:[43,36,-46],fov:34,near:.15,far:420}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.13;gl.setClearColor('#e9e5da',1);}}><Scene motion={motion} reduced={reduced} paused={paused} onReady={onReady} onSelect={onSelect}/></Canvas>;
}
