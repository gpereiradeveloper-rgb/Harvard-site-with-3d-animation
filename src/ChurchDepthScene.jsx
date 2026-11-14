import React,{Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useViewportRenderQuality} from './RenderQuality';

const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
const PHOTO='/assets/memorial-church-front.jpg';
// This is a photographic projection with authored depth, not a scanned interior.
// Ground and foreground retain the source camera's exact framing at progress=0.
function Projection({motion,active,reduced,paused,onReady}){
 const mesh=useRef(),dust=useRef(),progress=useRef(0),ready=useRef(false);
 const {size,camera,gl,invalidate}=useThree();
 const [texture,setTexture]=useState(null);
 useEffect(()=>{let live=true;const image=new Image();image.onload=()=>{if(!live)return;const map=new THREE.Texture(image);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(16,gl.capabilities.getMaxAnisotropy());map.needsUpdate=true;setTexture(map);invalidate();};image.src=PHOTO;return()=>{live=false;image.onload=null;};},[gl,invalidate]);
 useEffect(()=>()=>texture?.dispose(),[texture]);
 const dimensions=useMemo(()=>{
  const h=2*12*Math.tan(THREE.MathUtils.degToRad(48)/2),w=h*size.width/size.height,aspect=texture?.image?texture.image.width/texture.image.height:1.5032;
  const width=Math.max(w,h*aspect),height=width/aspect;
  return {width,height,doorY:(.5-.791)*height};
 },[size.width,size.height,texture]);
 const geometry=useMemo(()=>{
  const g=new THREE.PlaneGeometry(dimensions.width,dimensions.height,160,112),pos=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<pos.count;i++){
   const u=uv.getX(i),v=uv.getY(i),ground=Math.pow(clamp((.21-v)/.21),1.5),side=clamp((Math.abs(u-.5)-.28)/.22);
   const trees=side*smooth(.12,.45,v)*(1-smooth(.86,1,v));
   const z=ground*4.25+trees*1.5-smooth(.74,1,v)*.45;
   pos.setXYZ(i,(u-.5)*dimensions.width*(12-z)/12,(v-.5)*dimensions.height*(12-z)/12,z);
  }
  g.computeVertexNormals();return g;
 },[dimensions]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const material=useMemo(()=>new THREE.ShaderMaterial({uniforms:{uPhoto:{value:null},uTime:{value:0},uMotion:{value:0},uWind:{value:1}},vertexShader:`
  varying vec2 vUv; varying float vDepth; uniform float uTime; uniform float uWind;
  void main(){vUv=uv; vec3 p=position; float side=smoothstep(.24,.49,abs(uv.x-.5)); float leaves=side*smoothstep(.25,.5,uv.y)*(1.-smoothstep(.88,1.,uv.y)); p.x+=sin(uTime*.65+uv.y*27.)*.006*leaves*uWind; p.y+=sin(uTime*.47+uv.x*31.)*.004*leaves*uWind;vDepth=p.z;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`varying vec2 vUv; varying float vDepth; uniform sampler2D uPhoto;uniform float uMotion;
  void main(){vec3 c=texture2D(uPhoto,vUv).rgb;float edge=pow(length((vUv-.5)*vec2(1.,.75)),1.5);c*=1.-edge*.15;c=mix(c,c*vec3(1.018,1.004,.982),.38);gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
 side:THREE.DoubleSide,toneMapped:false}),[]);
 useEffect(()=>()=>material.dispose(),[material]);
 const particles=useMemo(()=>{
  const a=new Float32Array(160*3);let seed=1636;const rnd=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};for(let i=0;i<160;i++){a[i*3]=(rnd()-.5)*13;a[i*3+1]=(rnd()-.5)*8;a[i*3+2]=2+rnd()*8;}
  return a;
 },[]);
 const target=useMemo(()=>new THREE.Vector3(),[]);
 useFrame((state,delta)=>{
  const p=clamp(motion.progress||0);progress.current=reduced?p:THREE.MathUtils.damp(progress.current,p,14,Math.min(delta,.08));
  const q=progress.current,advance=smooth(.04,.94,q),py=reduced?0:(motion.pointerY||0)*.024,px=reduced?0:(motion.pointerX||0)*.03;
  const cameraY=dimensions.doorY*advance*.96;
  camera.position.set(px,cameraY+py,12-advance*6.2);target.set(0,cameraY,0);camera.lookAt(target);
  if(material){material.uniforms.uPhoto.value=texture;material.uniforms.uWind.value=reduced||paused?0:1;if(!paused)material.uniforms.uTime.value=state.clock.elapsedTime;material.uniforms.uMotion.value=q;}
  if(dust.current){if(!paused&&!reduced){dust.current.rotation.z=Math.sin(state.clock.elapsedTime*.035)*.035;dust.current.position.y=Math.sin(state.clock.elapsedTime*.09)*.14;}dust.current.material.opacity=reduced?0:.18*smooth(.04,.20,q)*(1-smooth(.9,1,q));}
  gl.domElement.dataset.photoProgress=q.toFixed(4);gl.domElement.dataset.photoCameraZ=camera.position.z.toFixed(3);
  if(texture&&!ready.current){ready.current=true;onReady?.();}
 });
 return <>{texture&&<mesh ref={mesh} geometry={geometry} material={material}/>}<points ref={dust}><bufferGeometry><bufferAttribute attach="attributes-position" args={[particles,3]}/></bufferGeometry><pointsMaterial size={.012} color="#ffe3ad" transparent opacity={.12} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending}/></points></>;
}
export default function ChurchDepthScene({motion,quality='high',active=true,reduced=false,paused=false,onReady}){
 const profile=useViewportRenderQuality(quality);
 return <Canvas dpr={profile.dpr} frameloop={active?'always':'demand'} camera={{fov:48,position:[0,0,12],near:.08,far:60}} gl={{alpha:true,antialias:true,powerPreference:'high-performance'}} fallback={<span>Memorial Church, fotografia original com caminho central.</span>} onCreated={({gl})=>{gl.setClearColor('#000000',0);gl.outputColorSpace=THREE.SRGBColorSpace;}}><Suspense fallback={null}><Projection motion={motion} active={active} reduced={reduced} paused={paused} onReady={onReady}/></Suspense></Canvas>;
}
