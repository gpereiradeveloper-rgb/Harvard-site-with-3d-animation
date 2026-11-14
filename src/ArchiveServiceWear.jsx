import React,{useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
export default function ArchiveServiceWear({pose,actorRef,head}){
 const helmet=useRef(),bands=useRef();
 const kit=useMemo(()=>({cap:new THREE.SphereGeometry(.132,32,16,0,Math.PI*2,0,Math.PI/2),brim:new THREE.TorusGeometry(.142,.012,8,40),ridge:new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0,.01,-.12],[0,.11,-.07],[0,.133,0],[0,.11,.07],[0,.01,.12]].map(p=>new THREE.Vector3(...p))),24,.009,6,false),hat:new THREE.MeshPhysicalMaterial({color:'#cf6d2c',roughness:.39,clearcoat:.4,metalness:.07}),reflective:new THREE.MeshStandardMaterial({color:'#d5d49d',roughness:.5,metalness:.15}),p:new THREE.Vector3(),q:new THREE.Quaternion()}),[]);
 useEffect(()=>()=>{for(const k of ['cap','brim','ridge','hat','reflective'])kit[k].dispose();},[kit]);
 useFrame(()=>{if(!actorRef?.current||!head)return;head.getWorldPosition(kit.p);actorRef.current.worldToLocal(kit.p);helmet.current.position.copy(kit.p).add(new THREE.Vector3(0,.15,.005));helmet.current.rotation.set((pose.headPitch||0)*.6,pose.headYaw||0,0);const h=pose.pelvisAbsolute??.83;bands.current.position.set(0,h+.39,.137);bands.current.rotation.x=pose.lean||0;});
 return <group name="Library receiving workwear"><group ref={helmet}><mesh geometry={kit.cap} material={kit.hat} castShadow/><mesh geometry={kit.brim} material={kit.hat} rotation={[Math.PI/2,0,0]} castShadow/><mesh geometry={kit.ridge} material={kit.hat} castShadow/></group><group ref={bands}>{[-1,1].map(side=><mesh key={side} position={[side*.13,.02,0]} material={kit.reflective}><boxGeometry args={[.022,.27,.012]}/></mesh>)}<mesh position={[0,-.075,.003]} material={kit.reflective}><boxGeometry args={[.33,.022,.012]}/></mesh></group></group>;
}
