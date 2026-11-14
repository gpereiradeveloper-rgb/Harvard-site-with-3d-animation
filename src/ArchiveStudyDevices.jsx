import React,{Suspense,useEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
const ROOT='/assets/study-devices/';
function DeviceAsset({type='laptop',...props}){
 const {scene,animations}=useGLTF(ROOT+(type==='tablet'?'ipad-mini-6.glb':'macbook-pro-13.glb'));
 const prepared=useMemo(()=>{
  const product=scene.clone(true),object=new THREE.Group(),owned=[];
  object.add(product);
  if(type==='tablet'){
   // The source is portrait and vertical; the study desks use screen-up landscape.
   product.rotation.set(Math.PI/2,0,0);
   object.rotation.y=Math.PI/2;
  }else if(animations.length){
   // The supplied product has a genuine hinged lid. Pose it open and retain
   // the authored keyboard, product markings, materials and display texture.
   const mixer=new THREE.AnimationMixer(product);
   mixer.clipAction(animations[0]).play();mixer.setTime(3.5);
  }
  object.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3());
  const fit=(type==='tablet'?.252:.329)/size.x;
  object.scale.setScalar(fit);
  // Keep the former support plane and keyboard's front edge, so hands and
  // desktop objects stay aligned. Only a uniform scene-fit scale is applied.
  object.position.set(type==='tablet'?0:.0045,-box.min.y*fit,type==='tablet'?-(box.min.z+box.max.z)*.5*fit:.1124980077-box.max.z*fit);
  object.traverse(mesh=>{if(!mesh.isMesh)return;mesh.castShadow=true;mesh.receiveShadow=true;const change=mat=>{const m=mat.clone();owned.push(m);return m;};mesh.material=Array.isArray(mesh.material)?mesh.material.map(change):change(mesh.material);});return{object,owned};
 },[scene,animations,type]);
 useEffect(()=>()=>prepared.owned.forEach(m=>m.dispose()),[prepared]);
 return <group {...props}><primitive object={prepared.object} dispose={null}/></group>;
}
/** Licensed product models. Authors, sources and adaptations: assets/study-devices/CREDITS.md. */
export function StudyDevice(props){return <Suspense fallback={null}><DeviceAsset {...props}/></Suspense>;}
