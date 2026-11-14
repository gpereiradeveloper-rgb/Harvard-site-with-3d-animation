import React,{Suspense,useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {ImportedScholar} from './ArchiveReadyModels';
import {backpackHomeAt} from './ArchiveBackpackMotion';
import {ReadyReadingChair} from './ArchiveCollectionModels';
import {StudyDevice} from './ArchiveStudyDevices';
import {shelfStudentAt,shelfStudentState,SHELF_STUDENT_SEAT,SHELF_STUDENT_DEVICE} from './ArchiveShelfStudentMotion';

function makePose(){return{pelvis:.72,pelvisAbsolute:.72,backpackWorn:false,lean:.06,headPitch:.24,headYaw:0,leftHand:new THREE.Vector3(),rightHand:new THREE.Vector3(),leftFoot:new THREE.Vector3(),rightFoot:new THREE.Vector3()};}
// The left side clears the student's path along the right side of this chair.
const BACKPACK_HOME=backpackHomeAt(SHELF_STUDENT_SEAT,0,-1);

function BorrowedVolume({assets,bookRef,coverRef}){
 const print=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;
  const c=canvas.getContext('2d');c.clearRect(0,0,512,768);c.strokeStyle='#c8b17c';c.lineWidth=3;c.strokeRect(31,28,450,712);c.strokeRect(40,37,432,694);
  c.fillStyle='#d9c38e';c.textAlign='center';c.font='bold 43px Georgia';c.fillText('HARVARD',256,172);c.font='27px Georgia';c.fillText('LIBRARY',256,220);c.font='24px Georgia';c.fillText('NATURAL',256,421);c.fillText('PHILOSOPHY',256,463);c.font='21px Georgia';c.fillText('VERITAS · 1636',256,650);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
 },[]);
 useEffect(()=>()=>print.dispose(),[print]);
 return <group ref={bookRef} name="Single persistent student loan — reserved shelf lip">
  <RoundedBox args={[.24,.008,.29]} radius={.003} smoothness={2} position={[0,-.025,0]} material={assets.mats.wine} castShadow receiveShadow/>
  <RoundedBox args={[.224,.035,.272]} radius={.003} smoothness={2} material={assets.mats.paper} castShadow receiveShadow/>
  <RoundedBox args={[.009,.052,.29]} radius={.003} smoothness={2} position={[-.118,0,0]} material={assets.mats.wine} castShadow/>
  <group ref={coverRef} position={[-.12,.025,0]}>
   <RoundedBox args={[.24,.008,.29]} radius={.003} smoothness={2} position={[.12,0,0]} material={assets.mats.wine} castShadow receiveShadow/>
   <mesh position={[.12,.0044,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.221,.276]}/><meshStandardMaterial map={print} transparent roughness={.57} depthWrite={false}/></mesh>
  </group>
 </group>;
}

/** Replaces one seated reader; the same actor fetches and returns one volume. */
export default function ArchiveShelfStudent({assets,time}){
 const actor=useRef(),chair=useRef(),book=useRef(),cover=useRef(),{gl}=useThree();
 const state=useMemo(shelfStudentState,[]),pose=useMemo(makePose,[]),target=useMemo(()=>new THREE.Vector3(),[]);
 const handOffset=useMemo(()=>new THREE.Vector3(),[]);
 useFrame(()=>{
  if(!actor.current||!chair.current||!book.current)return;
  shelfStudentAt(time.current,state);actor.current.position.copy(state.position);actor.current.rotation.y=state.yaw;actor.current.updateMatrixWorld(true);
  chair.current.position.copy(state.chair);book.current.position.copy(state.bookPosition);book.current.quaternion.copy(state.bookQuaternion);cover.current.rotation.z=state.cover;
  pose.pelvisAbsolute=state.pelvisAbsolute;pose.pelvis=state.pelvisAbsolute;pose.lean=.04+.04*state.seated+.11*state.reading;pose.headPitch=.11+.15*state.seated;pose.headYaw=Math.sin(time.current*.31)*.025*state.seated;
  pose.walkDistance=state.walkDistance;pose.walkWeight=state.walkWeight;pose.walkStride=.45;pose.motionTime=time.current;pose.handTaskWeight=Math.max(state.grip,state.reading,state.seated);
  for(const [index,side]of [-1,1].entries()){
   const foot=side<0?pose.leftFoot:pose.rightFoot,hand=side<0?pose.leftHand:pose.rightHand;
   const stride=((state.walkDistance/.45+index*.5)%1+1)%1;
   let z=.16-stride*.45,lift=0;
   if(stride>=.62){const u=(stride-.62)/.38;z=-.119+.279*u*u*(3-2*u);lift=Math.sin(Math.PI*u)*.065;}
   foot.set(side*.11,THREE.MathUtils.lerp(.055,.35,state.seated)+lift*state.walkWeight,THREE.MathUtils.lerp(THREE.MathUtils.lerp(.035,.15,state.seated),z,state.walkWeight));
   hand.set(side*.19,.94,.08-Math.sin(state.walkDistance/.45*Math.PI*2+index*Math.PI)*.08*state.walkWeight);
   // Typing occupies the left half of the student's place, leaving a separate
   // supported area on the right for the borrowed volume.
   target.set(SHELF_STUDENT_DEVICE[0]+side*.07,1.218+Math.sin(time.current*(side<0?7.1:8.7))*.003,SHELF_STUDENT_DEVICE[2]-.03);
   actor.current.worldToLocal(target);hand.lerp(target,state.seated);
   if(state.grip>.001||state.reading>.001){
    handOffset.set(side*.09,.02,0).applyQuaternion(state.bookQuaternion);target.copy(state.bookPosition).add(handOffset);actor.current.worldToLocal(target);
    hand.lerp(target,Math.max(state.grip,state.reading*(side>0?1:.45)));
   }
  }
  Object.assign(gl.domElement.dataset,{worldShelfStudentTask:state.task,worldShelfStudentPhase:state.phase.toFixed(2),worldShelfStudentX:state.position.x.toFixed(3),worldShelfStudentZ:state.position.z.toFixed(3),worldShelfStudentBookHost:state.host,worldShelfStudentBookX:state.bookPosition.x.toFixed(3),worldShelfStudentBookY:state.bookPosition.y.toFixed(3),worldShelfStudentBookZ:state.bookPosition.z.toFixed(3),worldShelfStudentIdentity:'one-student-one-book-140s'});
 },-3);
 useEffect(()=>()=>{for(const key of Object.keys(gl.domElement.dataset).filter(k=>k.startsWith('worldShelfStudent')))delete gl.domElement.dataset[key];},[gl]);
 return <group name="Student library retrieval and return">
  <group ref={actor} position={SHELF_STUDENT_SEAT}><Suspense fallback={null}><ImportedScholar actorRef={actor} pose={pose} variant={1} backpack backpackHome={BACKPACK_HOME}/></Suspense></group>
  <group ref={chair} position={SHELF_STUDENT_SEAT}><Suspense fallback={null}><ReadyReadingChair height={1} seatHeight={.64}/></Suspense></group>
  <Suspense fallback={null}><StudyDevice position={SHELF_STUDENT_DEVICE} rotation={[0,Math.PI,0]} scale={.8}/></Suspense>
  <BorrowedVolume assets={assets} bookRef={book} coverRef={cover}/>
 </group>;
}
