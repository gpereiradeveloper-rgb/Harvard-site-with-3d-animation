import React,{Suspense,useEffect,useMemo} from 'react';
import {useThree,useFrame} from '@react-three/fiber';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';
import PortalView,{librarySource} from './PortalView';
import {makeFibreTexture} from './SurfaceDetail';
function archShape(width,height){const s=new THREE.Shape(),r=width/2,base=-height/2,shoulder=height/2-r;s.moveTo(-r,base);s.lineTo(r,base);s.lineTo(r,shoulder);s.absarc(0,shoulder,r,0,Math.PI,false);s.lineTo(-r,base);return s;}
export default function LibrarySpace({onReady,portalAnchor,motion}){
 const {gl,size}=useThree(),map=useTexture(librarySource(gl,size.width));
 const data=useMemo(()=>{
  const outer=archShape(2.78,4.65),inner=archShape(2.43,4.27);outer.holes.push(new THREE.Path(inner.getPoints(64)));
  const ring=new THREE.ExtrudeGeometry(outer,{depth:.105,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:3,curveSegments:48});
  const opening=new THREE.ShapeGeometry(inner,48),fibre=makeFibreTexture();return{ring,opening,fibre};
 },[]);
 useEffect(()=>{map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=16;onReady?.();},[map,onReady]);
 useEffect(()=>()=>{data.ring.dispose();data.opening.dispose();data.fibre.dispose();},[data]);
 useFrame(()=>{if(portalAnchor.current)portalAnchor.current.scale.setScalar(THREE.MathUtils.smoothstep(motion.progress,.748,.795));});
 const height=24*Math.tan(Math.PI/6),width=height*(map.image.width/map.image.height);
 return <><mesh position={[0,0,-12]}><planeGeometry args={[width,height]}/><meshBasicMaterial map={map} toneMapped={false}/></mesh>
 <group ref={portalAnchor} position={[1.55,-.10,-6.8]}>
  <mesh geometry={data.ring} castShadow receiveShadow><meshPhysicalMaterial color="#73502a" metalness={.82} roughness={.39} bumpMap={data.fibre} bumpScale={.0006} roughnessMap={data.fibre}/></mesh>
  <Suspense fallback={null}><PortalView geometry={data.opening} type="yard"/></Suspense>
  <mesh position={[0,-2.30,.07]}><boxGeometry args={[2.98,.11,.40]}/><meshStandardMaterial color="#a29272" roughness={.88} bumpMap={data.fibre} bumpScale={.002}/></mesh>
 </group></>;
}
