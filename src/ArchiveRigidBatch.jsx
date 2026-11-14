import React,{useLayoutEffect,useRef} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const formatOf=geometry=>Object.keys(geometry.attributes).sort().map(key=>{
 const a=geometry.attributes[key];return `${key}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`;
}).join('|');

/** Rigid children retain their original materials, UVs, normals and shadows.
 * Repeated source meshes share one instanced geometry; unlike expanding every
 * triangle to non-indexed vertices, mixed shapes retain their native indices.
 * Dynamic refs are excluded with their entire subtree, and a moving parent may
 * freely translate/rotate/scale this batch after it has been prepared.
 */
export function batchRigidChildren(object,dynamicObjects=[]){
 const skip=new Set(dynamicObjects.filter(Boolean)),buckets=new Map(),originals=[],made=[];
 object.updateWorldMatrix(true,true);
 const inverse=object.matrixWorld.clone().invert(),relative=new THREE.Matrix4();
 const visit=node=>{
  if(skip.has(node)||node.isSkinnedMesh||node.isInstancedMesh||node.isBatchedMesh||!node.visible||node.userData?.archiveRigidBatchRoot)return;
  // Hiding a parent mesh would also hide its independently controlled children.
  if(node.isMesh&&!node.children.length&&!Array.isArray(node.material)&&!node.geometry.morphAttributes.position&&!node.customDepthMaterial&&!node.customDistanceMaterial){
   relative.multiplyMatrices(inverse,node.matrixWorld);
   // Mirrored instances require different front-face winding; retain those
   // original meshes rather than silently changing their culling semantics.
   if(relative.determinant()>0&&node.geometry.drawRange.start===0&&node.geometry.drawRange.count===Infinity){
    const key=[node.material.uuid,node.castShadow,node.receiveShadow,node.renderOrder,node.layers.mask,formatOf(node.geometry)].join(':');
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push({node,matrix:relative.clone()});
   }
  }
  node.children.forEach(visit);
 };
 object.children.forEach(visit);
 const add=(mesh,entries)=>{
  const source=entries[0].node;mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;
  mesh.renderOrder=source.renderOrder;mesh.layers.mask=source.layers.mask;
  mesh.name='rigid fittings with original UVs';mesh.userData.archiveRigidBatchGenerated=true;
  object.add(mesh);made.push(mesh);entries.forEach(({node})=>{originals.push(node);node.visible=false;});
 };
 for(const entries of buckets.values()){
  if(entries.length<2)continue;
  const source=entries[0].node;
  if(entries.every(entry=>entry.node.geometry===source.geometry)){
   const mesh=new THREE.InstancedMesh(source.geometry,source.material,entries.length);
   entries.forEach((entry,index)=>mesh.setMatrixAt(index,entry.matrix));mesh.instanceMatrix.needsUpdate=true;
   mesh.computeBoundingBox();mesh.computeBoundingSphere();add(mesh,entries);
   continue;
  }
  // Mixed rigid shapes still use one draw per compatible material. Giving a
  // non-indexed shape an identity index joins it to indexed shapes without
  // expanding any vertices (or splitting a previous single draw into many).
  const indexed=entries.some(({node})=>node.geometry.index);
  const parts=entries.map(({node,matrix})=>{
   const geometry=node.geometry.clone().applyMatrix4(matrix);
   if(indexed&&!geometry.index){
    const count=geometry.attributes.position.count,index=new (count>65535?Uint32Array:Uint16Array)(count);
    for(let i=0;i<count;i++)index[i]=i;
    geometry.setIndex(new THREE.BufferAttribute(index,1));
   }
   return geometry;
  });
  const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());
  if(geometry){geometry.computeBoundingBox();geometry.computeBoundingSphere();add(new THREE.Mesh(geometry,source.material),entries);}
 }
 object.userData.rigidBatch={originalMeshes:originals.length,draws:made.length};
 return()=>{
  originals.forEach(node=>{node.visible=true;});
  made.forEach(mesh=>{object.remove(mesh);if(mesh.isInstancedMesh)mesh.dispose();else mesh.geometry.dispose();});
  delete object.userData.rigidBatch;
 };
}

export default function ArchiveRigidBatch({children,dynamicRefs=[],...props}){
 const root=useRef();
 useLayoutEffect(()=>batchRigidChildren(root.current,dynamicRefs.flatMap(r=>Array.isArray(r.current)?r.current:[r.current])),[children]);
 return <group {...props} ref={root} userData={{...props.userData,archiveRigidBatchRoot:true}}>{children}</group>;
}
