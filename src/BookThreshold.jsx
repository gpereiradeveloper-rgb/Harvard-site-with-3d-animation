import React,{Suspense,useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Environment,Lightformer} from '@react-three/drei';
import * as THREE from 'three';
import VeritasBook from './VeritasBook';
import {useViewportRenderQuality} from './RenderQuality';
const clamp=n=>THREE.MathUtils.clamp(n,0,1),smooth=THREE.MathUtils.smoothstep;
function ThresholdScene({journey,reduced,onReady}){
 const root=useRef(),anchor=useRef(),ready=useRef(false),{camera,size}=useThree();
 const motion=useMemo(()=>({progress:0,journey:.7,pointerX:0,pointerY:0}),[]),v=useMemo(()=>({point:new THREE.Vector3(),normal:new THREE.Vector3(),q:new THREE.Quaternion(),eye:new THREE.Vector3(),target:new THREE.Vector3()}),[]);
 useEffect(()=>{onReady?.();},[onReady]);
 useFrame(()=>{
  const p=journey.progress,ending=p>.84;
  motion.progress=ending?.77:clamp((p-.1)/.22)*.77;
  motion.pointerX=0;motion.pointerY=0;
  const aspect=size.width/size.height,portrait=aspect<1.15;
  const viewHeight=2*9.2*Math.tan(THREE.MathUtils.degToRad(36)/2),viewWidth=viewHeight*aspect;
  // An opened folio spans almost seven model units. Fit that entire spread,
  // including the left cover, before beginning the deliberate portal close-up.
  const scale=portrait?Math.min(.40,viewWidth*.69/7):Math.min(ending?.52:.62,viewWidth*.45/7);
  if(root.current){root.current.position.set(portrait?scale*1.5:ending?-.2:viewWidth*.24,portrait?(ending?-1.7:-.7):ending?.05:0,0);root.current.scale.setScalar(scale);root.current.visible=p>.08&&(p<.43||ending);}
  v.eye.set(0,0,9.2);v.target.set(0,0,0);let distance=9.2;
  if(!ending&&p>.30&&anchor.current){anchor.current.updateWorldMatrix(true,false);anchor.current.getWorldPosition(v.point);anchor.current.getWorldQuaternion(v.q);v.normal.set(0,0,1).applyQuaternion(v.q);const travel=smooth(p,.30,.425),align=smooth(p,.30,.345);distance=9.2*Math.pow(.0008/9.2,travel);v.eye.lerp(v.target.copy(v.point).addScaledVector(v.normal,distance),align);v.target.set(0,0,0).lerp(v.point,align);}
  camera.position.copy(v.eye);camera.lookAt(v.target);camera.near=Math.min(.05,distance*.1);camera.updateProjectionMatrix();
  if(!ready.current){ready.current=true;onReady?.();}
 });
 return <><ambientLight intensity={.5}/><directionalLight position={[-4,6,6]} intensity={3.2} color="#fff1da"/><directionalLight position={[5,1,3]} intensity={1.1} color="#b9d2e7"/><Environment resolution={256}><Lightformer position={[-4,4,5]} rotation-y={.4} scale={[3,7,1]} color="#ffe7bb" intensity={2.3}/><Lightformer position={[5,1,4]} rotation-y={-.5} scale={[3,6,1]} color="#c7e2f3" intensity={1.2}/></Environment><group ref={root}><VeritasBook motion={motion} reducedMotion={reduced} portalAnchor={anchor} portalEnabled portalType="library" resting/></group></>;
}
export default function BookThreshold({journey,quality,reduced,active,onReady}){
 const profile=useViewportRenderQuality(quality);
 return <Canvas dpr={profile.dpr} frameloop={active?'always':'demand'} camera={{position:[0,0,9.2],fov:36,near:.05,far:80}} gl={{alpha:true,antialias:true,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.05;gl.setClearColor('#000',0);}}><Suspense fallback={null}><ThresholdScene journey={journey} reduced={reduced} onReady={onReady}/></Suspense></Canvas>;
}
