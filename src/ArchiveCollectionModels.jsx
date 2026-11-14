import React, {Suspense, useEffect, useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import * as THREE from 'three';
import ArchiveRigidBatch from './ArchiveRigidBatch';

const ROOT = '/assets/collection-models/';
const LAMP = ROOT + 'desk_lamp_arm_01-1k.glb';
const CHAIR = ROOT + 'painted_wooden_chair_01-1k.glb';
const TABLE = ROOT + 'painted_wooden_table-1k.glb';
// Shared with ArchiveReadyModels; do not fetch a second copy of the same books.
const BOOKS = '/assets/ready-models/encyclopedias/book_encyclopedia_set_01_2k.gltf';

// Clone only the object hierarchy: geometry, UVs and original 1K PBR maps stay
// shared in the loader cache, including the source lamp's articulated mesh.
function useCollectionModel(url, size, dimension, anchor = 'floor') {
  const {scene} = useGLTF(url);
  return useMemo(() => {
    const model = clone(scene);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const extent = bounds.getSize(new THREE.Vector3());
    const factor = size / Math.max(extent[dimension], .0001);
    const center = bounds.getCenter(new THREE.Vector3());
    // The lamp's original origin is its tabletop mounting plane; its clamp
    // deliberately extends below that plane. Books/chairs rest on their bounds.
    if (anchor === 'source') model.position.set(0, 0, 0);
    else model.position.set(-center.x * factor, -bounds.min.y * factor, -center.z * factor);
    model.scale.setScalar(factor);
    model.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    return model;
  }, [scene, size, dimension, anchor]);
}

/** Position is the tabletop/contact point. Height is in scene metres. */
export function ReadyDeskLamp({position = [0, 0, 0], rotation = [0, 0, 0], height = .65, ...props}) {
  const model = useCollectionModel(LAMP, height, 'y', 'source');
  return <group name="Poly Haven articulated desk lamp — CC0" position={position} rotation={rotation} {...props}>
    <primitive object={model} dispose={null}/>
  </group>;
}

/** A complete original encyclopedia set, normalized to its chosen width. */
export function ReadyBookSet({position = [0, 0, 0], rotation = [0, 0, 0], width = .72, ...props}) {
  const model = useCollectionModel(BOOKS, width, 'x');
  return <group name="Poly Haven leather encyclopedia volumes — CC0" position={position} rotation={rotation} {...props}>
    <ArchiveRigidBatch><primitive object={model} dispose={null}/></ArchiveRigidBatch>
  </group>;
}

export function ReadyReadingChair({position = [0, 0, 0], rotation = [0, 0, 0], height = 1, seatHeight, ...props}) {
  const source = useCollectionModel(CHAIR, height, 'y');
  const prepared = useMemo(() => {
    if (seatHeight === undefined) return {model: source, geometries: []};
    const model = clone(source), geometries = [], factor = model.scale.y;
    // A high reading chair: lengthen only the original legs below the seat.
    // The source seat, back, width, UVs and surface detail remain at their scale.
    // Native seat top was measured at y=.449m in the downloaded original mesh.
    model.traverse(object => {
      if (!object.isMesh) return;
      const geometry = object.geometry.clone(), points = geometry.attributes.position;
      geometry.computeBoundingBox();
      const floor = geometry.boundingBox.min.y, nativeSeat = (.449-floor)*factor;
      for (let i=0;i<points.count;i++) {
        const y=(points.getY(i)-floor)*factor;
        const next=y<=nativeSeat ? y*seatHeight/nativeSeat : y+seatHeight-nativeSeat;
        points.setY(i,next/factor+floor);
      }
      points.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
      object.geometry=geometry;geometries.push(geometry);
    });
    return {model, geometries};
  }, [source, seatHeight]);
  useEffect(() => () => prepared.geometries.forEach(geometry=>geometry.dispose()), [prepared]);
  return <group name="Poly Haven painted wooden reading chair — CC0" position={position} rotation={rotation} {...props}>
    <primitive object={prepared.model} dispose={null}/>
  </group>;
}

/**
 * Original CC0 farmhouse table, natural size about 2.406 x .959 x 1.137 m.
 * Position is the floor centre; top = position.y + height. Width is local X,
 * depth local Z. Requested dimensions fit the existing mesh without new parts.
 */
export function ReadyArchiveTable({position = [0, 0, 0], rotation = [0, 0, 0], width = 2.4, depth = 1.137, height = .959, ...props}) {
  const {scene} = useGLTF(TABLE);
  const model = useMemo(() => {
    const object = clone(scene);
    object.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = new THREE.Vector3(width / size.x, height / size.y, depth / size.z);
    object.scale.copy(scale);
    object.position.set(-center.x * scale.x, -bounds.min.y * scale.y, -center.z * scale.z);
    object.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    return object;
  }, [scene, width, depth, height]);
  return <group name="Poly Haven farmhouse archive table — CC0" position={position} rotation={rotation}
    userData={{collectionModel: 'painted_wooden_table', width, depth, height}} {...props}>
    <primitive object={model} dispose={null}/>
  </group>;
}

export default function ArchiveCollectionModels({time}) {
  // These props are static collection objects; the parent owns the ambient clock.
  // Keep the time interface consistent without adding ornamental movement.
  return <Suspense fallback={null}>
    <group name="Ready collection models — original meshes and materials">
      <ReadyDeskLamp position={[-3.95, 1.25, .30]} rotation={[0, -.35, 0]}/>
      <ReadyDeskLamp position={[4.48, 1.14, -1.45]} rotation={[0, Math.PI + .25, 0]}/>
      <ReadyBookSet position={[-1.72, 1.25, .60]} rotation={[0, -.12, 0]} width={.70}/>
      <ReadyBookSet position={[4.65, 1.1575, -.86]} rotation={[0, Math.PI, 0]} width={.66}/>
    </group>
  </Suspense>;
}
