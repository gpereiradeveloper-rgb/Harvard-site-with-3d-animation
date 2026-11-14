import React,{Component,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Environment,Lightformer,OrbitControls,useTexture,SoftShadows} from '@react-three/drei';
import {EffectComposer,N8AO,Bloom,ToneMapping,SMAA,Vignette} from '@react-three/postprocessing';
import {ToneMappingMode} from 'postprocessing';
import * as THREE from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import ArchiveHall from './ArchiveHall';
import ArchiveExterior from './ArchiveExterior';
import RoomReflectionProbe from './RoomReflectionProbe';
import ArchiveFloor from './ArchiveFloor';
import ArchiveFurnishings from './ArchiveFurnishings';
import VeritasBook from './VeritasBook';
import {useViewportRenderQuality} from './RenderQuality';
import {yardSource} from './PortalView';
const smooth=THREE.MathUtils.smoothstep,clamp=n=>THREE.MathUtils.clamp(n,0,1);
RectAreaLightUniformsLib.init();
const FLOOR=['/assets/archive-materials/floor-color-4k.jpg','/assets/archive-materials/floor-normal-2k.jpg','/assets/archive-materials/floor-roughness-2k.jpg'];
const STONE=['/assets/archive-materials/stone-color-2k.jpg','/assets/archive-materials/stone-normal-2k.jpg','/assets/archive-materials/stone-roughness-2k.jpg'];
const PATH=[
 [0,[0,1.72,16],[0,2,-15]], [.10,[0,1.72,10.5],[0,2,-15]],
 [.22,[.55,1.70,2],[-.3,1.8,-16]], [.34,[-.9,1.68,-6.5],[0,1.7,-23]],
 [.44,[.35,1.60,-14.5],[0,1.4,-21]], [.50,[.1,1.40,-20],[0,1.33,-21]],
 [.57,[-.12,1.37,-20.05],[-.16,1.33,-21]], [.65,[-.14,1.36,-20.05],[-.16,1.33,-21]],
];
// One continuous spline through the archive. Arc-length sampling avoids stopping
// at every arch; the final approach eases down into the physical folio.
const WALK_POSITION=new THREE.CatmullRomCurve3(PATH.slice(0,6).map(k=>new THREE.Vector3(...k[1])),false,'centripetal');
const WALK_TARGET=new THREE.CatmullRomCurve3(PATH.slice(0,6).map(k=>new THREE.Vector3(...k[2])),false,'centripetal');
function Yard({onReady}){
 const {gl,size}=useThree(),map=useTexture(yardSource(gl,size.width));
 useEffect(()=>{map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.RepeatWrapping;map.repeat.x=-1;map.offset.x=1;map.anisotropy=8;onReady?.();},[map,onReady]);
 return <mesh rotation-y={-Math.PI/2}><sphereGeometry args={[90,96,64]}/><meshBasicMaterial map={map} side={THREE.BackSide} toneMapped={false} fog={false}/></mesh>;
}
function DisplayBook({motion,reducedMotion,anchor,portalEnabled}){
 const bookMotion=useMemo(()=>({progress:0,journey:0,pointerX:0,pointerY:0}),[]);
 useFrame(()=>{const p=motion.progress;bookMotion.progress=clamp((p-.46)/.16)*.77;bookMotion.journey=p;bookMotion.pointerX=p>.63?0:motion.pointerX*.25;bookMotion.pointerY=p>.63?0:motion.pointerY*.25;});
 return <group position={[0,1.33,-21]} scale={.1}><VeritasBook motion={bookMotion} reducedMotion={reducedMotion} portalAnchor={anchor} portalEnabled={portalEnabled} resting/></group>;
}
function Dust({reducedMotion}){
 const geometry=useMemo(()=>{let seed=1636;const a=new Float32Array(420*3);for(let i=0;i<a.length;i++){seed=seed*16807%2147483647;const r=seed/2147483647;a[i]=i%3===0?(r-.5)*11:i%3===1?r*7.5:-38+r*49;}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));return g;},[]);
 const material=useMemo(()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`uniform float time;varying float alpha;void main(){vec3 p=position;p.y+=sin(time*.13+position.x)*.12;p.x+=cos(time*.08+position.z)*.08;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(8./-mv.z,1.,3.);alpha=.08+.22*pow(.5+.5*sin(position.x*3.+time*.3),3.);}`,fragmentShader:`varying float alpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.93,.85,.69,smoothstep(.5,.08,d)*alpha);}`}),[]);
 useFrame(s=>{material.uniforms.time.value=reducedMotion?0:s.clock.elapsedTime;});
 useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);return <points geometry={geometry} material={material}/>;
}
function Lighting({quality,motion}){
 const {gl,size}=useThree(),sun=useRef(),sunTarget=useRef(),bookLight=useRef(),bookTarget=useRef();
 const shadow=quality==='cinema'?4096:size.width<760?1024:2048;
 useEffect(()=>{sun.current.target=sunTarget.current;bookLight.current.target=bookTarget.current;gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;},[gl,shadow]);
 useFrame(()=>{if(motion.progress>.44&&motion.progress<.81)gl.shadowMap.needsUpdate=true;});
 return <><ambientLight color="#eadcc4" intensity={.18}/><hemisphereLight args={['#c9d9e6','#57452f',.28]}/><object3D ref={sunTarget} position={[0,1,-15]}/><directionalLight key={shadow} ref={sun} position={[14,11,-10]} color="#ffe6bf" intensity={3.2} castShadow shadow-mapSize={[shadow,shadow]} shadow-camera-left={-26} shadow-camera-right={26} shadow-camera-top={19} shadow-camera-bottom={-19} shadow-camera-near={1} shadow-camera-far={80} shadow-normalBias={.012} shadow-bias={-.00008} shadow-radius={3}/><object3D ref={bookTarget} position={[0,1.33,-21]}/><spotLight ref={bookLight} position={[-.4,3,-19.4]} color="#fff1d4" intensity={18} angle={.45} penumbra={.85} distance={8} decay={2} castShadow shadow-mapSize={[1024,1024]} shadow-normalBias={.0008} shadow-bias={-.00001}/>
 {[4,-7,-18,-32].map(z=><pointLight key={z} position={[0,5.82,z]} color="#ffd19a" intensity={58} decay={2} distance={14}/>)}
 {[4,-4,-12,-20,-28,-36].map(z=><rectAreaLight key={z} position={[5.86,4.3,z]} rotation={[0,Math.PI/2,0]} width={2.7} height={4.9} color="#d8e4ec" intensity={2.4}/>)}
 <rectAreaLight position={[0,4.1,-39.8]} rotation={[0,Math.PI,0]} width={5.2} height={6.1} color="#d8e5ef" intensity={2.0}/>
 <Environment resolution={256}><Lightformer intensity={.75} color="#d9e5f0" position={[7,5,-8]} rotation-y={-Math.PI/2} scale={[20,5,1]}/><Lightformer intensity={.16} color="#efcf9c" position={[-5,5,-12]} rotation-y={Math.PI/2} scale={[16,4,1]}/><Lightformer intensity={.12} color="#e1c595" position={[0,7,-18]} rotation-x={Math.PI/2} scale={[10,35,1]}/></Environment>
 </>;
}
function Director({motion,reducedMotion,hall,yard,controls,anchor,onReady,onFinal}){
 const {camera,gl,size}=useThree(),ready=useRef(false),entered=useRef(false),lastFinal=useRef(false),touched=useRef(false);
 const vectors=useMemo(()=>({position:new THREE.Vector3(),target:new THREE.Vector3(),point:new THREE.Vector3(),normal:new THREE.Vector3(),a:new THREE.Vector3(),b:new THREE.Vector3(),q:new THREE.Quaternion()}),[]);
 useFrame(()=>{
  if(!hall.current||!yard.current||!controls.current)return;
  if(!ready.current){ready.current=true;gl.shadowMap.needsUpdate=true;onReady?.();}
  const p=motion.progress,final=p>=.81;hall.current.visible=!final;yard.current.visible=final;
  if(lastFinal.current!==final){lastFinal.current=final;onFinal(final);}
  controls.current.enabled=final&&p>.975;
  controls.current.autoRotate=final&&p>.99&&!reducedMotion&&!touched.current;
  if(final){
   if(!entered.current){camera.position.set(0,0,.1);controls.current.target.set(0,0,0);camera.near=.01;camera.fov=72;camera.lookAt(0,0,0);controls.current.update();entered.current=true;}
   if(p<.975){const angle=smooth(p,.81,.97)*.58;camera.position.set(Math.sin(angle)*.1,0,Math.cos(angle)*.1);camera.lookAt(0,0,0);}
   camera.updateProjectionMatrix();return;
  }
  entered.current=false;const v=vectors;let distance=1;
  const next=PATH.findIndex(k=>k[0]>p),i=next<0?PATH.length-2:Math.max(0,next-1),a=PATH[i],b=PATH[i+1],k=smooth(p,a[0],b[0]);
  v.position.fromArray(a[1]).lerp(v.a.fromArray(b[1]),k);v.target.fromArray(a[2]).lerp(v.b.fromArray(b[2]),k);
  if(p<=.50){const travel=smooth(p,0,.50);WALK_POSITION.getPointAt(travel,v.position);WALK_TARGET.getPointAt(travel,v.target);}
  const portrait=size.width<size.height;
  if(portrait&&p<.44){v.position.x*=.3;v.target.x=0;}
  if(!reducedMotion&&p<.63){v.position.x+=(motion.pointerX||0)*.025;v.position.y+=(motion.pointerY||0)*.012;}
  if(p>.65&&anchor.current){anchor.current.updateWorldMatrix(true,false);anchor.current.getWorldPosition(v.point);anchor.current.getWorldQuaternion(v.q);v.normal.set(0,0,1).applyQuaternion(v.q);const t=smooth(p,.65,.81),align=smooth(p,.65,.70);distance=1*Math.pow(.0003,t);v.a.copy(v.point).addScaledVector(v.normal,distance);v.position.lerp(v.a,align);v.target.lerp(v.point,align);}
  camera.position.copy(v.position);camera.lookAt(v.target);camera.near=p>.65?Math.min(.035,distance*.1):.035;camera.fov=52-16*smooth(p,.43,.50);if(portrait&&p>.48&&p<.65)camera.fov=48;camera.updateProjectionMatrix();
 });
 useEffect(()=>{const control=controls.current;const start=()=>{touched.current=true;};control?.addEventListener('start',start);return()=>control?.removeEventListener('start',start);},[controls]);return null;
}
function Scene({motion,reducedMotion,quality,onReady,onPanoramaReady}){
 const hall=useRef(),yard=useRef(),controls=useRef(),anchor=useRef(),ao=useRef();const [preloadYard,setPreloadYard]=useState(false),[final,setFinal]=useState(false),[reflectionMap,setReflectionMap]=useState(null);
 useFrame(()=>{if(motion.progress>.35&&!preloadYard)setPreloadYard(true);if(ao.current)ao.current.configuration.aoRadius=.45-.425*smooth(motion.progress,.44,.52);});
 return <><color attach="background" args={['#25251f']}/><fog attach="fog" args={['#b7ad97',52,150]}/><Lighting quality={quality} motion={motion}/>
 <group ref={hall}><ArchiveExterior reducedMotion={reducedMotion}/><ArchiveHall floorMaps={FLOOR} stoneMaps={STONE} reflectionMap={reflectionMap}/><RoomReflectionProbe onReady={setReflectionMap}/><SoftShadows size={15} samples={8} focus={0}/><ArchiveFloor maps={FLOOR} quality={quality}/><ArchiveFurnishings quality={quality}/><DisplayBook motion={motion} reducedMotion={reducedMotion} anchor={anchor} portalEnabled={preloadYard}/><Dust reducedMotion={reducedMotion}/></group>
 <group ref={yard} visible={false}>{preloadYard&&<Suspense fallback={null}><Yard onReady={onPanoramaReady}/></Suspense>}</group>
 <OrbitControls ref={controls} enabled={false} enablePan={false} enableZoom={false} enableDamping={!reducedMotion} dampingFactor={.07} rotateSpeed={-.3} autoRotateSpeed={.10} minPolarAngle={.2} maxPolarAngle={Math.PI-.2}/>
 <Director motion={motion} reducedMotion={reducedMotion} hall={hall} yard={yard} controls={controls} anchor={anchor} onReady={onReady} onFinal={setFinal}/>
 <EffectComposer multisampling={0} enableNormalPass={false}><N8AO ref={ao} enabled={!final} aoRadius={.45} intensity={1.2} distanceFalloff={1} quality={quality==='cinema'?'medium':'low'} halfRes/><Bloom intensity={.08} luminanceThreshold={1.5} mipmapBlur/><ToneMapping mode={ToneMappingMode.ACES_FILMIC}/><Vignette offset={.44} darkness={.20}/><SMAA/></EffectComposer>
 </>;
}
class Boundary extends Component{state={failed:false};static getDerivedStateFromError(){return{failed:true};}componentDidCatch(){this.props.onError?.();}render(){return this.state.failed?null:this.props.children;}}
export default function ArchiveWorld({motion,reducedMotion,quality,active=true,onReady,onError,onPanoramaReady}){
 const profile=useViewportRenderQuality(quality);
 return <Boundary onError={onError}><Canvas shadows dpr={profile.dpr} frameloop={active?'always':'demand'} camera={{position:[0,1.72,16],fov:52,near:.035,far:180}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.toneMapping=THREE.NoToneMapping;}}><Suspense fallback={null}><Scene motion={motion} reducedMotion={reducedMotion} quality={quality} onReady={onReady} onPanoramaReady={onPanoramaReady}/></Suspense></Canvas></Boundary>;
}
