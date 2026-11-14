import React,{useEffect,useMemo} from 'react';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Original architectural set, in metres. Open aisle: |x|<3.8; y=0 is the floor.
 * Camera travels from +Z into the archive. The room continues beyond the folio.
 * Real Poly Haven maps supply the grain; silhouette, joints and mouldings are geometry.
 */
const FLOOR=['/assets/archive-materials/floor-color-4k.jpg','/assets/archive-materials/floor-normal-2k.jpg','/assets/archive-materials/floor-roughness-2k.jpg'];
const STONE=['/assets/archive-materials/stone-color-2k.jpg','/assets/archive-materials/stone-normal-2k.jpg','/assets/archive-materials/stone-roughness-2k.jpg'];
const ARCHES=[9,0,-12,-26],WINDOWS=[4,-4,-12,-20,-28,-36],START=-40.4,END=10.5,CENTER=(START+END)/2,LENGTH=END-START;
const UP=new THREE.Vector3(0,1,0);

function metricUV(g,density=1){
 const p=g.attributes.position,n=g.attributes.normal;
 if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(p.count*2),2));
 const uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){
  const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));
  if(x>=y&&x>=z)uv.setXY(i,p.getZ(i)*density,p.getY(i)*density);
  else if(y>=z)uv.setXY(i,p.getX(i)*density,p.getZ(i)*density);
  else uv.setXY(i,p.getX(i)*density,p.getY(i)*density);
 }
 return g;
}
function makeShaft(){
 const positions=[],uv=[],indices=[],rings=30,sides=96,h=2.98;
 for(let y=0;y<=rings;y++)for(let i=0;i<=sides;i++){
  const t=y/rings,a=i/sides*Math.PI*2;
  const r=(THREE.MathUtils.lerp(.29,.251,t)+Math.sin(Math.PI*t)*.012)*(1-.045*(.5+.5*Math.cos(a*24)));
  positions.push(Math.cos(a)*r,t*h,Math.sin(a)*r);uv.push(i/sides*.94,t*2.15);
  if(y<rings&&i<sides){const k=y*(sides+1)+i;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function lathe(profile,sides=48){return new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),sides);}
function archWedge(inner,outer,spring,a0,a1,depth){
 const shape=new THREE.Shape();shape.moveTo(Math.cos(a0)*outer,spring+Math.sin(a0)*outer);
 shape.absarc(0,spring,outer,a0,a1,false);shape.lineTo(Math.cos(a1)*inner,spring+Math.sin(a1)*inner);shape.absarc(0,spring,inner,a1,a0,true);shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:2,curveSegments:8});g.translate(0,0,-depth/2);return metricUV(g,.6);
}
function archWindow(width,base,top){
 const radius=width/2,spring=top-radius,shape=new THREE.Shape();shape.moveTo(-radius,base);shape.lineTo(radius,base);shape.lineTo(radius,spring);shape.absarc(0,spring,radius,0,Math.PI,false);shape.closePath();return shape;
}
function acanthus(){
 const s=new THREE.Shape();s.moveTo(0,-.12);s.bezierCurveTo(-.08,-.05,-.06,.08,-.025,.18);s.lineTo(0,.14);s.lineTo(.025,.18);s.bezierCurveTo(.06,.08,.08,-.05,0,-.12);
 return new THREE.ExtrudeGeometry(s,{depth:.018,bevelEnabled:true,bevelThickness:.009,bevelSize:.008,bevelSegments:1,curveSegments:5});
}
function cloth(width=1.4,height=7.2){
 const g=new THREE.PlaneGeometry(width,height,44,68),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),t=(y+height/2)/height;
  p.setZ(i,Math.sin(x/width*Math.PI*12)*(.07+.065*(1-t))+.025*Math.sin(y*.7+x*9));
  p.setY(i,y+Math.cos(x/width*Math.PI*12)*.025*(1-t));
 }
 g.computeVertexNormals();return g;
}

export function createArchiveHallGeometry(){
 const sets={stone:[],stoneShade:[],oak:[],oakDark:[],brass:[],wall:[],floor:[],glass:[],daylight:[],lampGlass:[],velvet:[]};
 const euler=new THREE.Euler(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
 const add=(set,g,p=[0,0,0],r=[0,0,0],tint=1)=>{
  euler.set(...r);q.setFromEuler(euler);matrix.compose(new THREE.Vector3(...p),q,new THREE.Vector3(1,1,1));g.applyMatrix4(matrix);
  if(g.index){const converted=g.toNonIndexed();g.dispose();g=converted;}
  const colors=new Float32Array(g.attributes.position.count*3),positions=g.attributes.position;
  for(let i=0;i<positions.count;i++){const y=positions.getY(i),contact=['stone','stoneShade','wall'].includes(set)?1-.065*(1-THREE.MathUtils.smoothstep(y,.04,.65)):1;const value=tint*contact;colors[i*3]=colors[i*3+1]=colors[i*3+2]=value;}g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.clearGroups();sets[set].push(g);
 };
 const box=(set,w,h,d,p,r=[0,0,0],bevel=.012,density=.65,tint=1)=>{const g=bevel?new RoundedBoxGeometry(w,h,d,1,Math.min(bevel,w*.15,h*.15,d*.15)):new THREE.BoxGeometry(w,h,d);add(set,density===null?g:metricUV(g,density),p,r,tint);};
 const rod=(set,a,b,radius=.02,sides=8)=>{const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av),geo=new THREE.CylinderGeometry(radius,radius,delta.length(),sides);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,delta.normalize()));add(set,geo,av.add(bv).multiplyScalar(.5).toArray());};

 // Floor, perimeter rails and narrow, flush stone thresholds remain physical at oblique views.
 box('floor',12.5,.16,LENGTH,[0,-.08,CENTER],[0,0,0],.012,.6);
 for(const x of [-5.72,5.72])box('oakDark',.19,.018,LENGTH,[x,.006,CENTER],[0,0,0],.003,.7);
 for(const x of [-3.93,3.93]){
  box('stoneShade',.22,.018,LENGTH,[x,.006,CENTER],[0,0,0],.004,.5);
  box('brass',.018,.020,LENGTH,[x-Math.sign(x)*.125,.008,CENTER],[0,0,0],.002,.6);
 }
 ARCHES.forEach(z=>{box('stoneShade',8.2,.020,.72,[0,.009,z],[0,0,0],.004,.55);});

 // Left wall and right wall segments leave six real apertures, not luminous cards on a wall.
 box('wall',.42,8.15,LENGTH,[-6.23,4.045,CENTER],[0,0,0],.018,.5);
 box('wall',.42,1.62,LENGTH,[6.23,.81,CENTER],[0,0,0],.018,.5);
 box('wall',.42,1.18,LENGTH,[6.23,7.59,CENTER],[0,0,0],.018,.5);
 let edge=START;
 for(const z of [...WINDOWS].sort((a,b)=>a-b)){
  const lo=z-1.62,hi=z+1.62;
  if(lo>edge)box('wall',.42,5.38,lo-edge,[6.23,4.31,(lo+edge)/2],[0,0,0],.018,.5);
  edge=hi;
 }
 if(edge<END)box('wall',.42,5.38,END-edge,[6.23,4.31,(END+edge)/2],[0,0,0],.018,.5);
 // Rear window opens the end of the perspective; the front entry remains traversable.
 box('wall',3.45,8.15,.48,[-4.45,4.045,-40.25],[0,0,0],.018,.5);
 box('wall',3.45,8.15,.48,[4.45,4.045,-40.25],[0,0,0],.018,.5);
 box('wall',5.5,1.02,.48,[0,.51,-40.25],[0,0,0],.018,.5);
 box('wall',5.5,.68,.48,[0,7.82,-40.25],[0,0,0],.018,.5);
 for(const side of [-1,1]){const shape=new THREE.Shape();shape.moveTo(side*2.725,4.74);shape.lineTo(side*2.725,7.49);shape.lineTo(0,7.49);shape.lineTo(0,7.46);if(side<0)shape.absarc(0,4.74,2.72,Math.PI/2,Math.PI,false);else shape.absarc(0,4.74,2.72,Math.PI/2,0,true);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.48,bevelEnabled:false,curveSegments:48});add('wall',metricUV(g,.5),[0,0,-40.49]);}
 box('stone',8.55,.28,.79,[0,7.91,9],[0,0,0],.018,.6);
 box('oakDark',11.75,.17,.20,[0,7.925,10.35],[0,0,0],.015,.6);

 // Raised oak lower panels, rails and pilasters give the shelf bays a credible enclosing shell.
 for(const side of [-1,1]){
  const x=side*5.985;
  box('oakDark',.15,1.43,LENGTH,[x,.715,CENTER],[0,0,0],.008,.56);
  for(const [y,h,depth]of [[.10,.18,.20],[.27,.07,.23],[1.29,.13,.21],[1.405,.055,.24]])box('oak',depth,h,LENGTH,[side*5.89,y,CENTER],[0,0,0],.01,.6);
  for(let z=-39.2;z<10;z+=1.65){
   box('oak',.11,.91,1.35,[side*5.87,.79,z],[0,0,0],.014,.8,.97+(Math.round(z*10)%5)*.006);
   for(const zz of [z-.73,z+.73])box('oakDark',.15,1.1,.055,[side*5.80,.79,zz],[0,0,0],.007,.8);
  }
  for(const z of [-39.7,-32.1,-24.1,-16.1,-8.1,-.1,7.9,10.2]){
   box('stoneShade',.28,6.27,.40,[side*5.82,4.45,z],[0,0,0],.018,.55);
   for(const zz of [-.12,0,.12])box('stone',.055,5.67,.035,[side*5.65,4.44,z+zz],[0,0,0],.006,.8);
   box('stone',.48,.19,.65,[side*5.80,7.64,z],[0,0,0],.02,.6);
   box('stone',.42,.17,.58,[side*5.80,1.39,z],[0,0,0],.02,.6);
  }
  // Six layered cornice profiles cast their own thin shadows beneath the ceiling.
  for(const[y,h,depth]of [[7.58,.13,.27],[7.70,.08,.37],[7.79,.09,.46],[7.90,.11,.55],[8.01,.10,.62]])box('stone',depth,h,LENGTH,[side*5.91,y,CENTER],[0,0,0],.012,.55);
 }
 // Quiet raised panels above the left shelves, with double moulded rails.
 for(const z of [4,-4,-12,-20,-28,-36]){
  box('stoneShade',.085,3.58,5.72,[-5.963,5.38,z],[0,0,0],.018,.6);
  for(const y of [3.59,7.17])box('stone',.15,.075,5.88,[-5.88,y,z],[0,0,0],.01,.6);
  for(const zz of [z-2.94,z+2.94])box('stone',.15,3.65,.075,[-5.88,5.38,zz],[0,0,0],.01,.6);
  for(const y of [3.73,7.03])box('stone',.11,.036,5.50,[-5.85,y,z],[0,0,0],.006,.6);
 }

 // Coffered ceiling: inset plaster panels, double-stepped oak beams and little brass rosettes.
 box('wall',12.5,.22,LENGTH,[0,8.11,CENTER],[0,0,0],.01,.5);
 for(let z=-39.5;z<END-3.9;z+=4){
  box('oakDark',11.8,.18,.23,[0,7.92,z],[0,0,0],.018,.65);
  for(const x of [-4,0,4]){
   box('stoneShade',3.53,.055,3.48,[x,7.979,z+1.96],[0,0,0],.025,.55);
   for(const xx of [x-1.83,x+1.83])box('oak',.075,.10,3.68,[xx,7.925,z+1.96],[0,0,0],.009,.8);
   for(const zz of [z+.12,z+3.80])box('oak',3.73,.10,.075,[x,7.925,zz],[0,0,0],.009,.8);
   add('brass',new THREE.CylinderGeometry(.07,.07,.015,12),[x,7.933,z+1.96]);
  }
 }
 for(const x of [-2,2])box('oakDark',.22,.19,LENGTH,[x,7.90,CENTER],[0,0,0],.018,.7);

 // Four complete gateways. Each voussoir is separated by a real 12 mm joint.
 const baseProfile=[[0,0],[.45,0],[.45,.11],[.405,.15],[.36,.19],[.38,.23],[.34,.29],[.315,.35],[.29,.39]];
 const capitalProfile=[[.25,0],[.26,.06],[.285,.11],[.34,.18],[.37,.23],[.40,.27]];
 const shaft=makeShaft(),leaf=acanthus();
 ARCHES.forEach((z,index)=>{
  for(let i=0;i<25;i++){
   const a0=i/25*Math.PI+.0019,a1=(i+1)/25*Math.PI-.0019;
   add('stone',archWedge(3.6,4.09,3.6,a0,a1,.67),[0,0,z],[0,0,0],.97+((i*7+index)%7)*.008);
  }
  add('stoneShade',archWedge(4.12,4.19,3.6,0,Math.PI,.81),[0,0,z]);
  add('brass',archWedge(3.572,3.591,3.6,0,Math.PI,.71),[0,0,z]);
  // A solid spandrel ties the arch to the side walls without occluding the opening.
  for(const side of [-1,1]){
   box('stoneShade',1.4,.33,.82,[side*4.55,3.565,z],[0,0,0],.025,.6);
   box('stone',1.15,.12,.95,[side*4.1,3.385,z],[0,0,0],.025,.65);
   box('stone',1.03,.10,.87,[side*4.1,3.295,z],[0,0,0],.02,.65);
   box('stone',.95,.20,.95,[side*4.1,.1,z],[0,0,0],.025,.65);
   add('stone',lathe(baseProfile),[side*4.1,.20,z]);
   add('stone',shaft.clone(),[side*4.1,.59,z]);
   add('stone',lathe(capitalProfile),[side*4.1,3.575,z]);
   box('stone',.86,.11,.86,[side*4.1,3.915,z],[0,0,0],.018,.7);
   for(let row=0;row<2;row++)for(let i=0;i<10;i++){
    const angle=(i+row*.5)/10*Math.PI*2,rad=row?.315:.277;
    add('stone',leaf.clone(),[side*4.1+Math.sin(angle)*rad,3.66+row*.13,z+Math.cos(angle)*rad],[row?.25:.10,angle,0]);
   }
   for(const sx of [-1,1])for(const sz of [-1,1])add('stone',new THREE.TorusGeometry(.081,.022,7,18),[side*4.1+sx*.28,3.83,z+sz*.28],[0,sz<0?Math.PI:0,sx*.18]);
  }
 });shaft.dispose();leaf.dispose();

 // Deep wooden window reveals, fine bronze glazing bars, and a separate surface of old glass.
 WINDOWS.forEach((z,i)=>{
  for(const zz of [z-1.57,z+1.57]){
   box('stone',.44,5.34,.16,[6.08,4.29,zz],[0,0,0],.018,.55);
   box('oakDark',.31,5.16,.10,[6.075,4.29,zz+Math.sign(z-zz)*.12],[0,0,0],.01,.75);
  }
  for(const y of [1.62,6.96])box('stone',.48,.20,3.55,[6.05,y,z],[0,0,0],.022,.6);
  box('stone',.72,.13,3.65,[5.94,1.56,z],[0,0,0],.025,.6);
  for(const y of [1.79,6.79])box('oakDark',.19,.09,2.87,[6.075,y,z],[0,0,0],.008,.7);
  for(const zz of [z-.91,z,z+.91])box('brass',.055,4.94,.038,[6.045,4.29,zz],[0,0,0],.004,.8);
  for(let j=1;j<6;j++)box('brass',.058,.037,2.76,[6.041,1.82+j*.82,z],[0,0,0],.004,.8);
  box('daylight',.012,5.05,2.82,[6.30,4.29,z],[0,0,0],0,null);
  box('glass',.012,5.05,2.82,[6.085,4.29,z],[0,0,0],0,null,.98+(i%3)*.01);
 });
 // Fanlight at the end of the archive: a full shaped opening with radial glazing bars.
 const rearShape=archWindow(5.44,1.01,7.46),rearGlass=new THREE.ShapeGeometry(rearShape,64);
 {const p=rearGlass.attributes.position,uv=rearGlass.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+2.72)/5.44,(p.getY(i)-1.01)/6.45);}
 add('daylight',rearGlass.clone(),[0,0,-40.45]);add('glass',rearGlass,[0,0,-40.10]);
 add('oakDark',archWedge(2.75,2.90,4.74,0,Math.PI,.20),[0,0,-40.04]);
 for(const x of [-2.84,2.84])box('oakDark',.16,3.78,.21,[x,2.87,-40.04],[0,0,0],.014,.8);
 box('oakDark',5.85,.16,.24,[0,1.01,-40.04],[0,0,0],.012,.8);
 box('oakDark',5.60,.09,.13,[0,4.74,-39.99],[0,0,0],.009,.8);
 for(const x of [-1.80,-.90,0,.90,1.80])box('brass',.038,3.65,.045,[x,2.88,-39.96],[0,0,0],.005,.7);
 for(const y of [1.91,2.83,3.75])box('brass',5.4,.038,.045,[0,y,-39.96],[0,0,0],.005,.7);
 for(let i=1;i<8;i++){const a=i/8*Math.PI;rod('brass',[0,4.74,-39.96],[Math.cos(a)*2.70,4.74+Math.sin(a)*2.70,-39.96],.018);}
 for(const side of [-1,1]){
  add('velvet',cloth(),[side*3.47,3.83,-39.70]);
  add('brass',new THREE.CylinderGeometry(.045,.045,1.72,12),[side*3.47,7.54,-39.66],[0,0,Math.PI/2]);
 }

 // Suspended reading lanterns offer repeated, tangible foreground silhouettes.
 for(const z of [4,-7,-18,-32]){
  rod('brass',[0,7.9,z],[0,6.72,z],.018);
  for(let i=0;i<9;i++)add('brass',new THREE.TorusGeometry(.027,.007,5,12),[0,7.08+i*.077,z],[0,i%2?Math.PI/2:0,0]);
  add('brass',lathe([[0,0],[.29,0],[.34,.035],[.32,.075],[.24,.10],[.20,.16],[.10,.22],[.08,.28],[0,.30]],32),[0,6.43,z]);
  add('lampGlass',lathe([[0,0],[.20,0],[.235,.06],[.245,.36],[.215,.45],[.16,.49],[0,.49]],32),[0,5.94,z]);
  add('brass',new THREE.TorusGeometry(.216,.014,8,32),[0,5.98,z],[Math.PI/2,0,0]);
  for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])rod('brass',[Math.cos(a)*.22,5.99,z+Math.sin(a)*.22],[Math.cos(a)*.22,6.41,z+Math.sin(a)*.22],.011);
 }
 const result={};for(const [name,geos]of Object.entries(sets)){
  result[name]=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());result[name].computeBoundingBox();result[name].computeBoundingSphere();
 }
 return result;
}

function glazingTexture(){
 const c=document.createElement('canvas');c.width=512;c.height=1024;const ctx=c.getContext('2d');
 const g=ctx.createLinearGradient(0,0,0,1024);g.addColorStop(0,'#b6ccd8');g.addColorStop(.50,'#e3e9e6');g.addColorStop(.86,'#becfc9');g.addColorStop(1,'#a4b5ac');ctx.fillStyle=g;ctx.fillRect(0,0,512,1024);
 for(let i=0;i<240;i++){const x=(i*151.7)%512,y=(i*73.1)%1024;ctx.fillStyle='rgba(255,255,255,.012)';ctx.beginPath();ctx.ellipse(x,y,60+Math.sin(i)*20,15,0,0,Math.PI*2);ctx.fill();}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return map;
}

function frostTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
 const ctx=canvas.getContext('2d'),image=ctx.createImageData(1024,1024);let seed=1915;
 for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
  seed=seed*16807%2147483647;const grain=(seed/2147483647-.5)*20;
  const wave=Math.sin(x*.027+Math.sin(y*.009)*1.1)*3+Math.cos(y*.019+x*.004)*3;
  const i=(y*1024+x)*4,v=182+grain+wave;image.data[i]=image.data[i+1]=image.data[i+2]=v;image.data[i+3]=255;
 }
 ctx.putImageData(image,0,0);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.NoColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=8;return map;
}

export default function ArchiveHall({floorMaps=FLOOR,stoneMaps=STONE,stoneTextureStrength=.42,reflectionMap}){
 const originals=useTexture([...floorMaps,...stoneMaps]);
 const geometry=useMemo(createArchiveHallGeometry,[]);
 const materials=useMemo(()=>{
  const maps=originals.map((t,i)=>{const clone=t.clone();clone.wrapS=clone.wrapT=THREE.RepeatWrapping;clone.colorSpace=i%3===0?THREE.SRGBColorSpace:THREE.NoColorSpace;clone.anisotropy=16;clone.needsUpdate=true;return clone;});
  const floor=new THREE.MeshPhysicalMaterial({map:maps[0],normalMap:maps[1],roughnessMap:maps[2],normalScale:new THREE.Vector2(.17,.17),color:'#ddd3c0',roughness:.9,metalness:0,clearcoat:.02,clearcoatRoughness:.8,vertexColors:true});
  floor.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(.47,roughnessFactor);');};floor.customProgramCacheKey=()=> 'archive-oiled-oak-v2';
  const oak=floor.clone();oak.color.set('#bd9a70');oak.roughness=.86;oak.normalScale.set(.09,.09);oak.clearcoat=.025;oak.onBeforeCompile=floor.onBeforeCompile;oak.customProgramCacheKey=floor.customProgramCacheKey;
  const oakDark=oak.clone();oakDark.color.set('#94775a');oakDark.onBeforeCompile=floor.onBeforeCompile;oakDark.customProgramCacheKey=floor.customProgramCacheKey;
  const stone=new THREE.MeshStandardMaterial({map:maps[3],normalMap:maps[4],roughnessMap:maps[5],normalScale:new THREE.Vector2(.13,.13),color:'#f0e8d6',roughness:.92,vertexColors:true});
  // Preserve the photographed albedo and its local variation. The previous
  // constant beige blend discarded most of the surface information.
  stone.onBeforeCompile=shader=>{shader.uniforms.archiveStoneStrength={value:stoneTextureStrength};shader.fragmentShader='uniform float archiveStoneStrength;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb *= 1.0 + archiveStoneStrength * .36;').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(.69,roughnessFactor);');};
  stone.customProgramCacheKey=()=>`archive-photographic-stone-v3-${stoneTextureStrength}`;
  const stoneShade=stone.clone();stoneShade.color.set('#d0c3aa');stoneShade.normalScale.set(.10,.10);stoneShade.onBeforeCompile=stone.onBeforeCompile;stoneShade.customProgramCacheKey=stone.customProgramCacheKey;
  const wall=stone.clone();wall.color.set('#e5ddcb');wall.normalScale.set(.085,.085);wall.onBeforeCompile=stone.onBeforeCompile;wall.customProgramCacheKey=stone.customProgramCacheKey;
  const brass=new THREE.MeshStandardMaterial({color:'#8e7047',metalness:.78,roughness:.38,normalMap:maps[4],normalScale:new THREE.Vector2(.018,.018),vertexColors:true});
  const windowMap=glazingTexture(),frostMap=frostTexture();
  // Clear old glass; a separate world-space garden supplies the transmitted view.
  const daylight=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:THREE.DoubleSide});
  const glass=new THREE.MeshPhysicalMaterial({color:'#ffffff',metalness:0,roughness:.025,bumpMap:frostMap,bumpScale:.00004,transmission:1,thickness:.006,ior:1.52,attenuationColor:'#f1f7f4',attenuationDistance:18,clearcoat:.2,clearcoatRoughness:.025,envMapIntensity:.85,side:THREE.DoubleSide,depthWrite:false});
  const lampGlass=new THREE.MeshStandardMaterial({color:'#e6c99b',emissive:'#ffd7a2',emissiveIntensity:.9,roughness:.48,vertexColors:true});
  const velvet=new THREE.MeshPhysicalMaterial({color:'#46131e',roughness:1,metalness:0,sheen:.85,sheenColor:new THREE.Color('#8e3a43'),sheenRoughness:.85,normalMap:maps[4],normalScale:new THREE.Vector2(.04,.04),side:THREE.DoubleSide,vertexColors:true});
  return{maps,windowMap,frostMap,floor,oak,oakDark,stone,stoneShade,wall,brass,daylight,glass,lampGlass,velvet};
 },[...originals,stoneTextureStrength]);
 useEffect(()=>{materials.glass.envMap=reflectionMap||null;materials.glass.needsUpdate=true;},[materials,reflectionMap]);
 useEffect(()=>()=>{Object.values(geometry).forEach(g=>g.dispose());},[geometry]);
 useEffect(()=>()=>{materials.maps.forEach(t=>t.dispose());materials.windowMap.dispose();materials.frostMap.dispose();Object.values(materials).forEach(m=>m?.isMaterial&&m.dispose());},[materials]);
 return <group name="The archive — original architectural walkthrough">{Object.entries(geometry).filter(([name])=>name!=='floor').map(([name,g])=><mesh key={name} name={`Archive ${name}`} geometry={g} material={materials[name]} castShadow={!['floor','glass','daylight','lampGlass'].includes(name)} receiveShadow={!['glass','daylight','lampGlass'].includes(name)}/>)}</group>;
}
