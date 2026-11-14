import React, {useEffect, useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three';

const URL = '/assets/ready-models/box-truck.glb';
const WHEEL_PART = /^(Circumferential_truck_tire_tread|Commercial_tire_formed_sidewalls|Dished_steel_commercial_wheel|Heavy_wheel_|Truck_tire_transverse_siping)/;
const SOURCE_LENGTH = 7.389999866485596;
const SOURCE_CENTER_X = .019999980926513672;

function DrawParts({parts}) {
  return parts.map(part => <mesh key={part.material.uuid} geometry={part.geometry}
    material={part.material} castShadow={!part.material.transmission} receiveShadow dispose={null}/>);
}

/** Original Innerscene CC0 7.5t truck. Closed doors; original PBR and all detail. */
export default function ReadyLibraryTruck({length = 4.3, distance = 0}) {
  const {scene} = useGLTF(URL), axles = useRef([]);
  const model = useMemo(() => {
    scene.updateMatrixWorld(true);
    const factor = length / SOURCE_LENGTH;
    const buckets = [new Map(), new Map(), new Map()];
    const axleRaw = [new THREE.Vector3(-2.49000001, .472000004, 0), new THREE.Vector3(1.920000017, .472000004, 0)];
    const turn = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
    scene.traverse(mesh => {
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      geometry.computeBoundingBox();
      const center = geometry.boundingBox.getCenter(new THREE.Vector3());
      const axle = WHEEL_PART.test(mesh.name) ? (center.x < 0 ? 0 : 1) : -1;
      if (axle >= 0) geometry.translate(-axleRaw[axle].x, -axleRaw[axle].y, -axleRaw[axle].z);
      else geometry.translate(-SOURCE_CENTER_X, 0, 0);
      geometry.applyMatrix4(turn);
      geometry.scale(factor, factor, factor);
      const bucket = buckets[axle + 1], key = mesh.material.uuid;
      if (!bucket.has(key)) bucket.set(key, {material: mesh.material, list: []});
      bucket.get(key).list.push(geometry);
    });
    const groups = buckets.map(bucket => [...bucket.values()].map(({material, list}) => {
      const geometry = mergeGeometries(list, false);
      list.forEach(part => part.dispose());
      geometry.computeBoundingSphere();
      return {geometry, material};
    }));
    const pivots = axleRaw.map(point => point.clone().sub(new THREE.Vector3(SOURCE_CENTER_X, 0, 0)).applyMatrix4(turn).multiplyScalar(factor));
    return {groups, pivots, radius: .465 * factor};
  }, [scene, length]);
  useEffect(() => () => model.groups.flat().forEach(part => part.geometry.dispose()), [model]);
  useFrame(() => {
    const metres = typeof distance === 'number' ? distance : distance.current || 0;
    axles.current.forEach(axle => {if (axle) axle.rotation.x = -metres / model.radius;});
  });
  return <group name="Imported original unbranded 7.5t library truck — Innerscene CC0"
    userData={{readyModel: 'Innerscene box truck', length, width: 2.734 * length / SOURCE_LENGTH, height: 3.307 * length / SOURCE_LENGTH}}>
    <DrawParts parts={model.groups[0]}/>
    {model.pivots.map((position, index) => <group key={index} position={position}
      ref={group => {axles.current[index] = group;}}><DrawParts parts={model.groups[index + 1]}/></group>)}
  </group>;
}
