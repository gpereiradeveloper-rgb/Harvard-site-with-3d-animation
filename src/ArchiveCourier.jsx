import React, {Suspense, useEffect, useMemo, useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import ReadyLibraryTruck from './ReadyLibraryTruck';
import {ImportedScholar} from './ArchiveReadyModels';
import {ReadyBookSet} from './ArchiveCollectionModels';
import {easeRoad} from './ArchiveRoadMotion';

export const LIBRARY_COURIER_PARK = Object.freeze([7.55, -.88, 3.45]);
const START_Z = 6.0, CARGO_X = 9.20, CARGO_Z = 5.65;
const DECK_HEIGHT = .78, CYCLE = 60;
const phaseTime = time => Math.max(0, typeof time === 'number' ? time : time?.current || 0);

/** A real imported truck stays inside a straight service lane. It reverses out
 * after the archivist clears the exterior transfer station; no tiny U-turns.
 */
function courierPhase(seconds) {
  const t = seconds % CYCLE;
  const arrival = easeRoad(t, 0, 8), reverse = easeRoad(t, 42, 58);
  const forwardDistance = (START_Z - LIBRARY_COURIER_PARK[2]) * (arrival - reverse);
  const transfer = easeRoad(t, 18, 23) * (1 - easeRoad(t, 27, 32));
  const engage = easeRoad(t, 14, 16) * (1 - easeRoad(t, 32, 34));
  const approach = easeRoad(t, 9, 14) * (1 - easeRoad(t, 34, 40));
  return {t, forwardDistance, z: START_Z - forwardDistance, transfer, engage, approach,
    task: t < 8 ? 'chegar à área de serviço' : t < 14 ? 'aproximar da plataforma exterior' :
      t < 18 ? 'segurar os volumes apoiados' : t < 23 ? 'levar os volumes pelos roletes' :
      t < 27 ? 'conferir a coleção na plataforma' : t < 32 ? 'retornar os volumes conferidos' :
      t < 40 ? 'liberar a área de serviço' : t < 42 ? 'aguardar a faixa livre' :
      t < 58 ? 'recuar pela faixa de serviço' : 'aguardar o próximo atendimento'};
}

function ReceivingPlatform({assets}) {
  const rollers = useRef();
  const material = assets.mats;
  const rollerGeometry = useMemo(() => new THREE.CylinderGeometry(.025, .025, .79, 20), []);
  useEffect(() => () => rollerGeometry.dispose(), [rollerGeometry]);
  useEffect(() => {
    const transform = new THREE.Object3D();
    for (let i = 0; i < 17; i++) {
      transform.position.set(CARGO_X, LIBRARY_COURIER_PARK[1] + DECK_HEIGHT - .025, 5.15 + i * .11);
      transform.rotation.z = Math.PI / 2; transform.updateMatrix();
      rollers.current.setMatrixAt(i, transform.matrix);
    }
    rollers.current.instanceMatrix.needsUpdate = true;
    rollers.current.computeBoundingSphere();
  }, []);
  return <group name="Supported exterior collection transfer station">
    <instancedMesh ref={rollers} args={[rollerGeometry, material.gold, 17]} castShadow receiveShadow/>
    {[-1, 1].map(side => <React.Fragment key={side}>
      <mesh geometry={assets.box} material={material.ink} position={[CARGO_X + side * .44, LIBRARY_COURIER_PARK[1] + DECK_HEIGHT - .045, 6.03]} scale={[.055, .09, 2.0]} castShadow receiveShadow/>
      {[5.28, 6.79].map(z => <mesh key={z} geometry={assets.box} material={material.ink}
        position={[CARGO_X + side * .36, LIBRARY_COURIER_PARK[1] + .36, z]} scale={[.065, .72, .065]} castShadow receiveShadow/>)}
    </React.Fragment>)}
    {[5.12, 6.94].map(z => <mesh key={z} geometry={assets.box} material={material.gold}
      position={[CARGO_X, LIBRARY_COURIER_PARK[1] + DECK_HEIGHT + .025, z]} scale={[.90, .045, .035]} castShadow receiveShadow/>)}
  </group>;
}

function ReceivingArchivist({time, pose, actorRef}) {
  const scratch = useMemo(() => ({left: new THREE.Vector3(), right: new THREE.Vector3(), rest: new THREE.Vector3()}), []);
  useFrame(() => {
    const actor = actorRef.current; if (!actor) return;
    const seconds = phaseTime(time), state = courierPhase(seconds), cargoZ = CARGO_Z + state.transfer * .75;
    const x = THREE.MathUtils.lerp(10.0, 9.88, state.approach);
    const z = THREE.MathUtils.lerp(4.95, cargoZ, state.approach);
    actor.position.set(x, LIBRARY_COURIER_PARK[1], z);
    actor.rotation.y = -Math.PI / 2; actor.updateMatrixWorld(true);
    const worldY = LIBRARY_COURIER_PARK[1] + DECK_HEIGHT + .145;
    scratch.left.set(CARGO_X + .235, worldY, cargoZ - .115);
    scratch.right.set(CARGO_X + .235, worldY, cargoZ + .115);
    actor.worldToLocal(scratch.left); actor.worldToLocal(scratch.right);
    pose.leftHand.set(-.26, .87, .10).lerp(scratch.left, state.engage);
    pose.rightHand.set(.26, .87, .10).lerp(scratch.right, state.engage);
    // Foot targets follow the actual slow displacement along the service stand.
    const moving = (state.t > 9 && state.t < 14) || (state.t > 18 && state.t < 23) ||
      (state.t > 27 && state.t < 32) || (state.t > 34 && state.t < 40);
    const step = seconds * 3.1, stride = moving ? .065 : 0;
    pose.leftFoot.set(-.12, .045 + Math.max(0, Math.sin(step)) * stride * .55, Math.cos(step) * stride);
    pose.rightFoot.set(.12, .045 + Math.max(0, -Math.sin(step)) * stride * .55, -Math.cos(step) * stride);
    pose.pelvis = .55; pose.lean = state.engage * .045; pose.headPitch = state.engage * .10;
  }, -2);
  return <group ref={actorRef} name="Imported adult receiving archivist">
    <ImportedScholar pose={pose} actorRef={actorRef} time={time} variant={1}/>
  </group>;
}

function CourierModels({assets, time}) {
  const truck = useRef(), shipment = useRef(), actor = useRef(), distance = useRef(0);
  const {gl} = useThree();
  const pose = useMemo(() => ({pelvis: .55, lean: 0, headPitch: 0, headYaw: 0,
    leftHand: new THREE.Vector3(-.26, .87, .10), rightHand: new THREE.Vector3(.26, .87, .10),
    leftFoot: new THREE.Vector3(-.12, .045, 0), rightFoot: new THREE.Vector3(.12, .045, 0)}), []);
  useEffect(() => () => {
    for (const key of ['worldCourierTask', 'worldCourierX', 'worldCourierZ', 'worldCourierDriverX', 'worldCourierDriverZ',
      'worldCourierDoor', 'worldCourierCrateX', 'worldCourierCrateY', 'worldCourierCrateZ', 'worldCourierLoadIdentity', 'worldCourierModel']) delete gl.domElement.dataset[key];
  }, [gl]);
  useFrame(() => {
    if (!truck.current || !shipment.current) return;
    const state = courierPhase(phaseTime(time));
    truck.current.position.set(LIBRARY_COURIER_PARK[0], LIBRARY_COURIER_PARK[1], state.z);
    distance.current = state.forwardDistance;
    shipment.current.position.set(CARGO_X, LIBRARY_COURIER_PARK[1] + DECK_HEIGHT, CARGO_Z + state.transfer * .75);
    Object.assign(gl.domElement.dataset, {
      worldCourierTask: state.task, worldCourierX: LIBRARY_COURIER_PARK[0].toFixed(3), worldCourierZ: state.z.toFixed(3),
      worldCourierDriverX: actor.current?.position.x.toFixed(3) || '', worldCourierDriverZ: actor.current?.position.z.toFixed(3) || '',
      worldCourierDoor: '0.000', worldCourierCrateX: CARGO_X.toFixed(3),
      worldCourierCrateY: (LIBRARY_COURIER_PARK[1] + DECK_HEIGHT).toFixed(3),
      worldCourierCrateZ: shipment.current.position.z.toFixed(3), worldCourierLoadIdentity: 'one-persistent-real-encyclopedia-set',
      worldCourierModel: 'Innerscene CC0 original unbranded box truck / 4.30m uniform length',
    });
  }, -2);
  return <group name="Library service — ready truck, supported volumes and adult archivist">
    <group ref={truck}><ReadyLibraryTruck length={4.3} distance={distance}/></group>
    <ReceivingPlatform assets={assets}/>
    <group ref={shipment} name="One persistent supported encyclopedia shipment"><ReadyBookSet width={.48}/></group>
    <ReceivingArchivist time={time} pose={pose} actorRef={actor}/>
  </group>;
}

export default function ArchiveCourier(props) {
  return <Suspense fallback={null}><CourierModels {...props}/></Suspense>;
}
