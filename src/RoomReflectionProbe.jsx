import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
/** Capture real room/sky radiance once, rather than drawing a photograph on glass. */
export default function RoomReflectionProbe({onReady}){
 const {gl,scene}=useThree(),frames=useRef(0),done=useRef(false);
 const {target,camera}=useMemo(()=>{const target=new THREE.WebGLCubeRenderTarget(256,{type:THREE.HalfFloatType,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});const camera=new THREE.CubeCamera(.08,180,target);camera.position.set(0,3.2,-16);return{target,camera};},[]);
 useFrame(()=>{
  if(done.current||++frames.current<8)return;
  const hidden=[];scene.traverse(o=>{if(o.isMesh&&o.name==='Archive glass'){hidden.push([o,o.visible]);o.visible=false;}});
  try{camera.update(gl,scene);done.current=true;onReady(target.texture);}finally{hidden.forEach(([o,v])=>{o.visible=v;});}
 });
 useEffect(()=>()=>target.dispose(),[target]);return null;
}
