import React,{Suspense,useEffect,useMemo,useRef} from 'react';
import {useGLTF} from '@react-three/drei';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {ImportedScholar} from './ArchiveReadyModels';
import {porterToolPoint} from './ArchiveCourierMotion';
import {supplyChainAt,supplyFloorHeight,supplyRampSlope} from './ArchiveSupplyChain';

function HandTruck({motion}){
 const {scene}=useGLTF('/assets/ready-models/blue-hand-truck.glb');
 const model=useMemo(()=>{const root=scene.clone(true),wheels=[];root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(/hand truck tire|wheel hub/i.test(o.name))wheels.push({object:o,quaternion:o.quaternion.clone()});}});return{root,wheels};},[scene]);
 const spin=useMemo(()=>new THREE.Quaternion(),[]),axis=useMemo(()=>new THREE.Vector3(0,1,0),[]),tilt=useRef();
 useFrame(()=>{const s=motion.current;spin.setFromAxisAngle(axis,(s.distance||0)/.119);model.wheels.forEach(w=>w.object.quaternion.copy(w.quaternion).multiply(spin));if(tilt.current)tilt.current.rotation.x=-.18+(s.pitch||0);});
 return <group ref={tilt} position={[0,.10,.42]} rotation={[-.18,0,0]} name="original-blue-hand-truck-with-rotating-tires">
  <primitive object={model.root} position={[0,-.10,0]} dispose={null}/>
 </group>;
}
export default function ArchiveStreetPorter({time}){
 const root=useRef(),actor=useRef(),{gl}=useThree(),motion=useRef({distance:0,pitch:0});
 const pose=useMemo(()=>({pelvis:.55,pelvisAbsolute:.83,lean:.05,headPitch:.13,headYaw:0,leftHand:new THREE.Vector3(),rightHand:new THREE.Vector3(),leftFoot:new THREE.Vector3(),rightFoot:new THREE.Vector3()}),[]);
 useFrame(()=>{
  if(!root.current)return;const operation=supplyChainAt(time.current),s=operation.porter,position=s.position,c=Math.cos(s.yaw),sn=Math.sin(s.yaw),moving=Boolean(s.moving),stride=s.distance/.43;
  root.current.position.fromArray(position);root.current.rotation.y=s.yaw;
  const onRamp=position[0]>=10.75&&position[0]<=12.25&&position[2]>1.05&&position[2]<4.9;
  const pitch=Number.isFinite(s.pitch)?s.pitch:onRamp?-Math.atan(supplyRampSlope(position[2])*c):0;
  motion.current.distance=s.distance;motion.current.pitch=pitch;
  pose.lean=moving?.065:.025;pose.headYaw=0;pose.headPitch=moving?.13:.20;
  for(const [i,side]of [-1,1].entries()){
   const f=((stride+i*.5)%1+1)%1,foot=side<0?pose.leftFoot:pose.rightFoot;
   let z=.16-f*.43,lift=0;if(f>=.62){const u=(f-.62)/.38;z=-.1066+.2666*u*u*(3-2*u);lift=Math.sin(Math.PI*u)*.065;}
   const x=side*.11,localZ=moving?z:.045,wx=position[0]+c*x+sn*localZ,wz=position[2]-sn*x+c*localZ;
   foot.set(x,supplyFloorHeight(wx,wz)-position[1]+.055+(moving?lift:0),localZ);
   const hand=side<0?pose.leftHand:pose.rightHand;
   const grip=porterToolPoint(position,s.yaw,[side*.14,1.110,.220],pitch),dx=grip[0]-position[0],dz=grip[2]-position[2];
   hand.set(c*dx-sn*dz,grip[1]-position[1],sn*dx+c*dz);
  }
  Object.assign(gl.domElement.dataset,{worldStreetPorterTask:operation.t<28?'receber dois volumes do motorista':operation.t<42?'levar duas caixas do caminhão ao recebimento':operation.t<60?'aguardar a retirada das duas caixas':operation.t<74?'retornar com o carrinho vazio':'carrinho disponível · remessa encaminhada',worldStreetPorterX:position[0].toFixed(3),worldStreetPorterZ:position[2].toFixed(3),worldStreetPorterCases:operation.cases.filter(c=>c.host==='porter').map(c=>c.id).join(',')});
 },-2);
 useEffect(()=>()=>{for(const key of Object.keys(gl.domElement.dataset).filter(k=>k.startsWith('worldStreetPorter')))delete gl.domElement.dataset[key];},[gl]);
 return <group ref={root} name="porter-loading-two-cases-and-delivering-to-warehouse">
  <group ref={actor}><Suspense fallback={null}><ImportedScholar pose={pose} actorRef={actor} variant={0} worker/></Suspense></group>
  <Suspense fallback={null}><HandTruck motion={motion}/></Suspense>
 </group>;
}
