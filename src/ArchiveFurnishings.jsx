import React,{useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as THREE from 'three';
import {makeFibreTexture} from './SurfaceDetail';
const ROOT='/assets/archive-props/';
const SHELF=ROOT+'wooden_bookshelf_worn/wooden_bookshelf_worn.gltf';
const BOOKS=ROOT+'book_encyclopedia_set_01/books-lod.gltf';
const FAR=ROOT+'book_encyclopedia_set_01/books-far.gltf';
const TABLE=ROOT+'wooden_table_02/wooden_table_02.gltf';
const CHAIR=ROOT+'dining_chair_02/dining_chair_02.gltf';
const BAYS=[4,-3,-10,-17,-24,-31,-37];
const LEVELS=[.108,.392,.672,.960,1.277,1.663].map(y=>y*1.6+.003);
const random=seed=>()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
function Batch({geometry,material,items,castShadow=false,receiveShadow=true}){
 const ref=useRef();
 useLayoutEffect(()=>{const m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),s=new THREE.Vector3(),c=new THREE.Color();items.forEach((a,i)=>{e.set(0,a.rotation||0,a.lean||0);q.setFromEuler(e);v.fromArray(a.position);s.fromArray(a.scale||[1,1,1]);m.compose(v,q,s);ref.current.setMatrixAt(i,m);if(a.color){c.set(a.color);ref.current.setColorAt(i,c);}});ref.current.instanceMatrix.needsUpdate=true;if(ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;ref.current.computeBoundingSphere();},[items]);
 return <instancedMesh ref={ref} args={[geometry,material,items.length]} castShadow={castShadow} receiveShadow={receiveShadow}/>;
}
function bookVariants(scene){
 scene.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(scene),center=(bounds.max.x+bounds.min.x)/2;
 const variants=[];
 for(let variant=0;variant<4;variant++){
  const r=random(1636+variant*79),groups=[[],[]];
  scene.children.forEach((volume,index)=>{
   const height=.955+r()*.09,depth=(r()-.5)*.013,lean=(r()-.5)*.015;
   volume.traverse(mesh=>{if(!mesh.isMesh)return;const g=mesh.geometry.clone();g.scale(1,height,1);g.rotateZ(lean);g.translate(0,0,depth);g.applyMatrix4(mesh.matrixWorld);g.translate(-center,0,0);const color=new THREE.Color().setRGB(.965+r()*.035,.958+r()*.042,.935+r()*.065),a=new Float32Array(g.attributes.position.count*3);for(let n=0;n<g.attributes.position.count;n++){a[n*3]=color.r;a[n*3+1]=color.g;a[n*3+2]=color.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));groups[mesh.material.name.includes('paper')?1:0].push(g);});
  });
  variants.push(groups.map(parts=>{const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());g.computeBoundingSphere();return g;}));
 }
 return variants;
}
function BookBay({near,far,materials,bay,quality}){
 const close=useRef(),distant=useRef(),nearby=useRef(false);
 const items=useMemo(()=>{const out=[],r=random(2007+bay*135),offset=new THREE.Vector3(),q=new THREE.Quaternion();for(const side of [-1,1]){const angle=-side*Math.PI/2;q.setFromAxisAngle(new THREE.Vector3(0,1,0),angle);for(let row=0;row<LEVELS.length;row++)for(const set of [-1,1]){offset.set(set*.455+(r()-.5)*.015,LEVELS[row],.258+(r()-.5)*.021).applyQuaternion(q);out.push({position:[side*5.43+offset.x,offset.y,offset.z],rotation:angle,scale:[1.48+(r()-.5)*.04,1.48+(r()-.5)*.14,1.48],color:new THREE.Color().setHSL(.075+(r()-.5)*.025,.045+r()*.06,.83+r()*.17)});}}return out;},[bay]);
 useFrame(({camera})=>{const distance=Math.abs(camera.position.z-BAYS[bay]);if(distance<6)nearby.current=true;else if(distance>9)nearby.current=false;if(close.current)close.current.visible=nearby.current;if(distant.current)distant.current.visible=!nearby.current;});
 return <group position={[0,0,BAYS[bay]]}>
  <group ref={close}>{near.map((g,i)=><Batch key={i} geometry={g} material={materials[i]} items={items}/>)}</group>
  <group ref={distant} visible={false}>{far.map((g,i)=><Batch key={i} geometry={g} material={materials[i]} items={items}/>)}</group>
 </group>;
}
function woodBox(w,h,d){const g=new RoundedBoxGeometry(w,h,d,2,Math.min(.012,w*.05,h*.15,d*.05));const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,.018+uv.getX(i)*.085,.18+uv.getY(i)*.18);return g;}
function DisplayStand({wood}){
 const parts=useMemo(()=>[
  {size:[.80,.075,.70],at:[-.12,.0375,-21]},
  {size:[.69,.055,.59],at:[-.12,.1025,-21]},
  {size:[.52,.76,.44],at:[-.12,.51,-21]},
  {size:[.60,.045,.51],at:[-.12,.9125,-21]},
  {size:[.66,.035,.56],at:[-.12,.9525,-21]},
  {size:[.60,.026,.52],at:[-.12,.983,-21]},
  {size:[.80,.10,.66],at:[-.12,1.046,-21]},
 ].map(p=>({...p,geometry:woodBox(...p.size)})),[]);
 const detail=useMemo(()=>({trim:new THREE.MeshStandardMaterial({color:'#b49453',metalness:.79,roughness:.39}),pad:new THREE.MeshPhysicalMaterial({color:'#32111a',roughness:.94,sheen:.65,sheenColor:'#6f253b'})}),[]);
 useEffect(()=>()=>{parts.forEach(p=>p.geometry.dispose());Object.values(detail).forEach(m=>m.dispose());},[parts,detail]);
 return <group name="Archive folio display — top 1.098m">
  {parts.map((p,i)=><mesh key={i} geometry={p.geometry} material={wood} position={p.at} castShadow receiveShadow/>)}
  <mesh position={[-.12,1.097,-21]} material={detail.pad}><boxGeometry args={[.58,.002,.49]}/></mesh>
  {[-1,1].map(side=><React.Fragment key={side}><mesh position={[-.12+side*.263,.51,-20.773]} material={detail.trim}><boxGeometry args={[.007,.65,.007]}/></mesh><mesh position={[-.12+side*.34,1.021,-20.66]} material={detail.trim}><boxGeometry args={[.008,.03,.008]}/></mesh></React.Fragment>)}
  <mesh position={[-.12,.978,-20.663]} rotation={[-.08,0,0]} material={detail.trim}><boxGeometry args={[.24,.047,.008]}/></mesh>
 </group>;
}
function lampGeometry(){
 const pieces=[];
 const base=new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.086,0),new THREE.Vector2(.103,.006),new THREE.Vector2(.105,.014),new THREE.Vector2(.097,.025),new THREE.Vector2(.061,.038),new THREE.Vector2(.018,.042),new THREE.Vector2(0,.042)],48);pieces.push(base);
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.035,0),new THREE.Vector3(0,.23,0),new THREE.Vector3(-.035,.33,0),new THREE.Vector3(0,.365,0)]);pieces.push(new THREE.TubeGeometry(curve,30,.0065,10,false));
 const cross=new THREE.CylinderGeometry(.0045,.0045,.345,12);cross.rotateZ(Math.PI/2);cross.translate(0,.365,0);pieces.push(cross);
 for(const side of [-1,1]){const pin=new THREE.SphereGeometry(.011,12,8);pin.translate(side*.162,.365,0);pieces.push(pin);}
 for(let i=0;i<11;i++){const bead=new THREE.SphereGeometry(.0024,6,4);bead.translate(.125,.355-i*.006,.045);pieces.push(bead);}
 const brass=mergeGeometries(pieces,false);pieces.forEach(g=>g.dispose());
 const outer=.079,inner=.074,shape=new THREE.Shape();shape.moveTo(-outer,0);shape.absarc(0,0,outer,Math.PI,0,true);shape.lineTo(inner,0);shape.absarc(0,0,inner,0,Math.PI,false);shape.closePath();
 const glass=new THREE.ExtrudeGeometry(shape,{depth:.29,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:2,curveSegments:36});glass.translate(0,.365,-.145);glass.rotateY(Math.PI/2);
 const bulb=new THREE.CylinderGeometry(.013,.013,.224,16);bulb.rotateZ(Math.PI/2);bulb.translate(0,.365,0);
 return{brass,glass,bulb};
}
function ReadingStations({bookScene}){
 const table=useGLTF(TABLE),chair=useGLTF(CHAIR);
 const data=useMemo(()=>{
  let tableMesh,chairMesh;table.scene.traverse(o=>{if(o.isMesh)tableMesh=o;});chair.scene.traverse(o=>{if(o.isMesh)chairMesh=o;});
  const wood=tableMesh.material.clone(),leather=chairMesh.material.clone();wood.envMapIntensity=.7;leather.envMapIntensity=.9;
  for(const m of [wood,leather])for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key]){m[key].anisotropy=16;m[key].needsUpdate=true;}
  const grain=makeFibreTexture(),brass=new THREE.MeshPhysicalMaterial({color:'#9a7640',metalness:.84,roughness:.31,bumpMap:grain,bumpScale:.00025,roughnessMap:grain}),green=new THREE.MeshPhysicalMaterial({color:'#174b37',metalness:.04,roughness:.20,clearcoat:.95,clearcoatRoughness:.11,bumpMap:grain,bumpScale:.00012}),light=new THREE.MeshStandardMaterial({color:'#fff1c9',emissive:'#ffd08a',emissiveIntensity:1.3,roughness:.36});
  const lamps=lampGeometry(),tables=[],chairs=[],lampItems=[],bookItems=[],r=random(1915),tableScale=.76/.79954288705,chairScale=.9/.97337768972;
  for(const z of [2,-5,-12,-29,-36])for(const side of [-1,1]){
   const x=side*2.7,yaw=(r()-.5)*.025;
   tables.push({position:[x,.0001251529*tableScale,z],rotation:yaw,scale:[tableScale,tableScale,tableScale]});
   for(const front of [-1,1])chairs.push({position:[x+(r()-.5)*.045,-.001285091*chairScale,z+front*.66],rotation:(front===1?Math.PI:0)+(r()-.5)*.10,scale:[chairScale,chairScale,chairScale]});
   lampItems.push({position:[x+.22,.76,z-.015],rotation:(r()-.5)*.08});
   bookItems.push({position:[x-.22,.782,z+.025],rotation:(r()-.5)*.30,scale:[1.08,1.08,1.08]});
  }
  const volume=bookScene.children[0],bounds=new THREE.Box3().setFromObject(volume),center=bounds.getCenter(new THREE.Vector3()),bookParts=[],bookMaterials=[];volume.updateWorldMatrix(true,true);
  volume.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);g.translate(-center.x,-center.y,-center.z);g.rotateZ(Math.PI/2);bookParts.push(g);const m=o.material.clone();m.envMapIntensity=.6;bookMaterials.push(m);});
  return{tableGeometry:tableMesh.geometry,chairGeometry:chairMesh.geometry,wood,leather,grain,brass,green,light,lamps,tables,chairs,lampItems,bookItems,bookParts,bookMaterials};
 },[table.scene,chair.scene,bookScene]);
 useEffect(()=>()=>{for(const k of ['wood','leather','brass','green','light'])data[k].dispose();data.grain.dispose();Object.values(data.lamps).forEach(g=>g.dispose());data.bookParts.forEach(g=>g.dispose());data.bookMaterials.forEach(m=>m.dispose());},[data]);
 return <group name="Photographic reading desks and leather chairs">
  <Batch geometry={data.tableGeometry} material={data.wood} items={data.tables} castShadow/>
  <Batch geometry={data.chairGeometry} material={data.leather} items={data.chairs} castShadow/>
  <Batch geometry={data.lamps.brass} material={data.brass} items={data.lampItems} castShadow/>
  <Batch geometry={data.lamps.glass} material={data.green} items={data.lampItems} castShadow/>
  <Batch geometry={data.lamps.bulb} material={data.light} items={data.lampItems}/>
  {data.bookParts.map((g,i)=><Batch key={i} geometry={g} material={data.bookMaterials[i]} items={data.bookItems} castShadow/>)}
 </group>;
}
export default function ArchiveFurnishings({quality='high'}){
 const shelf=useGLTF(SHELF),books=useGLTF(BOOKS),far=useGLTF(FAR);
 const data=useMemo(()=>{
  let shelfMesh;shelf.scene.traverse(o=>{if(o.isMesh)shelfMesh=o;});
  const shelfMaterial=shelfMesh.material.clone();shelfMaterial.color.multiply(new THREE.Color('#d9c5ac'));shelfMaterial.envMapIntensity=.65;
  const bookMaterials=[];books.scene.traverse(o=>{if(o.isMesh){const i=o.material.name.includes('paper')?1:0;if(!bookMaterials[i]){const m=o.material.clone();m.vertexColors=true;m.envMapIntensity=.65;if(i===1)m.roughness=.98;bookMaterials[i]=m;}}});
  for(const m of [shelfMaterial,...bookMaterials])for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key]){m[key].anisotropy=16;m[key].needsUpdate=true;}
  const near=bookVariants(books.scene),distant=bookVariants(far.scene);
  const shelves=[];for(const z of BAYS)for(const side of [-1,1])shelves.push({position:[side*5.43,0,z],rotation:-side*Math.PI/2,scale:[1.6,1.6,1.6]});
  return {shelfGeometry:shelfMesh.geometry,shelfMaterial,bookMaterials,near,distant,shelves};
 },[shelf.scene,books.scene,far.scene]);
 useEffect(()=>()=>{data.shelfMaterial.dispose();data.bookMaterials.forEach(m=>m.dispose());data.near.flat().forEach(g=>g.dispose());data.distant.flat().forEach(g=>g.dispose());},[data]);
 return <group name="Photographic archive furnishings — Poly Haven CC0">
  <Batch geometry={data.shelfGeometry} material={data.shelfMaterial} items={data.shelves} castShadow/>
  {BAYS.map((z,bay)=><BookBay key={z} near={data.near[bay%4]} far={data.distant[bay%4]} materials={data.bookMaterials} bay={bay} quality={quality}/>)}
  <DisplayStand wood={data.shelfMaterial}/><ReadingStations bookScene={books.scene}/>
 </group>;
}
