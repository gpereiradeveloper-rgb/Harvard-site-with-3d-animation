import React,{useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Sky,useGLTF,useTexture} from '@react-three/drei';
import * as THREE from 'three';
const BASE='/assets/exterior/';
const TREES=[{position:[17,0,3],scale:.56,angle:.7},{position:[22,0,-27],scale:.64,angle:2.2},{position:[.6,0,-57],scale:.64,angle:-.4}];
function TreeInstances({geometry,material,sourceMatrix}){
 const ref=useRef();
 useLayoutEffect(()=>{const m=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),s=new THREE.Vector3();TREES.forEach((t,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),t.angle);p.fromArray(t.position);s.setScalar(t.scale);m.compose(p,q,s).multiply(sourceMatrix);ref.current.setMatrixAt(i,m);});ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere();},[sourceMatrix]);
 return <instancedMesh ref={ref} args={[geometry,material,TREES.length]} castShadow receiveShadow/>;
}
/** All scenery behind the glazing occupies actual world-space distances.
 * The tree is licensed CC0 foliage, not a scan or survey of Harvard's grounds. */
export default function ArchiveExterior({reducedMotion=false}){
 const tree=useGLTF(BASE+'jacaranda_tree/jacaranda-compact.gltf');
 const alpha=useTexture(BASE+'jacaranda_tree/textures/jacaranda_tree_leaves_alpha_2k.jpg');
 const ground=useTexture(['diff','nor_gl','rough'].map(k=>BASE+`ground/forest_floor_${k}_2k.jpg`));
 const time=useMemo(()=>({value:0}),[]);
 const data=useMemo(()=>{
  tree.scene.updateMatrixWorld(true);const parts=[];
  tree.scene.traverse(o=>{if(!o.isMesh)return;const material=o.material.clone(),leaves=material.name.includes('leaves');
   for(const k of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(material[k])material[k].anisotropy=8;
   material.envMapIntensity=.6;
   if(leaves){material.transparent=false;material.alphaMap=alpha;material.alphaTest=.43;material.depthWrite=true;material.side=THREE.DoubleSide;material.roughness=.86;material.color.multiply(new THREE.Color('#d2d0ac'));material.onBeforeCompile=shader=>{shader.uniforms.treeTime=time;shader.vertexShader='uniform float treeTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(treeTime*.55+position.y*13.+position.z*7.)*.0013*smoothstep(-.5,.85,position.y);');};material.customProgramCacheKey=()=> 'archive-leaf-breeze-v1';}
   parts.push({geometry:o.geometry,material,sourceMatrix:o.matrixWorld.clone()});
  });
  const maps=ground.map((t,i)=>{const c=t.clone();c.wrapS=c.wrapT=THREE.RepeatWrapping;c.repeat.set(28,48);c.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;c.anisotropy=16;c.needsUpdate=true;return c;});
  return{parts,maps};
 },[tree.scene,alpha,...ground,time]);
 useFrame(({clock})=>{time.value=reducedMotion?0:clock.elapsedTime;});
 useEffect(()=>{alpha.colorSpace=THREE.NoColorSpace;alpha.needsUpdate=true;},[alpha]);
 useEffect(()=>()=>{data.parts.forEach(p=>p.material.dispose());data.maps.forEach(t=>t.dispose());},[data]);
 return <group name="Physical garden beyond the windows">
  <Sky distance={450000} sunPosition={[140,100,50]} turbidity={3.2} rayleigh={1.5} mieCoefficient={.004} mieDirectionalG={.82}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[19,-.11,-20]} receiveShadow><planeGeometry args={[75,110]}/><meshStandardMaterial map={data.maps[0]} normalMap={data.maps[1]} normalScale={[.45,.45]} roughnessMap={data.maps[2]} roughness={.97} color="#bdb79e"/></mesh>
  {data.parts.map((p,i)=><TreeInstances key={i} {...p}/>)}
 </group>;
}
