import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Supported archive tools, kept outside every reading and handoff workspace. */
const SUPPORTS=[
 {type:'letter-tray',position:[-4.18,1.230,.06],width:.46,depth:.34},
 {type:'capped-fountain-pen',position:[-4.12,1.230,.98],width:.30,depth:.06},
 {type:'archive-folder',position:[-1.30,1.230,1.06],width:.40,depth:.30},
 {type:'letter-tray',position:[2.18,1.120,-1.55],width:.31,depth:.44},
 {type:'archive-folder',position:[2.62,1.1575,-.81],width:.40,depth:.25},
];
const PI=Math.PI;
function printTexture(kind){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=768;
 const c=canvas.getContext('2d');c.fillStyle=kind==='folder'?'#f0e9d7':'#f5f1e7';c.fillRect(0,0,1024,768);
 c.strokeStyle='#b59c70';c.lineWidth=3;c.strokeRect(38,34,948,700);
 c.fillStyle='#a51c30';c.fillRect(80,82,70,86);c.fillStyle='#f8f2e6';c.font='bold 25px Georgia';c.textAlign='center';c.fillText('VE',115,112);c.fillText('RI',115,136);c.fillText('TAS',115,160);
 c.textAlign='left';c.fillStyle='#21333d';c.font='48px Georgia';c.fillText('HARVARD LIBRARY',192,139);
 c.font='23px Arial';c.fillStyle='#74664e';c.fillText(kind==='folder'?'COLLECTIONS · RESEARCH NOTES':'ARCHIVAL SERVICES · READING ROOM',82,226);
 c.fillStyle='#263b45';c.font='34px Georgia';c.fillText(kind==='folder'?'Catalogue of the Living Archive':'Collection handling record',82,305);
 c.lineWidth=1.4;c.strokeStyle='#a4a6a0';for(let i=0;i<8;i++){const y=360+i*37;c.beginPath();c.moveTo(82,y);c.lineTo(930-(i%3)*105,y);c.stroke();}
 c.font='19px Arial';c.fillStyle='#8a7150';c.fillText('CAMBRIDGE · MASSACHUSETTS · 1636',82,698);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
function createDetails(shared){
 const owned=[],textures=[printTexture('folder'),printTexture('record')],parts=new Map();
 const own=(color,options={})=>{const m=new THREE.MeshPhysicalMaterial({color,roughness:.65,...options});owned.push(m);return m;};
 const m={navy:own('#263946',{roughness:.36,clearcoat:.22,clearcoatRoughness:.35}),
  brass:own('#c0a579',{metalness:.84,roughness:.27}),paper:own('#f2ecdd',{roughness:.92,normalMap:shared?.paper?.normalMap,normalScale:new THREE.Vector2(.03,.03)}),
  crimson:own('#7d2533',{roughness:.62,clearcoat:.08}),cloth:own('#667568',{roughness:.91}),
  folderPrint:own('#ffffff',{map:textures[0],roughness:.83}),recordPrint:own('#ffffff',{map:textures[1],roughness:.89})};
 const mat=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),e=new THREE.Euler();
 const add=(key,g,position,rotation=[0,0,0])=>{
  p.fromArray(position);e.set(...rotation);q.setFromEuler(e);mat.compose(p,q,new THREE.Vector3(1,1,1));g.applyMatrix4(mat);
  if(g.index){const out=g.toNonIndexed();g.dispose();g=out;}
  (parts.get(key)||parts.set(key,[]).get(key)).push(g);
 };
 const box=(key,position,size,radius=.003,rotation)=>add(key,new RoundedBoxGeometry(...size,2,Math.min(radius,...size.map(n=>n/3))),position,rotation);
 const rod=(key,position,radius,length,rotation=[0,0,PI/2])=>add(key,new THREE.CylinderGeometry(radius,radius,length,24),position,rotation);
 const plane=(key,position,w,d,angle=0)=>add(key,new THREE.PlaneGeometry(w,d),position,[-PI/2,0,angle]);
 const tray=(x,y,z,w,d,twoLevels=true)=>{
  const levels=twoLevels?[.006,.091]:[.006];
  // Each sheet is actually supported by a thin metal tray, with a lower front
  // edge, raised sides, corner posts and open access for a hand.
  levels.forEach((h,level)=>{
   box('navy',[x,y+h,z],[w,.012,d],.004);
   for(const side of [-1,1])box('brass',[x+side*(w/2-.006),y+h+.027,z],[.009,.052,d-.01],.003);
   box('brass',[x,y+h+.027,z-d/2+.006],[w-.016,.052,.009],.003);
   box('brass',[x,y+h+.010,z+d/2-.004],[w-.019,.009,.008],.002);
   for(let sheet=0;sheet<5-level;sheet++)box('paper',[x+(sheet%2)*.001,y+h+.0073+sheet*.0013,z+.004],[w-.045,.0012,d-.045],.00035);
   plane('recordPrint',[x,y+h+.008+(4-level)*.0013,z+.004],w-.048,d-.048);
  });
  if(twoLevels)for(const sx of [-1,1])for(const sz of [-1,1])rod('brass',[x+sx*(w/2-.014),y+.056,z+sz*(d/2-.015)],.007,.10,[0,0,0]);
  // A card tab is part of the front lip rather than a floating text label.
  box('brass',[x,y+.023,z+d/2+.002],[w*.33,.025,.010],.003);
 };
 const pen=(x,y,z,angle=.15)=>{
  const point=(dx,dy,dz)=>[x+dx*Math.cos(angle)+dz*Math.sin(angle),y+dy,z-dx*Math.sin(angle)+dz*Math.cos(angle)];
  const rot=[0,angle,PI/2];
  // The flat two-rail pen rest prevents the cylindrical barrel floating above
  // the tabletop; the cap, inset clip and rolled metal bands are separate.
  box('cloth',point(0,.009,0),[.32,.018,.055],.007,[0,angle,0]);
  rod('navy',point(-.035,.027,0),.0095,.22,rot);rod('crimson',point(.097,.028,0),.011,.076,rot);
  for(const dx of [.058,.135,-.14])rod('brass',point(dx,.028,0),.0114,.006,rot);
  box('brass',point(.094,.040,.003),[.055,.003,.006],.001,[0,angle,0]);
 };
 const folder=(x,y,z,w,d,angle)=>{
  const point=(dx,dy,dz)=>[x+dx*Math.cos(angle)+dz*Math.sin(angle),y+dy,z-dx*Math.sin(angle)+dz*Math.cos(angle)];
  box('cloth',point(0,.004,0),[w,.008,d],.004,[0,angle,0]);
  for(let sheet=0;sheet<9;sheet++)box('paper',point(.004,.009+sheet*.0014,.003),[w-.022,.0012,d-.020],.00035,[0,angle,0]);
  box('crimson',point(0,.024,0),[w,.007,d],.004,[0,angle,0]);
  box('crimson',point(-w/2+.010,.015,0),[.021,.026,d],.005,[0,angle,0]);
  plane('folderPrint',point(.014,.0277,0),w*.68,d*.67,angle);
  box('brass',point(w*.34,.029,-d*.38),[.023,.002,.052],.0006,[0,angle,0]);
 };
 tray(-4.18,1.230,.06,.46,.34,true);
 pen(-4.12,1.230,.98,.15);
 folder(-1.30,1.230,1.06,.40,.30,-.025);
 tray(2.18,1.120,-1.55,.31,.44,false);
 pen(2.18,1.120+.0192,-1.51,PI/2);
 folder(2.62,1.1575,-.81,.40,.25,.025);
 const batches=[...parts].map(([key,list])=>{const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());geometry.computeBoundingBox();geometry.computeBoundingSphere();return{key,geometry,material:m[key]};});
 return{batches,dispose(){batches.forEach(b=>b.geometry.dispose());owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
export default function ArchiveDeskDetails({assets}){
 const details=useMemo(()=>createDetails(assets?.mats),[assets]);useEffect(()=>()=>details.dispose(),[details]);
 return <group name="Supported Harvard archive tools — trays, records, folders and capped fountain pens" userData={{supports:SUPPORTS}}>
  {details.batches.map(b=><mesh key={b.key} geometry={b.geometry} material={b.material} castShadow receiveShadow dispose={null}/>)}
 </group>;
}
