import React, { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, Sky, useTexture } from '@react-three/drei';
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import WidenerLibrary from './WidenerLibrary';
import VeritasBook from './VeritasBook';
import { useViewportRenderQuality } from './RenderQuality';

const clamp=n=>THREE.MathUtils.clamp(n,0,1),smooth=THREE.MathUtils.smoothstep;
function rng(seed=1636){return()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};}
function leafShape(){const s=new THREE.Shape();s.moveTo(0,-.5);s.lineTo(-.1,-.13);s.lineTo(-.42,-.18);s.lineTo(-.27,.03);s.lineTo(-.49,.24);s.lineTo(-.15,.2);s.lineTo(0,.54);s.lineTo(.15,.2);s.lineTo(.49,.24);s.lineTo(.27,.03);s.lineTo(.42,-.18);s.lineTo(.1,-.13);s.closePath();return new THREE.ShapeGeometry(s,1);}

function Grove({motion,reducedMotion}){
  const branches=useRef(),leaves=useRef(),scatter=useRef();
  const uniforms=useMemo(()=>({time:{value:0}}),[]);
  const data=useMemo(()=>{
    const r=rng(40),wood=[],crown=[],floor=[];
    const addBranch=(a,b,radius)=>{const d=new THREE.Vector3().subVectors(b,a),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());wood.push({p:a.clone().add(b).multiplyScalar(.5),q,s:new THREE.Vector3(radius,d.length(),radius*.88)});};
    for(const [tx,tz,height] of [[-12,7,13],[12,-3,15],[-17,-6,17],[15,13,14],[-16,19,16],[22,-12,18],[-24,-17,18]]){
      const base=new THREE.Vector3(tx,-3,tz),top=new THREE.Vector3(tx+(r()-.5),height-3,tz+.4);addBranch(base,top,.24+r()*.12);
      for(let n=0;n<9;n++){
        const y=-3+height*(.4+n*.06),angle=r()*Math.PI*2,reach=2.6+r()*3.4;
        const a=new THREE.Vector3(tx,y,tz),b=new THREE.Vector3(tx+Math.cos(angle)*reach,y+2.2+r()*2,tz+Math.sin(angle)*reach);addBranch(a,b,.10*(1-n*.055));
        for(let j=0;j<3;j++){const tip=b.clone().add(new THREE.Vector3((r()-.5)*3,.8+r()*1.5,(r()-.5)*3));addBranch(b,tip,.035);
          for(let k=0;k<35;k++){const p=tip.clone().add(new THREE.Vector3((r()-.5)*3.4,(r()-.5)*2.3,(r()-.5)*3.4));crown.push({p,rot:[r()*Math.PI,r()*Math.PI,r()*Math.PI],scale:.18+r()*.22,color:new THREE.Color().setHSL(.06+r()*.065,.40+r()*.25,.21+r()*.12)});}}
      }
    }
    for(let i=0;i<950;i++){const x=(r()-.5)*50,z=-15+r()*59;if(Math.abs(x)<3.6&&z<7)continue;floor.push({p:new THREE.Vector3(x,-2.975+r()*.025,z),rot:[-Math.PI/2+(r()-.5)*.3,0,r()*Math.PI*2],scale:.08+r()*.16,color:new THREE.Color().setHSL(.055+r()*.07,.4,.19+r()*.13)});}
    return{wood,crown,floor};
  },[]);
  const geometry=useMemo(()=>({wood:new THREE.CylinderGeometry(.8,1,1,9,2),leaf:leafShape()}),[]);
  const material=useMemo(()=>{
    const wood=new THREE.MeshStandardMaterial({color:'#433f31',roughness:.98});
    const leaf=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.83,side:THREE.DoubleSide});
    leaf.onBeforeCompile=shader=>{shader.uniforms.leafTime=uniforms.time;shader.vertexShader='uniform float leafTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\ntransformed.z+=sin(leafTime*.7+instanceMatrix[3].x*.5+instanceMatrix[3].z)*.05*uv.y;\n#endif');};
    leaf.customProgramCacheKey=()=> 'harvard-leaf-wind-v1';
    return{wood,leaf};
  },[uniforms]);
  useLayoutEffect(()=>{
    const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),e=new THREE.Euler();
    data.wood.forEach((v,i)=>{m.compose(v.p,v.q,v.s);branches.current.setMatrixAt(i,m);});branches.current.instanceMatrix.needsUpdate=true;branches.current.computeBoundingSphere();
    for(const [mesh,items] of [[leaves.current,data.crown],[scatter.current,data.floor]]){items.forEach((v,i)=>{e.set(...v.rot);q.setFromEuler(e);s.setScalar(v.scale);m.compose(v.p,q,s);mesh.setMatrixAt(i,m);mesh.setColorAt(i,v.color);});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}
  },[data]);
  useFrame(state=>{uniforms.time.value=reducedMotion?0:state.clock.elapsedTime;});
  useEffect(()=>()=>{Object.values(geometry).forEach(g=>g.dispose());Object.values(material).forEach(m=>m.dispose());},[geometry,material]);
  return <group><instancedMesh ref={branches} args={[geometry.wood,material.wood,data.wood.length]} castShadow receiveShadow/><instancedMesh ref={leaves} args={[geometry.leaf,material.leaf,data.crown.length]} castShadow receiveShadow/><instancedMesh ref={scatter} args={[geometry.leaf,material.leaf,data.floor.length]} receiveShadow/></group>;
}

function Garden(){
  const maps=useTexture(['/assets/architecture/stone-color.jpg','/assets/architecture/stone-normal.jpg','/assets/architecture/stone-roughness.jpg']);
  const owned=useMemo(()=>maps.map((t,i)=>{const c=t.clone();c.wrapS=c.wrapT=THREE.RepeatWrapping;c.repeat.set(24,24);c.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;c.anisotropy=8;c.needsUpdate=true;return c;}),[maps]);
  const geometry=useMemo(()=>{const g=new THREE.PlaneGeometry(140,140,80,80);g.rotateX(-Math.PI/2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);const flat=1-smooth(Math.abs(x),3.5,11);const wave=(Math.sin(x*.12)*Math.sin(z*.11)*.22+Math.sin(z*.04+x*.08)*.24)*(1-flat);p.setY(i,-3.055+wave);}g.computeVertexNormals();return g;},[]);
  useEffect(()=>()=>{owned.forEach(t=>t.dispose());geometry.dispose();},[owned,geometry]);
  return <><mesh geometry={geometry} receiveShadow><meshStandardMaterial normalMap={owned[1]} roughnessMap={owned[2]} normalScale={[.09,.09]} color="#707961" roughness={.98}/></mesh><mesh rotation={[-Math.PI/2,0,0]} position={[0,-3.018,23]} receiveShadow><planeGeometry args={[6.8,34]}/><meshStandardMaterial normalMap={owned[1]} roughness={.94} color="#9e9d92" normalScale={[.035,.035]}/></mesh></>;
}

function FallingLeaves({reducedMotion}){
  const ref=useRef();const count=48;const geometry=useMemo(leafShape,[]);const material=useMemo(()=>new THREE.MeshStandardMaterial({color:'#a16a29',side:THREE.DoubleSide,roughness:.79}),[]);
  const particles=useMemo(()=>{const r=rng(987);return Array.from({length:count},()=>({x:(r()-.5)*27,z:4+r()*18,y:r()*15,rate:.12+r()*.22,phase:r()*Math.PI*2,scale:.09+r()*.08}));},[]);
  const helper=useMemo(()=>new THREE.Object3D(),[]);
  useFrame(state=>{const t=reducedMotion?0:state.clock.elapsedTime;particles.forEach((p,i)=>{helper.position.set(p.x+Math.sin(t*.15+p.phase)*1.1,((p.y-t*p.rate+1000)%15)-2.8,p.z+Math.cos(t*.1+p.phase)*.6);helper.rotation.set(t*.3+p.phase,t*.11+p.phase,Math.sin(t*.6+p.phase));helper.scale.setScalar(p.scale);helper.updateMatrix();ref.current.setMatrixAt(i,helper.matrix);});ref.current.instanceMatrix.needsUpdate=true;});
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  return <instancedMesh ref={ref} args={[geometry,material,count]} frustumCulled={false}/>;
}

function BookReveal({motion,reducedMotion}){
  const ref=useRef();const bookMotion=useMemo(()=>({progress:0,pointerX:0,pointerY:0,mode:'archive',inspection:0}),[]);
  useFrame(()=>{const p=motion.progress;const reveal=smooth(p,.50,.59);ref.current.visible=p>.49&&p<.925;ref.current.position.set(1.15,-1.3+reveal*1.25,6.35);ref.current.scale.setScalar(.44*reveal);bookMotion.progress=clamp((p-.53)/.29)*.78;bookMotion.pointerX=motion.pointerX;bookMotion.pointerY=motion.pointerY;});
  return <group ref={ref} position={[1.15,-1.3,6.35]} scale={0}><VeritasBook motion={bookMotion} reducedMotion={reducedMotion}/></group>;
}

function Yard({motion,quality,onYardReady}){
  const {gl}=useThree();const high=quality!=='auto'&&innerWidth>760&&gl.capabilities.maxTextureSize>=8192;
  const map=useTexture(high?'/assets/harvard-yard-8k.jpg':'/assets/harvard-yard-4k.jpg');
  useEffect(()=>{map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.RepeatWrapping;map.repeat.x=-1;map.offset.x=1;map.anisotropy=4;onYardReady?.();},[map,onYardReady]);
  return <mesh><sphereGeometry args={[90,72,48]}/><meshBasicMaterial map={map} side={THREE.BackSide} toneMapped={false} fog={false}/></mesh>;
}

const PATH=[
  [0,[-13,6.6,29],[-5,.2,1.5]], [.22,[-12,5.5,26],[-5,.15,1.6]], [.38,[-10,3.9,23],[-4.4,.6,1.7]], [.50,[-3,1.0,10.3],[0,.9,1.7]], [.62,[3.4,1.15,11.9],[.0,.1,6.35]], [.76,[3.0,.9,12.6],[.0,.1,6.35]], [.895,[1.2,.35,9.3],[1.15,.1,6.35]], [.93,[.1,0,0],[0,0,0]], [1,[.1,0,0],[0,0,0]],
];
function CameraPath({motion,reducedMotion,controls,world,panorama,onReady,quality}){
  const {camera,gl,size}=useThree();const ready=useRef(false),yardEntered=useRef(false),lastShadow=useRef(-1);const position=useMemo(()=>new THREE.Vector3(),[]),target=useMemo(()=>new THREE.Vector3(),[]),currentTarget=useRef(new THREE.Vector3(-2,.2,1.5));
  useFrame((_,dt)=>{
    if(!world.current||!panorama.current||!controls.current)return;
    const p=motion.progress,final=p>=.931;
    if(!ready.current){ready.current=true;gl.shadowMap.needsUpdate=true;onReady?.();}
    world.current.visible=!final;panorama.current.visible=final;
    controls.current.enabled=final&&p>.96;
    if(final){
      if(!yardEntered.current){camera.position.set(.1,0,0);currentTarget.current.set(0,0,0);controls.current.target.set(0,0,0);camera.lookAt(0,0,0);controls.current.update();yardEntered.current=true;}
      camera.fov=THREE.MathUtils.lerp(camera.fov,72,Math.min(1,dt*8));camera.updateProjectionMatrix();return;
    }
    yardEntered.current=false;
    const next=PATH.findIndex(k=>k[0]>p),i=next<0?PATH.length-2:Math.max(0,next-1),a=PATH[i],b=PATH[i+1],k=smooth(p,a[0],b[0]);
    position.fromArray(a[1]).lerp(new THREE.Vector3().fromArray(b[1]),k);target.fromArray(a[2]).lerp(new THREE.Vector3().fromArray(b[2]),k);
    const portrait=size.width<size.height;
    if(portrait&&p<.52){position.z+=12;position.x*=.68;target.x=0;target.y=.4;}
    if(portrait&&p>=.52&&p<.9){position.z+=2.5;target.x=.7;position.x=1.7;}
    if(!reducedMotion){position.x+=(motion.pointerX||0)*.14;position.y+=(motion.pointerY||0)*.06;}
    const d=reducedMotion?1:1-Math.exp(-5.4*Math.min(dt,.1));camera.position.lerp(position,d);currentTarget.current.lerp(target,d);camera.lookAt(currentTarget.current);camera.fov=THREE.MathUtils.lerp(camera.fov,36,d);camera.updateProjectionMatrix();
    if(Math.abs(p-lastShadow.current)>.008){gl.shadowMap.needsUpdate=true;lastShadow.current=p;}
  });
  return null;
}

function SceneLighting({quality}){
  const {size,gl}=useThree();const shadow=quality==='cinema'?4096:size.width<760?1024:2048;
  useEffect(()=>{gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;},[shadow,gl]);
  return <><hemisphereLight args={['#d1dbe2','#6b6654',1.5]}/><directionalLight key={shadow} position={[-16,25,14]} intensity={3.2} color="#fff1d0" castShadow shadow-mapSize={[shadow,shadow]} shadow-camera-left={-27} shadow-camera-right={27} shadow-camera-top={27} shadow-camera-bottom={-27} shadow-camera-near={1} shadow-camera-far={90} shadow-bias={-.00018} shadow-normalBias={.03}/><directionalLight position={[9,8,-10]} intensity={1} color="#b4c8de"/><Environment resolution={128}><Lightformer intensity={1.4} color="#fff3dc" position={[-8,12,12]} rotation-y={.4} scale={[14,10,1]}/><Lightformer intensity={.7} color="#bccddb" position={[12,5,-6]} rotation-y={-1.5} scale={[12,8,1]}/></Environment></>;
}

function WorldContent({motion,reducedMotion,quality,onReady}){
  const world=useRef(),panorama=useRef(),controls=useRef();const [loadYard,setLoadYard]=useState(false);const yardReady=useCallbackStable(()=>{});
  useFrame(()=>{if(motion.progress>.76&&!loadYard)setLoadYard(true);});
  return <><fog attach="fog" args={['#c2c9c6',29,90]}/><color attach="background" args={['#c2c9c6']}/><SceneLighting quality={quality}/><group ref={world}><Sky distance={160} sunPosition={[-16,25,14]} turbidity={6} rayleigh={.45} mieCoefficient={.008} mieDirectionalG={.85}/><Garden/><WidenerLibrary motion={motion} reducedMotion={reducedMotion} quality={quality}/><Grove motion={motion} reducedMotion={reducedMotion}/><FallingLeaves reducedMotion={reducedMotion}/><BookReveal motion={motion} reducedMotion={reducedMotion}/></group><group ref={panorama} visible={false}>{loadYard&&<Suspense fallback={null}><Yard motion={motion} quality={quality} onYardReady={yardReady}/></Suspense>}</group><OrbitControls ref={controls} enabled={false} enablePan={false} enableZoom={false} enableDamping={!reducedMotion} dampingFactor={.07} rotateSpeed={-.3} minPolarAngle={.2} maxPolarAngle={Math.PI-.2}/><CameraPath motion={motion} reducedMotion={reducedMotion} controls={controls} world={world} panorama={panorama} quality={quality} onReady={onReady}/><EffectComposer multisampling={0} enableNormalPass={false}><Bloom intensity={.08} luminanceThreshold={1.25} luminanceSmoothing={.3} mipmapBlur/><ToneMapping mode={ToneMappingMode.ACES_FILMIC}/><Vignette offset={.45} darkness={.13}/><SMAA/></EffectComposer></>;
}
function useCallbackStable(fn){const ref=useRef(fn);return useMemo(()=>(...args)=>ref.current(...args),[]);}

class WorldBoundary extends Component{state={failed:false};static getDerivedStateFromError(){return{failed:true};}componentDidCatch(){this.props.onError?.();}render(){return this.state.failed?<div className="world-error">A vista 3D não está disponível neste navegador. O filme continua disponível.</div>:this.props.children;}}

export default function HarvardWorld({motion,reducedMotion,quality,active=true,onReady,onError}){
  const profile=useViewportRenderQuality(quality);
  return <WorldBoundary onError={onError}><Canvas dpr={profile.dpr} frameloop={active?'always':'demand'} shadows camera={{position:[13,6.6,25],fov:36,near:.05,far:200}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.toneMapping=THREE.NoToneMapping;gl.toneMappingExposure=1.04;document.documentElement.dataset.world='ready';}}><Suspense fallback={null}><WorldContent motion={motion} reducedMotion={reducedMotion} quality={quality} onReady={onReady}/></Suspense></Canvas></WorldBoundary>;
}
