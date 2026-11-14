import React,{useEffect,useMemo} from 'react';
import {MeshReflectorMaterial,useTexture} from '@react-three/drei';
import * as THREE from 'three';
export default function ArchiveFloor({maps,quality}){
 const loaded=useTexture(maps);
 const owned=useMemo(()=>loaded.map((t,i)=>{const c=t.clone();c.wrapS=c.wrapT=THREE.RepeatWrapping;c.repeat.set(7.5,30.54);c.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;c.anisotropy=16;c.needsUpdate=true;return c;}),[...loaded]);
 useEffect(()=>()=>owned.forEach(t=>t.dispose()),[owned]);
 return <mesh rotation={[-Math.PI/2,0,0]} position={[0,.001,-14.95]} receiveShadow><planeGeometry args={[12.5,50.9]}/><MeshReflectorMaterial resolution={quality==='cinema'?1024:512} blur={[150,80]} map={owned[0]} normalMap={owned[1]} normalScale={[.24,.24]} roughnessMap={owned[2]} roughness={.92} metalness={0} color="#c4b298" mirror={.035} mixStrength={.4} mixBlur={1} depthScale={.18} minDepthThreshold={.2} maxDepthThreshold={1.3} reflectorOffset={.002}/></mesh>;
}
