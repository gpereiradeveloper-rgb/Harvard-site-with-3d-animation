import React, {Suspense, useEffect, useLayoutEffect, useMemo, useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {RoundedBox, useGLTF} from '@react-three/drei';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import {ImportedScholar} from './ArchiveReadyModels';
import {supplyChainAt,SUPPLY_PALLET_SCALE,SUPPLY_SCANNER,SUPPLY_CASE_SIZE} from './ArchiveSupplyChain';

const BASE = '/assets/warehouse-models/';
const URLS = {forklift: BASE+'forklift.glb', jack: BASE+'pallet-jack.glb', rack: BASE+'rack.glb', scanner: BASE+'barcode-scanner.glb', crate: BASE+'cardboard_box_01-1k.glb'};
const FLOOR = .095, FORK_X = 7.10, RACK_X = 10.70, RACK_Z = -3.65;
const STATION_Z = -2.65, STATION_A = FORK_X, STATION_B = 8.95, STATION_TOP = .1325;
const CRATE_HEIGHT = .3417995572090149 / .5158704221248627;
export const WAREHOUSE_BOUNDS = {x:[6.45,12.4], z:[-4.65,1.05], floor:FLOOR};
const clock = time => Math.max(0, Number(typeof time==='number'?time:time?.current)||0);
const smooth = (t,a,b) => {const p=THREE.MathUtils.clamp((t-a)/(b-a),0,1);return p*p*(3-2*p);};

/** Shared finite receiving operation; the warehouse owns no separate loop. */
export const warehouseHandlingAt=seconds=>supplyChainAt(seconds);

function classifier(kind, mesh) {
  const name=mesh.name;
  const side=()=>{const b=new THREE.Box3().setFromObject(mesh);return b.getCenter(new THREE.Vector3()).x<0?'left':'right';};
  if(kind==='forklift') {
    if(/^(Carriage|Fork_blade|Fork_upright)/.test(name)) return 'lift';
    if(/^Drive_wheel_/.test(name)) return 'wheel-drive-'+side();
    if(/^Steering_wheel_(brake|hub|rim|spoke|tire)/.test(name)) return 'wheel-steer-'+side();
  }
  if(kind==='jack') {
    if(/^(Fork|Fork_bridge)/.test(name)) return 'lift';
    if(/^Steer_wheel/.test(name)) return 'wheel-steer-'+side();
    if(/roller/i.test(name)) return 'wheel-load-'+side();
  }
  return 'body';
}

// All original surfaces remain. Only rigid parts sharing a material are batched;
// the actual fork carriage and wheel axles retain independent motion origins.
function mergeModel(scene, kind='static', filter=()=>true, offset=new THREE.Vector3()) {
  scene.updateMatrixWorld(true);
  const groups = new Map();
  scene.traverse(mesh => {
    if(!mesh.isMesh||!filter(mesh)) return;
    const key = classifier(kind,mesh);
    if(!groups.has(key)) groups.set(key, {parts:new Map(),bounds:new THREE.Box3()});
    const group=groups.get(key), geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    geometry.translate(-offset.x,-offset.y,-offset.z); geometry.computeBoundingBox();group.bounds.union(geometry.boundingBox);
    if(!group.parts.has(mesh.material.uuid)) group.parts.set(mesh.material.uuid,{material:mesh.material,list:[]});
    group.parts.get(mesh.material.uuid).list.push(geometry);
  });
  return [...groups].map(([key,group]) => {
    const pivot=key.startsWith('wheel')?group.bounds.getCenter(new THREE.Vector3()):new THREE.Vector3();
    const parts=[...group.parts.values()].map(({material,list}) => {
      list.forEach(geometry=>geometry.translate(-pivot.x,-pivot.y,-pivot.z));
      const geometry=mergeGeometries(list,false);list.forEach(part=>part.dispose());geometry.computeBoundingSphere();
      return {geometry,material};
    });
    return {key,pivot,parts,radius:(group.bounds.max.y-group.bounds.min.y)/2};
  });
}
function disposeGroups(groups){groups.forEach(group=>group.parts.forEach(part=>part.geometry.dispose()));}
function Parts({parts}) {return parts.map(part=><mesh key={part.material.uuid} geometry={part.geometry} material={part.material}
  castShadow={!part.material.transmission} receiveShadow dispose={null}/>);}

function ReadyEquipment({kind, motion}) {
  const {scene}=useGLTF(URLS[kind]), refs=useRef({});
  const groups=useMemo(()=>mergeModel(scene,kind),[scene,kind]);
  useEffect(()=>()=>disposeGroups(groups),[groups]);
  useFrame(()=>groups.forEach(group=>{
    const object=refs.current[group.key];if(!object)return;
    if(group.key==='lift')object.position.y=motion.current.lift;
    if(group.key.startsWith('wheel')){object.rotation.x=motion.current.distance/Math.max(group.radius,.035);object.rotation.y=group.key.startsWith('wheel-steer')?(motion.current.steering||0):0;}
  }));
  return <group name={'Original CC0 '+kind+' — complete imported geometry'}>{groups.map(group=><group key={group.key} position={group.pivot}
    ref={object=>{refs.current[group.key]=object;}}><Parts parts={group.parts}/></group>)}</group>;
}

function StaticReady({url,position,rotation=[0,0,0],filter}) {
  const {scene}=useGLTF(url),groups=useMemo(()=>mergeModel(scene,'static',filter||(()=>true)),[scene,filter]);
  useEffect(()=>()=>disposeGroups(groups),[groups]);
  return <group position={position} rotation={rotation}><Parts parts={groups[0].parts}/></group>;
}

function ReadyPallet({scale=1}) {
  const {scene}=useGLTF(URLS.rack);
  const groups=useMemo(()=>mergeModel(scene,'static',mesh=>{
    if(!/^Pallet_/.test(mesh.name))return false;
    const bounds=new THREE.Box3().setFromObject(mesh),center=bounds.getCenter(new THREE.Vector3());
    return center.x<0&&center.y<.5;
  },new THREE.Vector3(-.68,.22,0)),[scene]);
  useEffect(()=>()=>disposeGroups(groups),[groups]);
  return <group scale={scale} name="Original timber pallet extracted intact from CC0 racking model"><Parts parts={groups[0].parts}/></group>;
}

function pack(base,size=.4,layers=2) {
  const output=[],dx=(.38702359795570374/.5158704221248627*size+.02)/2,dz=(size+.02)/2;
  for(let layer=0;layer<layers;layer++)for(const x of [-dx,dx])for(const z of [-dz,dz])
    output.push({position:[base[0]+x,base[1]+layer*CRATE_HEIGHT*size,base[2]+z],size});
  return output;
}

function CrateInstances({geometry,material,items,castShadow}) {
  const ref=useRef();
  useLayoutEffect(()=>{
    const transform=new THREE.Object3D();items.forEach((item,index)=>{
      transform.position.fromArray(item.position);transform.scale.setScalar(item.size);transform.updateMatrix();ref.current.setMatrixAt(index,transform.matrix);
    });ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere();
  },[items]);
  return <instancedMesh ref={ref} args={[geometry,material,items.length]} castShadow={castShadow} receiveShadow dispose={null}/>;
}
function RealCrates({items,castShadow=false}) {
  const {scene}=useGLTF(URLS.crate);
  const parts=useMemo(()=>{
    const bounds=new THREE.Box3().setFromObject(scene),center=bounds.getCenter(new THREE.Vector3());
    const groups=mergeModel(scene,'static',()=>true,new THREE.Vector3(center.x,bounds.min.y,center.z));
    groups[0].parts.forEach(part=>part.geometry.scale(1/.5158704221248627,1/.5158704221248627,1/.5158704221248627));
    return groups;
  },[scene]);
  useEffect(()=>()=>disposeGroups(parts),[parts]);
  return <group name="Persistent photographed cardboard cases — Poly Haven PBR 1K">{parts[0].parts.map(part=><CrateInstances key={part.material.uuid} {...part} items={items} castShadow={castShadow}/>)}</group>;
}

function PalletLoad({scale=.9,boxSize=.4}) {
  const items=useMemo(()=>pack([0,.1325*scale,0],boxSize),[scale,boxSize]);
  return <group name="One persistent pallet and eight original cardboard cases"><ReadyPallet scale={scale}/><RealCrates items={items} castShadow/></group>;
}

function lowerPalletsAndSteel(mesh){
 if(!/^Pallet_/.test(mesh.name))return true;
 const bounds=new THREE.Box3().setFromObject(mesh),center=bounds.getCenter(new THREE.Vector3());return center.y<.5;
}
function StockRack(){
 const items=useMemo(()=>[-1,1].flatMap(side=>pack([RACK_X+side*.68,FLOOR+.3525,RACK_Z],.4)),[]);
 return <><StaticReady url={URLS.rack} position={[RACK_X,FLOOR,RACK_Z]} filter={lowerPalletsAndSteel}/><RealCrates items={items}/></>;
}
function ReceivingStations(){
 const ref=useRef(),{scene}=useGLTF(URLS.rack);
 const wood=useMemo(()=>{let material;scene.traverse(mesh=>{if(mesh.isMesh&&/^Pallet_/.test(mesh.name))material=mesh.material;});return material;},[scene]);
 useLayoutEffect(()=>{const o=new THREE.Object3D();let i=0;for(const [x,z]of [[7.10,-2.65],[8.7,-1.25],[11.3,-1.60]])for(const dx of [-.36,.36]){o.position.set(x+dx,FLOOR+.1325/2,z);o.scale.set(.08,.1325,.12);o.updateMatrix();ref.current.setMatrixAt(i++,o.matrix);}ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere();},[]);
 return <instancedMesh ref={ref} args={[undefined,wood,6]} castShadow receiveShadow name="Fixed low pallet cradles under the actual central bearers"><boxGeometry/></instancedMesh>;
}

/** Original Kenney CC0 scanner/cover/conveyor meshes, with studio materials. */
function ScannerPart({name,position,scale,finish='shell'}){
 const {scene}=useGLTF('/assets/kenney-conveyor/'+name+'.glb');
 const kit=useMemo(()=>{const root=scene.clone(true),materials=[];root.traverse(m=>{if(!m.isMesh)return;const original=m.material;const mat=new THREE.MeshPhysicalMaterial({color:finish==='shell'?'#e9e7df':finish==='frame'?'#293337':'#263741',metalness:finish==='frame'?.42:.08,roughness:finish==='shell'?.21:.32,clearcoat:finish==='shell'?.82:.28,clearcoatRoughness:.22,envMapIntensity:1.1});materials.push(mat);m.material=mat;m.castShadow=true;m.receiveShadow=true;});return{root,materials};},[scene,finish]);
 useEffect(()=>()=>kit.materials.forEach(m=>m.dispose()),[kit]);
 return <group position={position} scale={scale} name={'Kenney original '+name+' — CC0'}><primitive object={kit.root} dispose={null}/></group>;
}
function ScannerGate({time}) {
 const beam=useRef(),lamp=useRef(),ribs=useRef(),scanVolume=useRef(),scanSlice=useRef(),previous=useRef(''),matrix=useMemo(()=>new THREE.Object3D(),[]);
 const scanEdges=useMemo(()=>{const box=new THREE.BoxGeometry(SUPPLY_CASE_SIZE[0]+.018,SUPPLY_CASE_SIZE[1]+.018,SUPPLY_CASE_SIZE[2]+.018),edges=new THREE.EdgesGeometry(box);box.dispose();return edges;},[]);
 useEffect(()=>()=>scanEdges.dispose(),[scanEdges]);
 const display=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=768;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return{canvas,texture};},[]);
 useEffect(()=>()=>display.texture.dispose(),[display]);
 useFrame(()=>{
  const state=supplyChainAt(clock(time)),scan=state.scanner;
  const measured=state.cases.find(c=>c.host==='scanner-conveyor');scanVolume.current.visible=Boolean(measured);if(measured){scanVolume.current.position.set(measured.position[0],measured.position[1]+SUPPLY_CASE_SIZE[1]/2,measured.position[2]);scanVolume.current.rotation.y=measured.yaw;scanSlice.current.position.x=Math.sin(clock(time)*3.5)*SUPPLY_CASE_SIZE[0]*.48;}
  beam.current.visible=scan.active;lamp.current.material.emissiveIntensity=scan.active?2.0:.22;
  lamp.current.material.color.set(scan.active?'#84e5b1':'#9caf9b');
  const key=scan.count+':'+scan.caseId;
  if(previous.current!==key){
   previous.current=key;const c=display.canvas.getContext('2d');c.fillStyle='#f3f2ec';c.fillRect(0,0,1024,768);
   c.fillStyle='#8d283e';c.fillRect(0,0,1024,160);c.fillStyle='#fff8ec';c.font='600 66px Georgia';c.fillText('HARVARD',44,106);
   let bx=625;for(let i=0;i<48;i++){const width=[3,7,3,11,5,3,9][i%7];c.fillRect(bx,37,width,86);bx+=width+3;}
   c.fillStyle='#d7d0e6';c.beginPath();c.roundRect(48,218,286,286,30);c.fill();c.strokeStyle='#8d283e';c.lineWidth=13;
   c.strokeRect(117,277,145,123);c.beginPath();c.moveTo(117,277);c.lineTo(190,241);c.lineTo(262,277);c.moveTo(190,241);c.lineTo(190,366);c.moveTo(117,400);c.lineTo(190,437);c.lineTo(262,400);c.stroke();
   c.fillStyle='#5e6261';c.font='500 37px sans-serif';c.fillText('VOLUMES CONFERIDOS',382,247);c.fillStyle='#293337';c.font='600 151px sans-serif';c.fillText(String(scan.count).padStart(2,'0')+' / 05',376,422);
   c.fillStyle=scan.active?'#8d283e':'#747876';c.font='600 42px sans-serif';c.fillText(scan.active?'LENDO VOLUME '+String(scan.caseId+1).padStart(2,'0'):'LEITURA TRIDIMENSIONAL',382,497);
   c.fillStyle='#dddcd5';c.fillRect(48,559,928,8);c.fillStyle='#8d283e';c.fillRect(48,559,928*scan.count/scan.total,8);
   c.fillStyle='#293337';c.font='500 55px sans-serif';c.fillText('30 × 27 × 40 cm',48,660);c.fillStyle='#8b8d87';c.font='28px sans-serif';c.fillText('RECEBIMENTO  /  VERITAS',48,715);display.texture.needsUpdate=true;
  }
  const moving=state.cases.some(c=>c.host==='scanner-conveyor'),offset=moving?(clock(time)*.34)%.11:0;
  for(let i=0;i<16;i++){matrix.position.set(9.76+(i*.11+offset)%1.76,1.018,-.65);matrix.scale.set(.008,.005,.53);matrix.updateMatrix();ribs.current.setMatrixAt(i,matrix.matrix);}ribs.current.instanceMatrix.needsUpdate=true;
 });
 const x=SUPPLY_SCANNER.center,z=-.65;
 return <group name="Harvard receiving tunnel — imported Kenney conveyor and scanner">
  <group ref={scanVolume} visible={false} name="Parcel-local dimension envelope — only during conveyor custody">
   <lineSegments geometry={scanEdges}><lineBasicMaterial color="#b594ee" transparent opacity={.86} toneMapped={false}/></lineSegments>
   <mesh ref={scanSlice} rotation={[0,Math.PI/2,0]}><planeGeometry args={[SUPPLY_CASE_SIZE[2]+.012,SUPPLY_CASE_SIZE[1]+.012]}/><meshBasicMaterial color="#c29bf0" transparent opacity={.15} side={THREE.DoubleSide} depthWrite={false} toneMapped={false}/></mesh>
   {[-1,1].map(side=><mesh key={side} position={[0,SUPPLY_CASE_SIZE[1]/2+.013,side*(SUPPLY_CASE_SIZE[2]/2+.012)]}><boxGeometry args={[SUPPLY_CASE_SIZE[0]+.024,.005,.005]}/><meshBasicMaterial color="#dbb6ff" toneMapped={false}/></mesh>)}
  </group>
  <ScannerPart name="conveyor-long" position={[10.62,.85,z]} scale={[.88,.41,.57]} finish="belt"/>
  <ScannerPart name="cover" position={[x,1.02,z]} scale={[.70,.40,.44]}/>
  {/* The rounded resin casing preserves a real opening around the parcel. Its
      clear tunnel is 43cm wide and clears the 26.5cm carton by 15cm above. */}
  {[-1,1].map(side=><RoundedBox key={'resin-side-'+side} args={[.70,1.45,.05]} radius={.022} smoothness={4} position={[x,.820,z+side*.24]} castShadow receiveShadow><meshPhysicalMaterial color="#ecece5" roughness={.22} metalness={.04} clearcoat={.9} clearcoatRoughness={.19}/></RoundedBox>)}
  <RoundedBox args={[.70,.13,.53]} radius={.035} smoothness={5} position={[x,1.545,z]} castShadow receiveShadow><meshPhysicalMaterial color="#f1f0e8" roughness={.21} clearcoat={.88} clearcoatRoughness={.18}/></RoundedBox>
  {[-1,1].map(side=><RoundedBox key={'graphite-jamb-'+side} args={[.07,.43,.04]} radius={.009} position={[x+.35,1.235,z+side*.245]} castShadow><meshPhysicalMaterial color="#293337" metalness={.40} roughness={.30}/></RoundedBox>)}
  <RoundedBox args={[.07,.055,.53]} radius={.012} position={[x+.35,1.465,z]} castShadow><meshPhysicalMaterial color="#293337" metalness={.40} roughness={.30}/></RoundedBox>
  {[-.22,0,.22].map(dx=><RoundedBox key={'vent-'+dx} args={[.125,.026,.004]} radius={.007} position={[x+dx,1.35,z+.267]}><meshStandardMaterial color="#3d4445" roughness={.6}/></RoundedBox>)}
  <ScannerPart name="scanner-high" position={[x+.30,1.015,z]} scale={[.12,.36,.36]} finish="frame"/>
  {[9.94,10.53,11.24].flatMap(px=>[-1,1].map(side=><RoundedBox key={px+':'+side} args={[.045,.82,.045]} radius={.008} position={[px,.505,z+side*.24]} castShadow><meshStandardMaterial color="#8f9ba0" metalness={.72} roughness={.28}/></RoundedBox>))}
  <instancedMesh ref={ribs} args={[undefined,undefined,16]} receiveShadow><boxGeometry/><meshStandardMaterial color="#435057" metalness={.3} roughness={.48}/></instancedMesh>
  <group position={[x-.22,1.65,z+.08]} rotation={[0,Math.PI,0]} scale={.35}><StaticReady url={URLS.scanner} position={[0,0,0]} rotation={[0,0,-Math.PI/2]}/></group>
  {[-1,1].map(side=><RoundedBox key={'display-foot-'+side} args={[.055,.15,.06]} radius={.012} position={[x+side*.27,1.64,z-.04]} castShadow><meshPhysicalMaterial color="#c3c8c5" metalness={.65} roughness={.26}/></RoundedBox>)}
  <RoundedBox args={[.82,.67,.085]} radius={.045} smoothness={5} position={[x,1.985,z-.04]} castShadow receiveShadow><meshPhysicalMaterial color="#e8e8e0" roughness={.23} clearcoat={.8} clearcoatRoughness={.2}/></RoundedBox>
  <mesh position={[x,1.985,z+.005]}><planeGeometry args={[.752,.564]}/><meshBasicMaterial map={display.texture} toneMapped={false}/></mesh>
  <mesh ref={lamp} position={[x+.35,1.51,z+.20]}><sphereGeometry args={[.018,16,10]}/><meshStandardMaterial color="#84e5b1" emissive="#62cc91" emissiveIntensity={.2}/></mesh>
  <mesh ref={beam} position={[x+.31,1.225,z]} rotation={[0,Math.PI/2,0]} visible={false}><planeGeometry args={[.42,.38]}/><meshBasicMaterial color="#ee4853" transparent opacity={.17} side={THREE.DoubleSide} depthWrite={false} toneMapped={false}/></mesh>
  {[-1,1].map(side=><mesh key={'optical-strip-'+side} position={[x+.345,1.235,z+side*.222]}><boxGeometry args={[.008,.35,.006]}/><meshStandardMaterial color="#a63649" emissive="#b93746" emissiveIntensity={.30}/></mesh>)}
 </group>;
}

function WarehouseFloor() {
  return <group name="Continuous warehouse extension — 5.95m by 5.70m">
    <RoundedBox args={[5.95,.40,5.70]} radius={.045} smoothness={2} position={[9.425,-.14,-1.80]} castShadow receiveShadow>
      <meshStandardMaterial color="#dedbd2" roughness={.72}/>
    </RoundedBox>
    <mesh position={[9.425,.0775,-1.8]} receiveShadow><boxGeometry args={[5.88,.035,5.63]}/><meshPhysicalMaterial color="#bfc7c7" roughness={.38} metalness={.04} clearcoat={.35} clearcoatRoughness={.35}/></mesh>
    {[6.48,12.37].map(x=><mesh key={x} position={[x,.103,-1.8]}><boxGeometry args={[.025,.013,5.61]}/><meshStandardMaterial color="#bb9c60" metalness={.65} roughness={.4}/></mesh>)}
    {[8.55,9.35].map(x=><mesh key={x} position={[x,.102,-.85]}><boxGeometry args={[.025,.01,3.15]}/><meshStandardMaterial color="#c8a768" roughness={.62}/></mesh>)}
  </group>;
}

function HandlingScene({time}){
 const forklift=useRef(),jack=useRef(),jackActor=useRef(),forkActor=useRef(),palletRefs=useRef([]),{gl}=useThree();
 const forkMotion=useRef({lift:-.015,distance:0}),jackMotion=useRef({lift:.010,distance:0});
 const forkPose=useMemo(()=>({pelvis:1.065,pelvisAbsolute:1.065,lean:.03,headPitch:.04,headYaw:0,leftHand:new THREE.Vector3(-.13,1.25,.37),rightHand:new THREE.Vector3(.13,1.25,.37),leftFoot:new THREE.Vector3(-.16,.50,.30),rightFoot:new THREE.Vector3(.16,.50,.30)}),[]);
 const jackPose=useMemo(()=>({pelvis:.55,pelvisAbsolute:.83,lean:.035,headPitch:.09,headYaw:0,leftHand:new THREE.Vector3(),rightHand:new THREE.Vector3(),leftFoot:new THREE.Vector3(-.12,.055,0),rightFoot:new THREE.Vector3(.12,.055,0)}),[]);
 const targets=useMemo(()=>({left:new THREE.Vector3(),right:new THREE.Vector3()}),[]);
 useFrame(()=>{
  const state=supplyChainAt(clock(time)),f=state.forklift,j=state.jack;
  if(!forklift.current||!jack.current||!jackActor.current)return;
  forklift.current.position.fromArray(f.position);forklift.current.rotation.y=f.yaw;forkMotion.current.lift=f.lift;forkMotion.current.distance=f.distance;forkMotion.current.steering=f.steering;
  jack.current.position.fromArray(j.position);jack.current.rotation.y=j.yaw;jackMotion.current.lift=j.lift;jackMotion.current.distance=j.distance;jackMotion.current.steering=j.steering;
  state.pallets.forEach((p,i)=>{const object=palletRefs.current[i];if(object){object.position.fromArray(p.position);object.rotation.y=p.yaw;}});
  const sn=Math.sin(j.yaw),c=Math.cos(j.yaw);
  jackActor.current.position.set(j.position[0]-sn*1.13,j.position[1],j.position[2]-c*1.13);jackActor.current.rotation.y=j.yaw;jackActor.current.updateMatrixWorld(true);
  targets.left.set(j.position[0]-.15*c-.71*sn,j.position[1]+1.23,j.position[2]+.15*sn-.71*c);targets.right.set(j.position[0]+.15*c-.71*sn,j.position[1]+1.23,j.position[2]-.15*sn-.71*c);
  jackActor.current.worldToLocal(targets.left);jackActor.current.worldToLocal(targets.right);jackPose.leftHand.copy(targets.left);jackPose.rightHand.copy(targets.right);
  const step=j.distance/.40*Math.PI*2,w=j.moving?1:0;jackPose.leftFoot.set(-.12,.055+Math.max(0,Math.sin(step))*.06*w,.02+Math.sin(step)*.13*w);jackPose.rightFoot.set(.12,.055+Math.max(0,-Math.sin(step))*.06*w,.02-Math.sin(step)*.13*w);jackPose.lean=.035+.05*w;
  forkPose.headYaw=f.moving?.10*Math.sin(state.t*.6):0;forkPose.rightHand.y=1.25+.025*Math.sin(state.t*1.7)*(f.lift>.1?1:0);
  Object.assign(gl.domElement.dataset,{worldWarehouseTask:state.task,worldWarehouseForkliftX:f.position[0].toFixed(3),worldWarehouseForkliftZ:f.position[2].toFixed(3),worldWarehouseForkliftLift:f.lift.toFixed(3),worldWarehouseJackX:j.position[0].toFixed(3),worldWarehouseJackZ:j.position[2].toFixed(3),worldWarehouseLoadIdentity:'two-persistent-pallets-eight-shared-cases',worldWarehousePallet0Support:state.pallets[0].host,worldWarehousePallet1Support:state.pallets[1].host,worldWarehouseComplete:String(state.complete),worldScannerCount:String(state.scanner.count),worldScannerCase:String(state.scanner.caseId??''),worldScannerActive:String(state.scanner.active),worldWarehouseSteering:f.steering.toFixed(3)});
 },-2);
 return <group name="Coordinated receiving warehouse — one finite remittance">
  <WarehouseFloor/><StockRack/><ReceivingStations/><ScannerGate time={time}/>
  <group ref={forklift} position={[7.10,FLOOR,.05]} rotation={[0,Math.PI,0]}><ReadyEquipment kind="forklift" motion={forkMotion}/><group ref={forkActor}><ImportedScholar actorRef={forkActor} pose={forkPose} time={time} variant={2} worker/></group></group>
  <group ref={jack} position={[9.15,FLOOR,-1.25]} rotation={[0,-Math.PI/2,0]}><ReadyEquipment kind="jack" motion={jackMotion}/></group>
  {[0,1].map(i=><group key={i} ref={o=>{palletRefs.current[i]=o;}} name={'Persistent incoming pallet '+i}><ReadyPallet scale={SUPPLY_PALLET_SCALE}/></group>)}
  <group ref={jackActor}><ImportedScholar actorRef={jackActor} pose={jackPose} time={time} variant={3} worker/></group>
 </group>;
}

/** Mount in the world's Canvas; owns its floor, uses only the shared clock. */
export default function ArchiveWarehouseHandling({time}) {
  return <Suspense fallback={null}><HandlingScene time={time}/></Suspense>;
}
