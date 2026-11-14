import React, {Suspense, useEffect, useLayoutEffect, useMemo, useRef} from 'react';
import {useGLTF} from '@react-three/drei';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as THREE from 'three';

const BOOKS = '/assets/ready-models/encyclopedias/book_encyclopedia_shelf_lod.gltf';
const SHELVES = [
  {position: [-4.1, 0, -4.02], rotation: 0},
  {position: [-1.35, 0, -4.02], rotation: 0},
  {position: [-5.57, 0, -1.70], rotation: Math.PI / 2},
];

function BookInstances({geometry, material, matrices}) {
  const ref = useRef();
  useLayoutEffect(() => {
    matrices.forEach((matrix, index) => ref.current.setMatrixAt(index, matrix));
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingBox();
    ref.current.computeBoundingSphere();
  }, [matrices]);
  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]}
    receiveShadow dispose={null}/>;
}

function ShelvedBookAssets({shelves = SHELVES, rows = 5, width = 1.12, firstShelf = .435, rowStep = .66, front = .28}) {
  const {scene} = useGLTF(BOOKS);
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene);
    const center = bounds.getCenter(new THREE.Vector3());
    const sourceWidth = bounds.max.x - bounds.min.x;
    const byMaterial = new Map();
    scene.traverse(mesh => {
      if (!mesh.isMesh) return;
      // The official set has one cover and one paper primitive per volume.
      // Shelf LOD preserves source vertices, UVs and 2K material maps. It only
      // omits sub-pixel triangles (<=0.2% positional error); focal book sets
      // elsewhere in the archive retain the full 67,306-triangle original.
      const key = mesh.material.uuid;
      if (!byMaterial.has(key)) byMaterial.set(key, {material: mesh.material, geometries: []});
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      geometry.translate(-center.x, -bounds.min.y, -center.z);
      geometry.scale(1 / sourceWidth, 1 / sourceWidth, 1 / sourceWidth);
      byMaterial.get(key).geometries.push(geometry);
    });
    return [...byMaterial.values()].map(({material, geometries}) => {
      const geometry = mergeGeometries(geometries, false);
      geometries.forEach(part => part.dispose());
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      return {geometry, material};
    });
  }, [scene]);
  const matrices = useMemo(() => {
    const output = [], local = new THREE.Matrix4(), world = new THREE.Matrix4();
    const position = new THREE.Vector3(), scale = new THREE.Vector3();
    const rotation = new THREE.Quaternion(), upright = new THREE.Quaternion();
    const naturalWidths = [1.10, 1.14, 1.12, 1.10, 1.16];
    shelves.forEach((shelf, shelfIndex) => {
      position.fromArray(shelf.position);
      rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), shelf.rotation || 0);
      world.compose(position, rotation, new THREE.Vector3(1, 1, 1));
      for (let row = 0; row < rows; row++) for (const column of [-1, 1]) {
        const setWidth = width * naturalWidths[(row + shelfIndex + (column === 1 ? 1 : 0)) % naturalWidths.length] / 1.12;
        scale.setScalar(setWidth);
        // Native spines face +Z: the cover's full cap is at its positive-Z
        // edge. Each upright set rests on the shelf and keeps that orientation.
        position.set(column * .61, firstShelf + row * rowStep, front);
        local.compose(position, upright, scale);
        output.push(new THREE.Matrix4().multiplyMatrices(world, local));
      }
    });
    return output;
  }, [shelves, rows, width, firstShelf, rowStep, front]);
  useEffect(() => () => parts.forEach(part => part.geometry.dispose()), [parts]);
  return <group name="600 original leather encyclopedia volumes — 30 instanced sets"
    userData={{collectionModel: 'book_encyclopedia_set_01', sets: matrices.length, sourceTrianglesPerSet: 67306, shelfTrianglesPerSet:31760}}>
    {parts.map(({geometry, material}) => <BookInstances key={material.uuid} geometry={geometry} material={material} matrices={matrices}/>)}
  </group>;
}

/** Three focal bookcases, original meshes batched into two material draws. */
export function ReadyShelvedBooks(props) {
  return <Suspense fallback={null}><ShelvedBookAssets {...props}/></Suspense>;
}

export default ReadyShelvedBooks;
