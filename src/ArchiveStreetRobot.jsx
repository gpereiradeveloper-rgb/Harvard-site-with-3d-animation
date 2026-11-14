import React,{Suspense,useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {RoundedBox,useGLTF} from '@react-three/drei';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import {ImportedScholar} from './ArchiveReadyModels';
import {supplyChainAt,supplyRampHeight} from './ArchiveSupplyChain';
export const streetRampHeight=supplyRampHeight;
function rampGeometry(){
 const vertices=[],indices=[],steps=48;
 for(let i=0;i<=steps;i++){const z=1.05+3.85*i/steps,y=streetRampHeight(z);vertices.push(10.75,y,z,12.25,y,z,10.75,-.91,z,12.25,-.91,z);}
 for(let i=0;i<steps;i++){const a=i*4,b=a+4;indices.push(a,b,b+1,a,b+1,a+1,a+2,b+2,b,a+2,b,a,a+1,b+1,b+3,a+1,b+3,a+3);}
 indices.push(0,1,3,0,3,2,steps*4,steps*4+2,steps*4+3,steps*4,steps*4+3,steps*4+1);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function ServiceRamp(){
 const kit=useMemo(()=>({geometry:rampGeometry(),rails:[10.78,12.22].map(x=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({length:49},(_,i)=>{const z=1.05+3.85*i/48;return new THREE.Vector3(x,streetRampHeight(z)+.016,z);})),64,.012,6,false))}),[]);
 useEffect(()=>()=>{kit.geometry.dispose();kit.rails.forEach(g=>g.dispose());},[kit]);
 return <group name="Continuous accessible service ramp with rounded landings"><mesh geometry={kit.geometry} castShadow receiveShadow><meshStandardMaterial color="#b7b8b5" metalness={.15} roughness={.7}/></mesh><mesh position={[11.15,-.905,4.0]} receiveShadow><boxGeometry args={[2.5,.03,6.40]}/><meshStandardMaterial color="#b9b5ac" roughness={.93}/></mesh>{kit.rails.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial color="#c6a76c" metalness={.65} roughness={.3}/></mesh>)}</group>;
}
function Cases({time}){
 const {scene}=useGLTF('/assets/warehouse-models/cardboard_box_01-1k.glb'),refs=useRef([]),matrix=useMemo(()=>new THREE.Object3D(),[]);
 const parts=useMemo(()=>{scene.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(scene),center=bounds.getCenter(new THREE.Vector3()),fit=.30/(bounds.max.x-bounds.min.x),groups=new Map();scene.traverse(mesh=>{if(!mesh.isMesh)return;let g=mesh.geometry.clone();if(g.index){const n=g.toNonIndexed();g.dispose();g=n;}g.applyMatrix4(mesh.matrixWorld);g.translate(-center.x,-bounds.min.y,-center.z);g.scale(fit,fit,fit);if(!groups.has(mesh.material.uuid))groups.set(mesh.material.uuid,{material:mesh.material,geometries:[]});groups.get(mesh.material.uuid).geometries.push(g);});return[...groups.values()].map(p=>{const geometry=mergeGeometries(p.geometries,false);p.geometries.forEach(g=>g.dispose());return{material:p.material,geometry};});},[scene]);
 useEffect(()=>()=>parts.forEach(p=>p.geometry.dispose()),[parts]);
 useFrame(()=>{const s=supplyChainAt(time.current);s.cases.forEach((c,i)=>{matrix.position.fromArray(c.position);matrix.rotation.set(...(c.rotation||[c.pitch||0,c.yaw||0,c.tilt||0]),'YXZ');matrix.scale.setScalar(1);matrix.updateMatrix();refs.current.forEach(r=>{if(r)r.setMatrixAt(i,matrix.matrix);});});refs.current.forEach(r=>{if(r){r.instanceMatrix.needsUpdate=true;r.computeBoundingSphere();}});},-2);
 return <group name="Eight unique cases — one continuous identity from truck to stock">{parts.map((p,i)=><instancedMesh key={i} ref={r=>{refs.current[i]=r;}} args={[p.geometry,p.material,8]} castShadow receiveShadow dispose={null}/>)}</group>;
}
function ScannerGate({time}){
 const beam=useRef(),led=useRef();const {scene}=useGLTF('/assets/warehouse-models/barcode-scanner.glb');
 const model=useMemo(()=>{const o=scene.clone(true),b=new THREE.Box3().setFromObject(o),c=b.getCenter(new THREE.Vector3()),f=.22/(b.max.y-b.min.y);o.scale.setScalar(f);o.position.set(-c.x*f,-b.min.y*f,-c.z*f);o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});return o;},[scene]);
 const floor=streetRampHeight(1.35),beamGeo=useMemo(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.32,-.14,-.14,.32,.14,-.14,0,0,0,.32,.14,-.14,.32,.14,.14,0,0,0,.32,.14,.14,.32,-.14,.14,0,0,0,.32,-.14,.14,.32,-.14,-.14],3));g.computeVertexNormals();return g;},[]);
 useEffect(()=>()=>beamGeo.dispose(),[beamGeo]);
 useFrame(()=>{const s=supplyChainAt(time.current),r=s.robot,loaded=s.cases.some(c=>c.host==='robot'),active=loaded&&Math.abs(r.position[2]-1.35)<.42;if(beam.current)beam.current.visible=active;if(led.current){led.current.material.emissiveIntensity=active?1.5:.15;led.current.material.color.set(active?'#72c98f':'#d7a155');}});
 return <group position={[0,floor,1.35]} name="Original optical scanner — recessed glass and load-triggered scan">
  {[-1,1].map(side=><group key={side} position={[11.7+side*.47,0,0]}><RoundedBox args={[.09,.76,.12]} radius={.015} position={[0,.38,0]} castShadow receiveShadow><meshStandardMaterial color="#263f4b" metalness={.55} roughness={.32}/></RoundedBox><RoundedBox args={[.16,.035,.19]} radius={.015} position={[0,.018,0]} castShadow><meshStandardMaterial color="#aeb8b9" metalness={.65} roughness={.3}/></RoundedBox>{[-1,1].map(z=><mesh key={z} position={[0,.038,z*.06]}><cylinderGeometry args={[.011,.011,.012,10]}/><meshStandardMaterial color="#474e50" metalness={.8} roughness={.27}/></mesh>)}</group>)}
  <RoundedBox args={[1.04,.09,.17]} radius={.02} position={[11.7,.775,0]} castShadow><meshPhysicalMaterial color="#dfe4e2" metalness={.30} roughness={.30} clearcoat={.3}/></RoundedBox>
  <group position={[11.25,.41,0]} rotation={[0,Math.PI/2,0]}><primitive object={model} dispose={null}/></group>
  <RoundedBox args={[.025,.17,.22]} radius={.009} position={[11.285,.45,0]}><meshStandardMaterial color="#111e25" roughness={.14} metalness={.30}/></RoundedBox>
  <mesh position={[11.300,.45,0]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[.17,.105]}/><meshPhysicalMaterial color="#23404e" metalness={.35} roughness={.08} clearcoat={1}/></mesh>
  <mesh ref={beam} geometry={beamGeo} position={[11.315,.45,0]} visible={false}><meshBasicMaterial color="#f84627" transparent opacity={.17} depthWrite={false} side={THREE.DoubleSide}/></mesh>
  <mesh ref={led} position={[12.17,.69,.075]}><sphereGeometry args={[.023,12,8]}/><meshStandardMaterial color="#d7a155" emissive="#60bd7c" emissiveIntensity={.15}/></mesh>
 </group>;
}
function pose(){return{pelvis:.55,pelvisAbsolute:.83,lean:.04,headPitch:.18,headYaw:0,leftHand:new THREE.Vector3(),rightHand:new THREE.Vector3(),leftFoot:new THREE.Vector3(),rightFoot:new THREE.Vector3()};}
function receiverPose(p,a,parcel){p.pelvisAbsolute=.83-.58*(a.crouch||0);p.lean=.04+.18*(a.crouch||0);p.headPitch=.15+.15*(a.crouch||0);const cy=Math.cos(a.yaw),sn=Math.sin(a.yaw),walking=a.walking?1:0;for(const [i,side]of[-1,1].entries()){const hand=side<0?p.leftHand:p.rightHand,foot=side<0?p.leftFoot:p.rightFoot,step=Math.sin((a.distance||0)/.42*Math.PI*2+i*Math.PI);hand.set(side*.19,.83,.11-step*.1*walking);if(parcel){const dx=parcel.position[0]+cy*side*.12-a.position[0],dz=parcel.position[2]-sn*side*.12-a.position[2];hand.set(cy*dx-sn*dz,parcel.position[1]+.22-a.position[1],sn*dx+cy*dz);}foot.set(side*.11,.055+Math.max(0,step)*.06*walking,.02+step*.12*walking);}}
export default function ArchiveStreetRobot({assets,time,Robot}){
 const robot=useRef(),receiver=useRef(),state=useRef({distance:0,yaw:0,curvature:0,speed:0}),p=useMemo(pose,[]),{gl}=useThree();
 useFrame(()=>{const s=supplyChainAt(time.current),r=s.robot,a=s.receiver;state.current={...r,speed:r.moving?1:0,curvature:0,bodyLift:0};robot.current.position.fromArray(r.position);robot.current.rotation.set(0,r.yaw,r.tilt||0,'YXZ');receiver.current.position.fromArray(a.position);receiver.current.rotation.y=a.yaw;const item=s.cases.find(c=>c.id===a.caseId&&(c.host==='receiver'||c.host==='receiver-transfer'));receiverPose(p,a,item);Object.assign(gl.domElement.dataset,{worldSupplyTask:s.task,worldSupplyComplete:String(s.complete),worldSupplyCaseCount:String(s.cases.length),worldStreetRobotTask:r.task||s.task,worldStreetRobotX:r.position[0].toFixed(3),worldStreetRobotY:r.position[1].toFixed(3),worldStreetRobotZ:r.position[2].toFixed(3),worldReceiverTask:a.task||s.task});},-4);
 return <group name="Shared receiving operation — truck to collection"><ServiceRamp/><group ref={robot}><Robot assets={assets} state={state} time={time}/></group><Suspense fallback={null}><Cases time={time}/><ScannerGate time={time}/></Suspense><group ref={receiver}><Suspense fallback={null}><ImportedScholar actorRef={receiver} pose={p} variant={3} worker/></Suspense></group><group position={[10.35,.095,-.65]} name="Supported collection receiving table"><RoundedBox args={[1.20,.08,.75]} radius={.025} position={[0,.885,0]} castShadow receiveShadow><meshStandardMaterial color="#29414b" metalness={.2} roughness={.45}/></RoundedBox>{[-1,1].flatMap(x=>[-1,1].map(z=><mesh key={x+':'+z} position={[x*.50,.43,z*.29]} castShadow><boxGeometry args={[.045,.86,.045]}/><meshStandardMaterial color="#a9b2b0" metalness={.7} roughness={.3}/></mesh>))}</group></group>;
}
