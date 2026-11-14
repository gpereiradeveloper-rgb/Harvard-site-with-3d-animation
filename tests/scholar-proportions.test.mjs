import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import {Box3,Group,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {configureModelCulling} from '../src/ArchiveModelCulling.js';

// These tests inspect the downloaded mesh vertices. Texture decoding does not
// affect the skeleton or dimensions and needs no browser/GPU.
globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
globalThis.ProgressEvent=class{};
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function vertexBounds(model){
 model.updateMatrixWorld(true);
 const box=new Box3(),point=new Vector3();
 model.traverse(mesh=>{
  if(!mesh.isMesh)return;
  for(let i=0;i<mesh.geometry.attributes.position.count;i++){
   mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);
   box.expandByPoint(point);
  }
 });
 return box;
}

for(const name of ['sam-locomotion-crowd-lod','harper-walk-crowd-lod']){
 test(name+': culling preserves measured bounds and original body proportions',async()=>{
  const bytes=fs.readFileSync(path.join(project,'public/assets/ready-models',name+'.glb'));
  const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const model=clone(scene),before=new Box3().setFromObject(model),nativeSize=vertexBounds(model).getSize(new Vector3());
  configureModelCulling(model);
  configureModelCulling(model); // Reapplying must not inflate the fitting box.
  const after=new Box3().setFromObject(model);
  assert.ok(before.min.distanceTo(after.min)<1e-9,'Culling changed fitting-box minimum');
  assert.ok(before.max.distanceTo(after.max)<1e-9,'Culling changed fitting-box maximum');
  const holder=new Group(),actor=new Group();holder.add(model);actor.add(holder);
  for(const actorScale of [.79,1,1.10,1.19]){
   holder.scale.setScalar(1.72/(nativeSize.y*actorScale));actor.scale.setScalar(actorScale);
   const visibleSize=vertexBounds(actor).getSize(new Vector3());
   assert.ok(Math.abs(visibleSize.y-1.72)<1e-6,'Actual vertices must remain 1.72m tall');
   assert.ok(Math.abs(visibleSize.x/visibleSize.y-nativeSize.x/nativeSize.y)<1e-6,'Body became narrower');
   assert.ok(Math.abs(visibleSize.z/visibleSize.y-nativeSize.z/nativeSize.y)<1e-6,'Body became thinner');
  }
 });
}
