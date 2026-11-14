import React,{Component,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Environment,Lightformer,OrbitControls,useTexture} from '@react-three/drei';
import * as THREE from 'three';
import VeritasBook from './VeritasBook';
import {useViewportRenderQuality} from './RenderQuality';
import LibrarySpace from './LibrarySpace';
const smooth=THREE.MathUtils.smoothstep,clamp=n=>THREE.MathUtils.clamp(n,0,1);
function Yard({onReady}){
 const {gl,size}=useThree();
 const texture=useTexture(size.width>760&&gl.capabilities.maxTextureSize>=8192?'/assets/harvard-yard-8k.jpg':'/assets/harvard-yard-4k.jpg');
 useEffect(()=>{texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.repeat.x=-1;texture.offset.x=1;texture.anisotropy=8;onReady?.();},[texture,onReady]);
 return <mesh rotation-y={-Math.PI/2}><sphereGeometry args={[90,96,64]}/><meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false}/></mesh>;
}
function Motes({motion,reducedMotion}){
 const geometry=useMemo(()=>{let seed=1636;const a=new Float32Array(110*3);for(let i=0;i<a.length;i++){seed=seed*16807%2147483647;a[i]=(seed/2147483647-.5)*(i%3===2?8:15);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));return g;},[]);
 const material=useMemo(()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},alpha:{value:0}},vertexShader:`uniform float time;varying float brightness;void main(){vec3 p=position;p.y+=sin(time*.17+position.x)*.25;p.x+=cos(time*.11+position.z)*.17;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(12./-mv.z,1.,3.);brightness=.2+.8*pow(.5+.5*sin(position.x*3.+time*.25),3.);}`,fragmentShader:`uniform float alpha;varying float brightness;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.97,.86,.59,smoothstep(.5,.08,d)*brightness*alpha);}`}),[]);
 useFrame(s=>{material.uniforms.time.value=reducedMotion?0:s.clock.elapsedTime;material.uniforms.alpha.value=.32*smooth(motion.progress,.27,.42)*(1-smooth(motion.progress,.83,.9));});
 useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
 return <points geometry={geometry} material={material}/>;
}
function BookRig({motion,reducedMotion,portalAnchor,portalEnabled}){
 const ref=useRef();const {size}=useThree();const bookMotion=useMemo(()=>({progress:0,pointerX:0,pointerY:0,inspection:0}),[]);
 useFrame((_,dt)=>{
  const p=motion.progress,portrait=size.width<size.height,enter=smooth(p,.235,.34),opening=smooth(p,.40,.55);
  ref.current.visible=p>.235&&p<.735;
  const x=portrait?.08:THREE.MathUtils.lerp(2.04,2.23,opening),y=portrait?THREE.MathUtils.lerp(1.08,.65,opening):0;
  const targetScale=(portrait?.43:.78)*(1+smooth(p,.57,.60)*.02),d=reducedMotion?1:1-Math.exp(-6*Math.min(dt,.08));
  ref.current.position.x=THREE.MathUtils.lerp(ref.current.position.x,x+(1-enter)*4,d);
  ref.current.position.y=THREE.MathUtils.lerp(ref.current.position.y,y-(1-enter)*1.2,d);
  ref.current.position.z=0;
  ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x,targetScale*enter,d));
  bookMotion.progress=clamp((p-.30)/.28)*.77;bookMotion.journey=p;bookMotion.pointerX=p>.62?0:motion.pointerX;bookMotion.pointerY=p>.62?0:motion.pointerY;
 });
 return <group ref={ref} position={[5,-1,0]} scale={0}><VeritasBook motion={bookMotion} reducedMotion={reducedMotion} portalAnchor={portalAnchor} portalEnabled={portalEnabled}/></group>;
}
function CameraDirector({motion,reducedMotion,controls,panorama,library,objects,onReady,interacted,portalAnchor,libraryPortal}){
 const {camera,gl}=useThree();const ready=useRef(false),entered=useRef(false);
 const point=useMemo(()=>new THREE.Vector3(),[]),normal=useMemo(()=>new THREE.Vector3(),[]),position=useMemo(()=>new THREE.Vector3(),[]),target=useMemo(()=>new THREE.Vector3(),[]),rotation=useMemo(()=>new THREE.Quaternion(),[]),approach=useMemo(()=>new THREE.Vector3(),[]);
 useFrame(()=>{
  if(!controls.current||!panorama.current||!library.current||!objects.current)return;
  if(!ready.current){ready.current=true;onReady?.();}
  const p=motion.progress,final=p>=.955,interior=p>=.735&&!final;
  panorama.current.visible=final;objects.current.visible=p<.735;library.current.visible=interior;
  controls.current.enabled=final&&p>.975;controls.current.autoRotate=final&&p>.985&&!reducedMotion&&!interacted.current;gl.setClearAlpha(final?1:0);
  if(final){if(!entered.current){camera.position.set(0,0,.1);controls.current.target.set(0,0,0);camera.lookAt(0,0,0);camera.near=.01;camera.fov=72;camera.updateProjectionMatrix();controls.current.update();entered.current=true;}return;}
  entered.current=false;let distance=interior?6.8:9.2;
  if(interior){position.set(0,0,-.25*smooth(p,.735,.82));target.set(0,0,-12);}
  else{position.set(reducedMotion?0:(motion.pointerX||0)*.07,reducedMotion?0:(motion.pointerY||0)*.035,9.2);target.set(0,0,0);}
  const anchor=interior?libraryPortal.current:portalAnchor.current,start=interior?.82:.63,end=interior?.955:.735,alignEnd=interior?.86:.67;
  if(p>start&&anchor){
   anchor.updateWorldMatrix(true,false);anchor.getWorldPosition(point);anchor.getWorldQuaternion(rotation);normal.set(0,0,1).applyQuaternion(rotation);
   const travel=smooth(p,start,end),align=smooth(p,start,alignEnd);distance=(interior?6.8:9.2)*Math.pow(.002/(interior?6.8:9.2),travel);
   approach.copy(point).addScaledVector(normal,distance);position.lerp(approach,align);target.lerp(point,align);
  }
  camera.position.copy(position);camera.lookAt(target);camera.near=Math.min(.07,distance*.1);camera.fov=interior?60:36;camera.updateProjectionMatrix();
 });return null;
}
function Scene({motion,reducedMotion,onReady,onPanoramaReady,onLibraryReady}){
 const controls=useRef(),panorama=useRef(),objects=useRef(),library=useRef(),libraryPortal=useRef(),interacted=useRef(false),portalAnchor=useRef();const [loadYard,setLoadYard]=useState(false);
 useFrame(()=>{if(motion.progress>.4&&!loadYard)setLoadYard(true);});
 return <><directionalLight position={[0,1,8]} color="#fff1df" intensity={1.4}/><hemisphereLight args={['#c8d4df','#493d2e',1.15]}/><directionalLight position={[-4,7,6]} color="#fff0d9" intensity={3.7} castShadow shadow-mapSize={[2048,2048]} shadow-normalBias={.012} shadow-bias={-.00012} shadow-radius={3} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7}/><directionalLight position={[5,2,2]} color="#b0c7dc" intensity={1.5}/><directionalLight position={[2,5,-4]} color="#ffe1a8" intensity={2.8}/><Environment resolution={256}><Lightformer intensity={3} color="#ffe7bb" position={[-4,5,5]} rotation-y={.65} scale={[3,7,1]}/><Lightformer intensity={1.7} color="#b9d4ed" position={[5,2,3]} rotation-y={-.8} scale={[4,6,1]}/><Lightformer intensity={2.2} color="#fff0cd" position={[0,6,-3]} rotation-x={Math.PI/2} scale={[6,3,1]}/></Environment><group ref={objects}><BookRig motion={motion} reducedMotion={reducedMotion} portalAnchor={portalAnchor} portalEnabled={loadYard}/><Motes motion={motion} reducedMotion={reducedMotion}/></group><group ref={library} visible={false}>{loadYard&&<Suspense fallback={null}><LibrarySpace onReady={onLibraryReady} portalAnchor={libraryPortal} motion={motion}/><Motes motion={motion} reducedMotion={reducedMotion}/></Suspense>}</group><group ref={panorama} visible={false}>{loadYard&&<Suspense fallback={null}><Yard onReady={onPanoramaReady}/></Suspense>}</group><OrbitControls ref={controls} autoRotateSpeed={.12} onStart={()=>{interacted.current=true;}} enabled={false} enablePan={false} enableZoom={false} enableDamping={!reducedMotion} dampingFactor={.07} rotateSpeed={-.3} minPolarAngle={.2} maxPolarAngle={Math.PI-.2}/><CameraDirector motion={motion} reducedMotion={reducedMotion} controls={controls} panorama={panorama} library={library} objects={objects} libraryPortal={libraryPortal} onReady={onReady} interacted={interacted} portalAnchor={portalAnchor}/></>;
}
class Boundary extends Component{state={failed:false};static getDerivedStateFromError(){return{failed:true};}componentDidCatch(){this.props.onError?.();}render(){return this.state.failed?null:this.props.children;}}
export default function HarvardWorld({motion,reducedMotion,quality,active=true,onReady,onError,onPanoramaReady,onLibraryReady}){
 const profile=useViewportRenderQuality(quality);
 return <Boundary onError={onError}><Canvas shadows dpr={profile.dpr} frameloop={active?'always':'demand'} camera={{position:[0,0,9.2],fov:36,near:.07,far:200}} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.12;gl.setClearColor('#10180f',0);}}><Suspense fallback={null}><Scene motion={motion} reducedMotion={reducedMotion} onReady={onReady} onPanoramaReady={onPanoramaReady} onLibraryReady={onLibraryReady}/></Suspense></Canvas></Boundary>;
}
