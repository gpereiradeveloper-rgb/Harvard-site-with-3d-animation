import React, { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, PresentationControls, useTexture } from '@react-three/drei';
import { Bloom, EffectComposer, FXAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import VeritasBook from './VeritasBook';

const LOOKS = {
  archive: { key:'#ffe1ab', fill:'#9ab9d4', rim:'#d08b45', power:4.1, exposure:1.05, tint:'#ffffff' },
  daylight: { key:'#fff1d3', fill:'#c0d8e9', rim:'#f4dbb3', power:5.3, exposure:1.16, tint:'#fff6e6' },
  night: { key:'#b9d5ef', fill:'#526b9c', rim:'#ffba73', power:2.8, exposure:.90, tint:'#a5b8d4' },
};

class Boundary extends Component {
  state = {failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  componentDidCatch() { this.props.onReady?.(); }
  render() { return this.state.failed ? <div className="scene-fallback"><div className="fallback-book"><span>HARVARD</span><b>VERITAS</b><small>CAMBRIDGE · 1636</small></div><small>Modo visual simplificado</small></div> : this.props.children; }
}

function Backdrop({motion}) {
  const map = useTexture('/assets/library-atmosphere.png');
  const {viewport,size} = useThree();
  const ref = useRef();
  const tint = useMemo(()=>new THREE.Color(),[]);
  const height = viewport.height * (16.2/9.2) * 1.1;
  const width = Math.max(height * (1672/941), viewport.width * (16.2/9.2)*1.1);
  useEffect(()=>{map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;},[map]);
  useFrame((_,dt)=>{
    const p=motion.progress;
    tint.set(LOOKS[motion.mode||'archive'].tint);
    ref.current.material.color.lerp(tint,1-Math.exp(-3*dt));
    ref.current.position.x= (size.width<760 ? -.25 : -.22) + Math.sin(p*Math.PI*2)*.18;
    ref.current.position.z=-7 + p*.35;
  });
  return <mesh ref={ref} position={[0,0,-7]}><planeGeometry args={[width,height]}/><meshBasicMaterial map={map} toneMapped={false}/></mesh>;
}

function VolumeDust({motion,reducedMotion}) {
  const ref=useRef();
  const geometry=useMemo(()=>{
    const p=new Float32Array(650*3);let seed=1636;
    for(let i=0;i<p.length;i++){seed=(seed*16807)%2147483647;p[i]=(seed/2147483647-.5)*(i%3===2?10:16);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));return g;
  },[]);
  const material=useMemo(()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},pointer:{value:new THREE.Vector2()},tint:{value:new THREE.Color('#d9b37a')}},vertexShader:`uniform float time; uniform vec2 pointer; varying float opacity; void main(){vec3 p=position;p.y+=sin(time*.12+position.x)*.22;p.x+=sin(time*.09+position.z)*.18;float d=length(p.xy-pointer*4.);p.xy+=normalize(p.xy-pointer*4.+.01)*max(0.,1.4-d)*.16;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(18./-mv.z,1.,4.);opacity=.12+.32*pow(.5+.5*sin(position.x*5.+position.y*3.+time*.35),2.);}`,fragmentShader:`uniform vec3 tint;varying float opacity;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.04,d)*opacity;gl_FragColor=vec4(tint,a);}`}),[]);
  useFrame((state,dt)=>{material.uniforms.time.value=reducedMotion?0:state.clock.elapsedTime;material.uniforms.pointer.value.lerp(new THREE.Vector2(motion.pointerX||0,motion.pointerY||0),1-Math.exp(-dt*3));if(!reducedMotion)ref.current.rotation.y=Math.sin(state.clock.elapsedTime*.025)*.05;});
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  return <points ref={ref} geometry={geometry} material={material}/>;
}

function BookRig({motion,reducedMotion,inspect}) {
  const ref=useRef();const {size}=useThree();
  useFrame((_,dt)=>{
    const p=motion.progress,mobile=size.width<760;
    const keys=mobile?[[0,.10,1.30,.34],[.22,.16,1.4,.30],[.4,.16,1.4,.30],[.48,.55,1.4,.28],[.68,.55,1.4,.28],[.78,.18,1.4,.30],[1,.12,1.4,.32]]:[[0,1.42,-.02,.72],[.12,1.50,-.02,.78],[.22,2.1,0,.70],[.40,2.1,0,.70],[.48,-.9,.04,.60],[.68,-.9,.04,.60],[.78,2.5,.02,.68],[1,1.9,.02,.73]];
    const next=keys.findIndex(k=>k[0]>p);const i=next<0?keys.length-2:Math.max(0,next-1),a=keys[i],b=keys[i+1],k=THREE.MathUtils.smoothstep(p,a[0],b[0]);
    const d=reducedMotion?1:1-Math.exp(-4.2*Math.min(dt,.08));
    ref.current.position.x=THREE.MathUtils.lerp(ref.current.position.x,THREE.MathUtils.lerp(a[1],b[1],k),d);
    ref.current.position.y=THREE.MathUtils.lerp(ref.current.position.y,THREE.MathUtils.lerp(a[2],b[2],k),d);
    const s=THREE.MathUtils.lerp(ref.current.scale.x,THREE.MathUtils.lerp(a[3],b[3],k),d);ref.current.scale.setScalar(s);
  });
  return <group ref={ref} position={[size.width<760?.1:1.42,size.width<760?1.3:-.02,0]} scale={size.width<760?.34:.72}><PresentationControls enabled={inspect} global speed={1.4} polar={[-.35,.35]} azimuth={[-.7,.7]} snap config={{mass:1,tension:170,friction:26}}><VeritasBook motion={motion} reducedMotion={reducedMotion}/></PresentationControls></group>;
}

function Cinematography({motion,reducedMotion,onReady,quality}) {
  const {camera,gl,size,setDpr}=useThree();const key=useRef(),fill=useRef(),rim=useRef(),ready=useRef(false);
  const c=useMemo(()=>({key:new THREE.Color(),fill:new THREE.Color(),rim:new THREE.Color()}),[]);
  const shadowSize=quality==='cinema'?4096:size.width<760?1024:2048;
  useEffect(()=>{const max=quality==='cinema'?2.5:quality==='high'?2:Math.min(devicePixelRatio||1,size.width<760?1.5:1.65);const budget=quality==='cinema'?12e6:size.width<760?2.5e6:7e6;setDpr(Math.min(max,Math.sqrt(budget/(size.width*size.height))));},[quality,size.width,size.height,setDpr]);
  useFrame((_,dt)=>{
    if(!ready.current){ready.current=true;onReady?.();}
    const look=LOOKS[motion.mode||'archive'],d=1-Math.exp(-3*dt);
    for(const n of ['key','fill','rim']){c[n].set(look[n]);({key,fill,rim}[n]).current.color.lerp(c[n],d);}
    key.current.intensity=THREE.MathUtils.lerp(key.current.intensity,look.power,d);
    gl.toneMappingExposure=THREE.MathUtils.lerp(gl.toneMappingExposure,look.exposure,d);
    const px=reducedMotion?0:motion.pointerX*.065,py=reducedMotion?0:motion.pointerY*.035;
    camera.position.x=THREE.MathUtils.lerp(camera.position.x,px,d);camera.position.y=THREE.MathUtils.lerp(camera.position.y,py,d);
    const p=motion.progress,s=THREE.MathUtils.smoothstep;
    const dolly=reducedMotion?0:-.50*s(p,.025,.13)*(1-s(p,.14,.22))+.22*s(p,.4,.48)*(1-s(p,.68,.78));
    camera.position.z=THREE.MathUtils.lerp(camera.position.z,9.2+dolly,d);camera.lookAt(0,0,0);
  });
  return <><ambientLight intensity={.25} color="#e4c3a1"/><directionalLight key={shadowSize} ref={key} position={[4.5,6,5]} intensity={2.8} color="#ffe1ab" castShadow shadow-mapSize={[shadowSize,shadowSize]} shadow-bias={-.0002} shadow-normalBias={.02}/><directionalLight ref={fill} position={[-4,1.2,4]} intensity={1} color="#bfc8d1"/><directionalLight ref={rim} position={[2,4,-4]} intensity={3} color="#d08b45"/><Environment resolution={256}><Lightformer intensity={2.6} color="#ffe3b7" position={[4,3,4]} rotation-y={-.7} scale={[2,6,1]}/><Lightformer intensity={1} color="#afc9e0" position={[-4,1,3]} rotation-y={.8} scale={[3,5,1]}/><Lightformer intensity={1.7} color="#dba76b" position={[0,5,-2]} rotation-x={Math.PI/2} scale={[5,3,1]}/></Environment></>;
}

function GroundShadow({quality}) {const {size}=useThree();return size.width<760?null:<ContactShadows position={[1.4,-2.05,.1]} scale={7} opacity={.35} blur={2.8} far={6} resolution={quality==='cinema'?512:256} color="#130605" frames={Infinity}/>;}

export default function CinematicScene({motion,reducedMotion,active,inspect,quality='auto',onReady}) {
  return <Boundary onReady={onReady}><Canvas style={{touchAction:inspect?'none':'pan-y'}} shadows frameloop={active?'always':'never'} camera={{position:[0,0,9.2],fov:36,near:.1,far:80}} dpr={1} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.05;gl.setClearColor('#140907',1);document.documentElement.dataset.scene='ready';}}>
    <Suspense fallback={null}><Backdrop motion={motion}/><Cinematography motion={motion} reducedMotion={reducedMotion} onReady={onReady} quality={quality}/><BookRig motion={motion} reducedMotion={reducedMotion} inspect={inspect}/><VolumeDust motion={motion} reducedMotion={reducedMotion}/><GroundShadow quality={quality}/><EffectComposer multisampling={0} enableNormalPass={false}><Bloom intensity={.13} luminanceThreshold={.95} luminanceSmoothing={.25} mipmapBlur/><ToneMapping mode={ToneMappingMode.ACES_FILMIC}/><Vignette eskil={false} offset={.28} darkness={.28}/><FXAA/></EffectComposer></Suspense>
  </Canvas></Boundary>;
}
