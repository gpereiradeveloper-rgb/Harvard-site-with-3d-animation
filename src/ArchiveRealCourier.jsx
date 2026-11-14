import React,{Suspense,useEffect,useMemo,useRef} from 'react';
import {useGLTF,RoundedBox} from '@react-three/drei';
import {useFrame,useThree} from '@react-three/fiber';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import {ImportedScholar} from './ArchiveReadyModels';
import {realCourierAt,deliveryEase,COURIER_FLOOR,COURIER_X} from './ArchiveCourierMotion';
import {supplyChainAt} from './ArchiveSupplyChain';

const MODEL='/assets/ready-models/box-truck.glb';
const clamp=n=>Math.max(0,Math.min(1,n));
function prepareTruck(scene){
 scene.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(scene),center=bounds.getCenter(new THREE.Vector3());
 const factor=4.30/(bounds.max.x-bounds.min.x),parts=new Map(),materials=new Map();
 const point=p=>p.sub(new THREE.Vector3(center.x,bounds.min.y,center.z)).multiplyScalar(factor).applyAxisAngle(new THREE.Vector3(0,1,0),-Math.PI/2);
 const doorPivot=point(new THREE.Vector3(-2.72,1.03,-1.07));
 const rollPivots=Array.from({length:18},(_,i)=>point(new THREE.Vector3(3.508,1.235+i*.109,0)));
 const wheels=[[-2.49,.472,1.064],[-2.49,.472,-1.064],[1.92,.472,1.0615],[1.92,.472,-1.0615]].map(p=>point(new THREE.Vector3(...p)));
 const add=(key,g,mat)=>{if(!parts.has(key))parts.set(key,{kind:key.split('|')[0],material:mat,geometries:[]});parts.get(key).geometries.push(g);};
 scene.traverse(mesh=>{
  if(!mesh.isMesh||/Roll-up rear door inner shadow/i.test(mesh.name))return;
  let mat=materials.get(mesh.material);
  if(!mat){mat=mesh.material.clone();if(/glass/i.test(mat.name)){mat.transparent=true;mat.opacity=.36;mat.depthWrite=false;mat.metalness=0;mat.roughness=.08;}materials.set(mesh.material,mat);}
  let g=mesh.geometry.clone();if(g.index){const n=g.toNonIndexed();g.dispose();g=n;}g.applyMatrix4(mesh.matrixWorld);
  const sourceBox=new THREE.Box3().setFromBufferAttribute(g.attributes.position),c=sourceBox.getCenter(new THREE.Vector3());
  let kind='body';
  if(/tire|dished steel commercial wheel|heavy wheel|rolled commercial rim/i.test(mesh.name))kind='wheel'+(c.x<0?(c.z>0?0:1):(c.z>0?2:3));
  if(/rear roll-up formed horizontal door slat|roll-up slat recessed seam/i.test(mesh.name))kind='roll'+Math.max(0,Math.min(17,Math.round((c.y-1.235)/.109)));
  if(/door.*(?:handle|escutcheon)|truck cab door window|truck full cab door seam/i.test(mesh.name)&&c.z<0)kind='door';
  // Split the ready cab's side skin along its modeled door seam. All original
  // vertex normals and UVs remain on the extracted, hinged triangles.
  const pos=g.attributes.position,doorIndices=[],bodyIndices=[];
  if(/hollow 12-station cab/i.test(mesh.name)){
   for(let i=0;i<pos.count;i+=3){let x=0,y=0,z=0;for(let j=0;j<3;j++){x+=pos.getX(i+j)/3;y+=pos.getY(i+j)/3;z+=pos.getZ(i+j)/3;}
    const a=z<-.94&&x> -2.72&&x< -1.30&&y>.75&&y<2.52?doorIndices:bodyIndices;a.push(i,i+1,i+2);}
  }
  const finish=(geo,type)=>{
   geo.translate(-center.x,-bounds.min.y,-center.z);geo.scale(factor,factor,factor);geo.rotateY(-Math.PI/2);
   if(type==='door')geo.translate(-doorPivot.x,-doorPivot.y,-doorPivot.z);
   else if(type.startsWith('roll')){const p=rollPivots[Number(type.slice(4))];geo.translate(-p.x,-p.y,-p.z);}
   else if(type.startsWith('wheel')){const p=wheels[Number(type.slice(5))];geo.translate(-p.x,-p.y,-p.z);}
   add(type+'|'+mat.uuid,geo,mat);
  };
  if(doorIndices.length){const extract=indices=>{const o=new THREE.BufferGeometry();for(const [name,attr]of Object.entries(g.attributes)){const a=new Float32Array(indices.length*attr.itemSize);indices.forEach((index,i)=>{for(let j=0;j<attr.itemSize;j++)a[i*attr.itemSize+j]=attr.array[index*attr.itemSize+j];});o.setAttribute(name,new THREE.BufferAttribute(a,attr.itemSize));}return o;};finish(extract(doorIndices),'door');finish(extract(bodyIndices),'body');g.dispose();}
  else finish(g,kind);
 });
 const batches=[...parts.values()].map(p=>{const geometry=mergeGeometries(p.geometries,false);p.geometries.forEach(g=>g.dispose());geometry.computeBoundingSphere();return{kind:p.kind,material:p.material,geometry};});
 return{batches,doorPivot,rollPivots,wheels,factor,materials:[...materials.values()]};
}
function Pieces({batches,kind}){return batches.filter(b=>b.kind===kind).map((b,i)=><mesh key={i} geometry={b.geometry} material={b.material} castShadow={!b.material.transparent} receiveShadow/>);}
function LibraryIdentity(){
 const owned=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=448;const c=canvas.getContext('2d');c.clearRect(0,0,1536,448);c.fillStyle='#a51c30';c.fillRect(36,54,14,302);c.fillStyle='#23343c';c.font='96px Georgia';c.fillText('HARVARD LIBRARY',103,176);c.font='31px Arial';c.fillText('COLLECTIONS IN MOTION',109,250);c.fillStyle='#a51c30';c.font='30px Georgia';c.fillText('VERITAS  ·  1636',109,322);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;const material=new THREE.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:.65});return{texture,material};},[]);
 useEffect(()=>()=>{owned.texture.dispose();owned.material.dispose();},[owned]);
 return [-1,1].map(side=><mesh key={side} position={[side*.710,1.22,.85]} rotation={[0,side*Math.PI/2,0]} material={owned.material}><planeGeometry args={[1.8,.525]}/></mesh>);
}
function ReadyTruck({time}){
 const {scene}=useGLTF(MODEL),truck=useMemo(()=>prepareTruck(scene),[scene]),root=useRef(),door=useRef(),wheels=useRef([]),steering=useRef([]),roll=useRef([]),{gl}=useThree();
 useEffect(()=>()=>{truck.batches.forEach(b=>b.geometry.dispose());truck.materials.forEach(m=>m.dispose());},[truck]);
 useFrame(()=>{const s=realCourierAt(time.current);root.current.position.set(s.truckX,COURIER_FLOOR,s.truckZ);root.current.rotation.y=s.truckYaw;door.current.rotation.y=s.door*1.1;wheels.current.forEach(w=>{if(w)w.rotation.x=-s.wheelSpin;});steering.current.forEach((w,i)=>{if(w)w.rotation.y=i<2?s.steering:0;});
  roll.current.forEach((r,i)=>{if(!r)return;const p=truck.rollPivots[i],up=s.rollup*1.18,top=3.12*truck.factor,over=Math.max(0,p.y+up-top);r.position.set(p.x,Math.min(p.y+up,top),p.z-over);r.rotation.x=-Math.PI/2*clamp(over/.12);});
  Object.assign(gl.domElement.dataset,{worldCourierTask:s.task,worldCourierX:s.truckX.toFixed(3),worldCourierZ:s.truckZ.toFixed(3),worldCourierDoor:s.door.toFixed(3),worldCourierModel:'ready-CC0-7.5t-box-truck',worldCourierLoadIdentity:'shared-finite-eight-case-remittance',worldCourierOperationTime:s.operationTime.toFixed(3),worldCourierComplete:String(s.complete)});
 });
 return <group ref={root} name="ready-7.5-tonne-library-truck">
  <Pieces batches={truck.batches} kind="body"/>
  <LibraryIdentity/>
  <group ref={door} position={truck.doorPivot}><Pieces batches={truck.batches} kind="door"/></group>
  {truck.wheels.map((p,i)=><group key={i} ref={r=>{steering.current[i]=r;}} position={p}><group ref={r=>{wheels.current[i]=r;}}><Pieces batches={truck.batches} kind={'wheel'+i}/></group></group>)}
  {Array.from({length:18},(_,i)=><group key={i} ref={r=>{roll.current[i]=r;}}><Pieces batches={truck.batches} kind={'roll'+i}/></group>)}
 </group>;
}
function Driver({time}){
 const actor=useRef(),pose=useMemo(()=>({pelvis:.55,lean:0,headPitch:.1,headYaw:0,leftHand:new THREE.Vector3(),rightHand:new THREE.Vector3(),leftFoot:new THREE.Vector3(),rightFoot:new THREE.Vector3()}),[]);
 const target=useMemo(()=>new THREE.Vector3(),[]),grip=useRef(0),lastCase=useRef(null),lastTime=useRef(0);
 useFrame(()=>{const operation=supplyChainAt(time.current),s=realCourierAt(time.current),d=operation.driver,p=pose,position=d.position,yaw=d.yaw,seated=d.seated??s.seated,walk=d.walking?1:0,activeParcel=operation.cases.find(c=>c.id===d.caseId),pickupBend=activeParcel?.12*(1-deliveryEase(activeParcel.position[1]-position[1],.74,.90))*deliveryEase(Math.hypot(activeParcel.position[0]-position[0],activeParcel.position[2]-position[2]),.40,.55):0,crouch=Math.max(d.crouch||0,pickupBend);
  actor.current.position.fromArray(position);actor.current.rotation.y=yaw;
  p.pelvis=.55;p.pelvisAbsolute=.83-.09*seated-.58*crouch+Math.abs(Math.sin(d.distance/.42*Math.PI*2))*.006*walk;p.lean=.035+seated*.12+crouch*.34;p.headPitch=.11+crouch*.23;
  const dt=Math.min(.05,Math.max(0,time.current-lastTime.current));lastTime.current=time.current;
  const held=d.caseId!==null&&d.caseId!==undefined;if(held)lastCase.current=d.caseId;grip.current=THREE.MathUtils.damp(grip.current,held?1:0,18,dt);
  const parcel=operation.cases.find(c=>c.id===lastCase.current);
  for(const [i,side]of [-1,1].entries()){
   const step=Math.sin(d.distance/.42*Math.PI*2+i*Math.PI),foot=side<0?p.leftFoot:p.rightFoot,hand=side<0?p.leftHand:p.rightHand;
   const f=((d.distance/.42+i*.5)%1+1)%1,relative=(d.motionYaw??yaw)-yaw;
   let stride=.16-f*.42,lift=0;if(f>=.62){const u=(f-.62)/.38;stride=-.1004+.2604*u*u*(3-2*u);lift=Math.sin(Math.PI*u)*.065;}
   foot.set(side*(.11+.025*crouch)+Math.sin(relative)*stride*walk,.055+lift*walk+seated*.49,(.15+.10*seated)*(1-walk)+Math.cos(relative)*stride*walk);
   // Feet descend one at a time through the open cab doorway. The target is
   // kept in world coordinates while the torso turns from the seat to the step.
   if(s.t>=9.4&&s.t<11.2||s.t>=45.8&&s.t<47){
    const exiting=s.t<20,q=exiting?deliveryEase(s.t,i?10.1:9.4,i?11.2:10.45):deliveryEase(s.t,i?46.25:45.8,i?47:46.45);
    const cabX=COURIER_X+.36-side*.11,cabZ=s.truckZ-1.49-.25,outsideX=9.45+(exiting?.15:-.15),outsideZ=1.96+(exiting?-side:side)*.11;
    const x=exiting?THREE.MathUtils.lerp(cabX,outsideX,q):THREE.MathUtils.lerp(outsideX,cabX,q),z=exiting?THREE.MathUtils.lerp(cabZ,outsideZ,q):THREE.MathUtils.lerp(outsideZ,cabZ,q),y=exiting?THREE.MathUtils.lerp(.545,.055,q):THREE.MathUtils.lerp(.055,.545,q);
    const dx=x-position[0],dz=z-position[2],c=Math.cos(yaw),sn=Math.sin(yaw);foot.set(c*dx-sn*dz,y+Math.sin(Math.PI*q)*.08,sn*dx+c*dz);
   }
   hand.set(side*.19,.80,.12-step*.09*walk);hand.lerp(target.set(side*.13,.94,.20),seated);
   if(parcel&&grip.current>.001){
    const q=parcel.position,cy=Math.cos(parcel.yaw||0),sy=Math.sin(parcel.yaw||0),ax=position[0]-q[0],az=position[2]-q[2],px=cy*ax-sy*az,pz=sy*ax+cy*az;
    const norm=Math.max(.001,Math.hypot(ax,az)),radius=Math.min(.15/Math.max(.001,Math.abs(px)/norm),.20/Math.max(.001,Math.abs(pz)/norm)),hx=ax/norm*radius+Math.cos(yaw)*side*.10,hz=az/norm*radius-Math.sin(yaw)*side*.10,lx=THREE.MathUtils.clamp(cy*hx-sy*hz,-.15,.15),lz=THREE.MathUtils.clamp(sy*hx+cy*hz,-.20,.20);
    const wx=q[0]+cy*lx+sy*lz,wz=q[2]-sy*lx+cy*lz,dx=wx-position[0],dz=wz-position[2],c=Math.cos(yaw),sn=Math.sin(yaw);
    target.set(c*dx-sn*dz,q[1]-position[1]+.23,sn*dx+c*dz);hand.lerp(target,grip.current);
   }
  }
 },-2);
 return <group ref={actor}><Suspense fallback={null}><ImportedScholar pose={pose} actorRef={actor} variant={2} worker/></Suspense></group>;
}

function TruckLift({assets,time}){
 const lift=useRef(),m=assets.mats;
 useFrame(()=>{const s=realCourierAt(time.current);lift.current.position.set(s.truckX+Math.sin(s.truckYaw)*2.10,COURIER_FLOOR+s.deck,s.truckZ+Math.cos(s.truckYaw)*2.10);lift.current.rotation.set(-(1-s.deploy)*Math.PI/2,s.truckYaw,0,'YXZ');});
 return <group ref={lift} name="truck rear hydraulic lift — clear departure lane"><RoundedBox args={[1.2,.08,1.03]} position={[0,-.04,.45]} radius={.025} material={m.ink} castShadow receiveShadow/>{[-1,1].map(side=><mesh key={side} position={[side*.52,.005,.45]}><boxGeometry args={[.035,.012,.95]}/><meshStandardMaterial color="#d9ba62" metalness={.65} roughness={.35}/></mesh>)}</group>;
}
export default function ArchiveRealCourier({assets,time}){return <group name="finite-library-receiving-operation"><Suspense fallback={null}><ReadyTruck time={time}/></Suspense><TruckLift assets={assets} time={time}/><Driver time={time}/></group>;}
