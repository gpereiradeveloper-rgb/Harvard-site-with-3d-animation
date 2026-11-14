import React,{useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import ArchiveBackpack from './ArchiveBackpack';
import ArchiveServiceWear from './ArchiveServiceWear';
import {createBackpackSocket} from './ArchiveBackpackMotion';
import {createAuthoredLocomotion,applyAuthoredLocomotion} from './ArchiveHumanMotion';
import {configureModelCulling} from './ArchiveModelCulling';

// Downloaded, redistributable CC0 assets. Provenance and checksums live next to
// the files in public/assets/ready-models/CREDITS.md; these are not generated
// approximations of a designer's proprietary meshes.
const PLANT='/assets/ready-models/potted-plant/potted_plant_01_2k.gltf';
const SAM='/assets/ready-models/sam-locomotion-crowd-lod.glb';
const HARPER='/assets/ready-models/harper-walk-crowd-lod.glb';
const Y=new THREE.Vector3(0,1,0);

function cloneMaterials(object,variant=0,worker=false){
 const own=[];
 const palette=['#4c6052','#7c3944','#35495e','#a28b69'];
 const cache=new Map();
 configureModelCulling(object);
 object.traverse(node=>{
  if(!node.isMesh)return;
  node.castShadow=!/teeth|eyelash|eyebrow|hairline|eyeball|ankle lining|low.poly/i.test(node.name);node.receiveShadow=true;
  if(/briefcase|accessory|carried bag/i.test(node.name))node.visible=false;
  const clone=material=>{
   if(cache.has(material))return cache.get(material);
   const cloth=/original top|tailored business fabric/i.test(material.name);
   const skin=/body|skin/i.test(material.name)&&!/accessory/i.test(material.name)&&material.roughness<.48;
   if(!cloth&&!skin){
    // Immutable original materials and maps can be shared by every skeleton.
    // Only the recoloured garment needs a per-actor material/uniform set.
    if(material.map)material.map.anisotropy=4;
    cache.set(material,material);return material;
   }
   const copy=material.clone();
   if(cloth){
    copy.color.set(worker?'#355e7f':palette[variant%palette.length]);copy.roughness=.79;
   }
   if(/body|skin/i.test(copy.name)&&!/accessory/i.test(copy.name))copy.roughness=Math.max(.48,copy.roughness);
   if(copy.map)copy.map.anisotropy=4;
   cache.set(material,copy);own.push(copy);return copy;
  };
  node.material=Array.isArray(node.material)?node.material.map(clone):clone(node.material);
 });
 return own;
}

/** A photographed botanical model with actual irregular leaves, bark and pot. */
export function ImportedTree({time,position=[2.02,.18,2.04],height=2.2,rotation=0}){
 const {scene}=useGLTF(PLANT),{gl}=useThree();
 const model=useMemo(()=>{
  const root=scene.clone(true),bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
  const fit=height/size.y,center=bounds.getCenter(new THREE.Vector3()),materials=cloneMaterials(root);
  root.scale.multiplyScalar(fit);root.position.set(-center.x*fit,-bounds.min.y*fit,-center.z*fit);
  const leaves=root.getObjectByName('potted_plant_01_leaves');
  return {root,leaves,materials};
 },[scene,height]);
 useEffect(()=>{gl.domElement.dataset.worldBotanicalModel='Poly Haven Potted Plant 01 / CC0 / PBR 2K';return()=>{delete gl.domElement.dataset.worldBotanicalModel;model.materials.forEach(m=>m.dispose());};},[gl,model]);
 useFrame(()=>{
  if(model.leaves)model.leaves.rotation.z=Math.sin((time?.current||0)*.47)*.0035;
 });
 return <group position={position} rotation={[0,rotation,0]} name="photographed-botanical-model"><primitive object={model.root} dispose={null}/></group>;
}

function snapshot(object){return{object,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone()};}
function restore(entry){entry.object.position.copy(entry.position);entry.object.quaternion.copy(entry.quaternion);entry.object.scale.copy(entry.scale);}
function worldPosition(object){return object.getWorldPosition(new THREE.Vector3());}

function createChain(root,upperName,lowerName,endName,side,leg=false){
 const upper=root.getObjectByName(upperName),lower=root.getObjectByName(lowerName),end=root.getObjectByName(endName);
 if(!upper||!lower||!end)return null;
 const a=worldPosition(upper),b=worldPosition(lower),c=worldPosition(end);
 const qa=upper.getWorldQuaternion(new THREE.Quaternion()),qb=lower.getWorldQuaternion(new THREE.Quaternion());
 return{upper,lower,end,side,leg,lengthA:a.distanceTo(b),lengthB:b.distanceTo(c),axisA:b.clone().sub(a).normalize().applyQuaternion(qa.invert()),axisB:c.clone().sub(b).normalize().applyQuaternion(qb.invert()),endQ:end.getWorldQuaternion(new THREE.Quaternion()),
  start:new THREE.Vector3(),target:new THREE.Vector3(),direction:new THREE.Vector3(),pole:new THREE.Vector3(),elbow:new THREE.Vector3(),delta:new THREE.Vector3(),axis:new THREE.Vector3(),parentScale:new THREE.Vector3(),q:new THREE.Quaternion(),qParent:new THREE.Quaternion(),qCurrent:new THREE.Quaternion(),authoredUpper:new THREE.Quaternion(),authoredLower:new THREE.Quaternion(),reachError:0};
}

function aim(bone,axis,direction,s){
 bone.getWorldQuaternion(s.qCurrent);s.axis.copy(axis).applyQuaternion(s.qCurrent).normalize();
 s.q.setFromUnitVectors(s.axis,direction.normalize()).multiply(s.qCurrent);
 bone.parent.getWorldQuaternion(s.qParent).invert();bone.quaternion.copy(s.qParent.multiply(s.q));bone.updateMatrixWorld(true);
}

function solveChain(chain,target,actor,actorScale){
 if(!chain)return;
 const s=chain;
 s.upper.getWorldPosition(s.start);s.target.copy(target);actor.localToWorld(s.target);
 s.direction.subVectors(s.target,s.start);const distance=s.direction.length();s.direction.normalize();
 // Protract the shoulder by at most 5.5cm for the final reach; imported arm
 // lengths and bone scales stay intact. This models scapular travel rather
 // than stretching upper arms and forearms by up to sixteen percent.
 const a=s.lengthA*actorScale,b=s.lengthB*actorScale;
 if(!s.leg&&distance>a+b-.0001){
  const shift=Math.min(distance-a-b+.00015,.055*actorScale);
  s.delta.copy(s.direction).multiplyScalar(shift);
  s.upper.parent.getWorldQuaternion(s.qParent).invert();
  s.upper.parent.getWorldScale(s.parentScale);
  s.delta.applyQuaternion(s.qParent).divide(s.parentScale);
  s.upper.position.add(s.delta);s.upper.updateMatrixWorld(true);s.upper.getWorldPosition(s.start);
  s.direction.subVectors(s.target,s.start).normalize();
 }
 const adjusted=s.target.distanceTo(s.start),d=THREE.MathUtils.clamp(adjusted,.015,a+b-.0001);
 s.reachError=Math.max(0,adjusted-(a+b));
 s.pole.set(s.side*(s.leg?.12:.65),s.leg?0:-.17,s.leg?1:.60).transformDirection(actor.matrixWorld);
 s.pole.addScaledVector(s.direction,-s.pole.dot(s.direction)).normalize();
 const along=(a*a-b*b+d*d)/(2*d),bend=Math.sqrt(Math.max(0,a*a-along*along));
 s.elbow.copy(s.start).addScaledVector(s.direction,along).addScaledVector(s.pole,bend);
 s.delta.subVectors(s.elbow,s.start);aim(s.upper,s.axisA,s.delta,s);
 s.lower.getWorldPosition(s.start);s.delta.subVectors(s.target,s.start);aim(s.lower,s.axisB,s.delta,s);
 if(s.leg){
  // MakeHuman's foot effectors are siblings of its torso, rather than children
  // of the calves. Preserve their independent planted position and rotation.
  s.end.position.copy(s.target);s.end.parent.worldToLocal(s.end.position);
  actor.getWorldQuaternion(s.q);s.q.multiply(s.endQ);s.end.parent.getWorldQuaternion(s.qParent).invert();s.end.quaternion.copy(s.qParent.multiply(s.q));s.end.updateMatrixWorld(true);
 }
}

/**
 * Real skinned MakeHuman anatomy, clothing and skin textures, driven by the
 * existing archive task's hand/foot targets. The scene's shared clock and task
 * sequencing remain the authority, so books, stamps and parcels stay in sync.
 */
export function ImportedScholar({pose,actorRef,actorScale=1,variant=0,time,walk=false,backpack=false,backpackHome,worker=false}){
 const source=variant%2?HARPER:SAM;
 const {scene,animations}=useGLTF(source),local=useRef();
 const data=useMemo(()=>{
  const model=cloneSkeleton(scene),materials=cloneMaterials(model,variant,worker);
  // Fit to an adult's 1.70m height, including any scale on the task's actor.
  // This keeps a circulation figure and a seated reader anatomically consistent.
  const holder=new THREE.Group();holder.add(model);holder.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;
  // Refs are unset on a cached model's first render. Use the declared parent
  // scale so a warm load and a suspended load produce the same adult height.
  const fit=1.72/(height*actorScale);holder.scale.setScalar(fit);holder.position.y=-bounds.min.y*fit;holder.updateMatrixWorld(true);
  const bones=[];holder.traverse(node=>{if(node.isBone)bones.push(snapshot(node));});
  const pelvis=holder.getObjectByName('pelvis'),head=holder.getObjectByName('head'),spine=holder.getObjectByName('spine_03');
  const chains=[
   createChain(holder,'upperarm_r','lowerarm_r','hand_r',-1),createChain(holder,'upperarm_l','lowerarm_l','hand_l',1),
   createChain(holder,'thigh_r','calf_r','foot_r',-1,true),createChain(holder,'thigh_l','calf_l','foot_l',1,true),
  ];
  const mixer=new THREE.AnimationMixer(model),clip=animations.find(c=>c.name==='Walk_Relaxed')||animations[0];
  if(walk&&clip)mixer.clipAction(clip).play();
  const backpackSocket=createBackpackSocket(spine,actorScale),locomotion=createAuthoredLocomotion(holder,animations);
  return{holder,model,materials,bones,pelvis,head,spine,chains,mixer,backpackSocket,locomotion,p:new THREE.Vector3(),q:new THREE.Quaternion(),q2:new THREE.Quaternion(),axis:new THREE.Vector3(1,0,0),worldScale:new THREE.Vector3(),actorScale,bindPelvis:pelvis?worldPosition(pelvis).y:.55};
 },[scene,animations,variant,walk,worker,actorScale]);
 useEffect(()=>()=>{data.mixer.stopAllAction();data.mixer.uncacheRoot(data.model);data.materials.forEach(m=>m.dispose());},[data]);
 useFrame(()=>{
  const actor=actorRef?.current||local.current;if(!actor)return;
  if(walk){data.mixer.setTime((time?.current||0)*.60);return;}
  if(!pose||!data.pelvis)return;
  data.bones.forEach(restore);
  const walkWeight=applyAuthoredLocomotion(data.locomotion,pose);
  data.holder.updateMatrixWorld(true);
  // Standing task targets used the former 0.55m toy pelvis. Seat targets are
  // already tied to the actual stool height, so preserve those independently.
  const pelvisHeight=Number.isFinite(pose.pelvisAbsolute)?pose.pelvisAbsolute:pose.pelvis>=.70?pose.pelvis:.83/data.actorScale+pose.pelvis-.55;
  data.p.set(0,pelvisHeight,0);actor.localToWorld(data.p);data.pelvis.position.copy(data.p);data.pelvis.parent.worldToLocal(data.pelvis.position);
  data.holder.updateMatrixWorld(true);
  // The upper torso leans independently; IK then reattaches the hands to the
  // book or instrument after that change in posture.
  if(data.spine){data.spine.rotateX(pose.lean||0);data.spine.updateMatrixWorld(true);}
  if(data.head){data.head.rotateX(pose.headPitch||0);data.head.rotateZ(pose.headYaw||0);data.head.updateMatrixWorld(true);}
  actor.getWorldScale(data.worldScale);
  data.chains.forEach((chain,i)=>{
   if(!chain)return;
   const taskWeight=i<2?1-walkWeight*(1-(pose.handTaskWeight??1)):1;
   if(taskWeight<.0001)return;
   chain.authoredUpper.copy(chain.upper.quaternion);chain.authoredLower.copy(chain.lower.quaternion);
   const target=i===0?pose.leftHand:i===1?pose.rightHand:i===2?pose.leftFoot:pose.rightFoot;
   solveChain(chain,target,actor,data.worldScale.x);
   if(taskWeight<.9999){
    chain.upper.quaternion.slerpQuaternions(chain.authoredUpper,chain.upper.quaternion,taskWeight);
    chain.lower.quaternion.slerpQuaternions(chain.authoredLower,chain.lower.quaternion,taskWeight);
    chain.upper.updateMatrixWorld(true);
   }
  });
 },-1);
 return <group ref={local} name={'imported-CC0-scholar-'+variant}><primitive object={data.holder} dispose={null}/>{backpack&&<ArchiveBackpack pose={pose} actorRef={actorRef||local} actorScale={data.actorScale} socket={data.backpackSocket} home={backpackHome}/>} {worker&&<ArchiveServiceWear pose={pose} actorRef={actorRef} head={data.head}/>}</group>;
}

export const READY_MODEL_URLS={plant:PLANT,sam:SAM,harper:HARPER,books:'/assets/ready-models/encyclopedias/book_encyclopedia_set_01_2k.gltf'};
