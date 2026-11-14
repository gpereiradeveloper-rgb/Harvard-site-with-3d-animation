import React,{Suspense,useEffect,useMemo} from 'react';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import optimer from 'three/examples/fonts/optimer_regular.typeface.json';
import * as THREE from 'three';
import PortalView from './PortalView';
const FONT=new FontLoader().parse(optimer),SIZE=.40;
export default function PagePortal({anchor,motion,enabled,type='yard'}){
 const data=useMemo(()=>{
  const word=new TextGeometry('VERITAS',{font:FONT,size:SIZE,depth:.024,curveSegments:16,bevelEnabled:true,bevelThickness:.0017,bevelSize:.0012,bevelSegments:3});word.computeBoundingBox();
  const center=(word.boundingBox.max.x+word.boundingBox.min.x)/2;word.translate(-center,0,0);
  const offset=[...'VERIT'].reduce((a,c)=>a+FONT.data.glyphs[c].ha*SIZE/FONT.data.resolution,0)-center;
  const letter=FONT.generateShapes('A',SIZE)[0],counter=letter.holes[0];
  const shape=new THREE.Shape(counter.getPoints(32));const hole=new THREE.ShapeGeometry(shape);hole.computeBoundingBox();
  const cx=(hole.boundingBox.max.x+hole.boundingBox.min.x)/2,cy=(hole.boundingBox.max.y+hole.boundingBox.min.y)/2;hole.translate(-cx,-cy,0);
  return{word,hole,anchor:[offset+cx,-1.42+cy,.232]};
 },[]);
 useEffect(()=>()=>{data.word.dispose();data.hole.dispose();},[data]);
 return <><mesh geometry={data.word} position={[0,-1.42,.229]} castShadow receiveShadow><meshPhysicalMaterial color="#ac853e" roughness={.3} metalness={.8} clearcoat={.05}/></mesh><group ref={anchor} position={data.anchor}>{enabled&&<Suspense fallback={null}><PortalView geometry={data.hole} type={type} motion={motion}/></Suspense>}</group></>;
}
