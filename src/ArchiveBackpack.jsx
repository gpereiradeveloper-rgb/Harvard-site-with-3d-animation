import React,{useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {BACKPACK_HEIGHT,backpackHomeAt,backpackScratch,updateBackpackTransform} from './ArchiveBackpackMotion';

const MODEL='/assets/study-devices/jansport-backpack.glb';

/** Google Research's photographed JanSport school bag, with original UVs/straps. */
export default function ArchiveBackpack({pose,actorRef,socket,home}){
 const root=useRef(),fallbackHome=useRef(null),{scene}=useGLTF(MODEL);
 const scratch=useMemo(backpackScratch,[]);
 const kit=useMemo(()=>{
  const model=scene.clone(true),materials=[];
  model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const fit=BACKPACK_HEIGHT/size.y;
  model.scale.multiplyScalar(fit);
  model.position.set(-center.x*fit,-bounds.min.y*fit,-center.z*fit);
  const facing=new THREE.Group();facing.rotation.y=Math.PI;facing.add(model);
  model.traverse(mesh=>{
   if(!mesh.isMesh)return;
   mesh.castShadow=true;mesh.receiveShadow=true;
   const copy=material=>{const m=material.clone();m.roughness=.88;m.metalness=0;materials.push(m);return m;};
   mesh.material=Array.isArray(mesh.material)?mesh.material.map(copy):copy(mesh.material);
  });
  return{model:facing,materials};
 },[scene]);
 useEffect(()=>()=>kit.materials.forEach(m=>m.dispose()),[kit]);
 useFrame(()=>{
  const actor=actorRef?.current;
  if(!actor||!root.current)return;
  if(!home&&!fallbackHome.current){
   // A seated reader leaves the bag beside the chair, not attached to the torso.
   const yaw=new THREE.Euler().setFromQuaternion(actor.quaternion,'YXZ').y;
   fallbackHome.current=backpackHomeAt(actor.position.toArray(),yaw);
  }
  updateBackpackTransform(root.current,actor,home||fallbackHome.current,socket,Boolean(pose?.backpackWorn),scratch);
 },-.5);
 return <group ref={root} name="Google scanned JanSport backpack — persistent chair-side place" userData={{source:'Google Scanned Objects',license:'CC-BY-4.0',support:'floor beside own chair'}}><primitive object={kit.model} dispose={null}/></group>;
}
