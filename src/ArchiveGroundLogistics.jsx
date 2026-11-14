import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {ImportedScholar} from './ArchiveReadyModels';
import {backpackHomeAt} from './ArchiveBackpackMotion';
import {ReadyReadingChair} from './ArchiveCollectionModels';
import {StudyDevice} from './ArchiveStudyDevices';
import {campusDeliveryAt,campusDeliveryState,CAMPUS_DELIVERY_SEATS,CAMPUS_DELIVERY_TABLETS} from './ArchiveCampusDelivery';
import ArchiveStreetRobot from './ArchiveStreetRobot';

/**
 * Fictional archive logistics on the forecourt shared with the conservation wing.
 * Mount alongside PlacedObjects, so the shared floor stays at its authored height.
 * The parent clock drives all motion. Each lane keeps a single physical carton.
 */
export const ARCHIVE_GROUND_BOUNDS = Object.freeze({
  x: [6.43, 10.94],
  z: [-1.008, .39],
  floor: .0925,
});

const FLOOR = ARCHIVE_GROUND_BOUNDS.floor;
const LANE_Z = [-.66, .02];
const LEFT_CART = 7.56;
const RIGHT_CART = 9.40;
const LEFT_DOCK = 6.80;
const RIGHT_DOCK = 10.16;
const WHEEL_RADIUS = .068;
const ROLLER_RADIUS = .032;
const ROLLER_Y = .242;
const CARGO_Y = ROLLER_Y + ROLLER_RADIUS;
const CYCLE = 46;
const ZERO = [0, 0, 0];
const WHEEL_POSITIONS = [
  { x: 0, z: -.245, scale: 1 },
  { x: 0, z: .245, scale: 1 },
  { x: -.218, z: 0, scale: .48 },
  { x: .218, z: 0, scale: .48 },
];
const CART_ROLLERS = Array.from({ length: 6 }, (_, i) => -.245 + i * .098);
const LEFT_ROLLERS = Array.from({ length: 7 }, (_, i) => 6.49 + i * .101);
const RIGHT_ROLLERS = Array.from({ length: 7 }, (_, i) => 9.85 + i * .101);

function timeValue(time) {
  const value = typeof time === 'number' ? time : time?.current;
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function ease(value, from, to) {
  const fraction = THREE.MathUtils.clamp((value - from) / (to - from), 0, 1);
  // Minimum-jerk travel: velocity and acceleration both settle at each dock.
  return fraction ** 3 * (fraction * (fraction * 6 - 15) + 10);
}

/** Positions and wheel angles are evaluated from the same eased travel distance. */
export function archiveGroundState(seconds, lane = 0) {
  const laneIndex = lane === 1 ? 1 : 0;
  const elapsed = timeValue(seconds) + laneIndex * 22;
  const phase = elapsed % CYCLE;
  const loadLeft = ease(phase, 2, 5);
  const driveRight = ease(phase, 7, 15);
  const unloadRight = ease(phase, 17.5, 20.5);
  const loadRight = ease(phase, 25, 28);
  const driveLeft = ease(phase, 30, 38);
  const unloadLeft = ease(phase, 39, 42);

  const vehicleX = LEFT_CART + (RIGHT_CART - LEFT_CART) * (driveRight - driveLeft);
  const leftTransfer = (LEFT_CART - LEFT_DOCK) * (loadLeft - unloadLeft);
  const rightTransfer = (RIGHT_DOCK - RIGHT_CART) * (unloadRight - loadRight);
  const cargoX = LEFT_DOCK + leftTransfer + (vehicleX - LEFT_CART) + rightTransfer;

  let task = 'recepcao';
  let support = 'receiving-dock';
  if (phase >= 2 && phase < 5) {
    task = 'carregar';
    support = 'dock-and-vehicle';
  } else if (phase >= 5 && phase < 17.5) {
    task = phase >= 7 && phase < 15 ? 'transportar' : 'alinhar';
    support = 'vehicle';
  } else if (phase >= 17.5 && phase < 20.5) {
    task = 'entregar';
    support = 'vehicle-and-intake';
  } else if (phase >= 20.5 && phase < 25) {
    task = 'triagem';
    support = 'intake-dock';
  } else if (phase >= 25 && phase < 28) {
    task = 'recolher';
    support = 'vehicle-and-intake';
  } else if (phase >= 28 && phase < 39) {
    task = phase >= 30 && phase < 38 ? 'retornar' : 'alinhar';
    support = 'vehicle';
  } else if (phase >= 39 && phase < 42) {
    task = 'descarregar';
    support = 'dock-and-vehicle';
  }

  const moving = task === 'transportar' || task === 'retornar';
  const distance = RIGHT_CART - LEFT_CART;
  const travelDistance = (Math.floor(elapsed / CYCLE) * 2 + driveRight + driveLeft) * distance;
  // The circular robot turns only after the carton has reached a stationary dock.
  const vehicleYaw = Math.PI * (ease(phase, 20.9, 23.5) - ease(phase, 43.6, 45.4));
  const casterSteer = ease(phase, 20.5, 20.85) * (1 - ease(phase, 23.55, 24.5))
    + ease(phase, 43, 43.5) * (1 - ease(phase, 45.5, 45.95));
  const travelEnvelope = Math.sin(Math.PI * driveRight) ** 2 + Math.sin(Math.PI * driveLeft) ** 2;
  const bodyLift = Math.sin(travelDistance * 36) * .0017 * travelEnvelope;
  return {
    phase,
    task,
    support,
    moving,
    vehicleX,
    cargoX,
    z: LANE_Z[laneIndex],
    cargoY: FLOOR + CARGO_Y + bodyLift,
    vehicleYaw,
    casterSteer,
    bodyLift,
    travelDistance,
    wheelAngle: -travelDistance / WHEEL_RADIUS,
    wheelAngles: WHEEL_POSITIONS.map(({ x, z, scale }) =>
      -(travelDistance + (x === 0 ? z : Math.abs(x)) * vehicleYaw) / (WHEEL_RADIUS * scale)),
    leftRollerAngle: -leftTransfer / ROLLER_RADIUS,
    rightRollerAngle: -rightTransfer / ROLLER_RADIUS,
    cartRollerAngle: -(
      Math.floor(elapsed / CYCLE) * 2 * ((LEFT_CART - LEFT_DOCK) + (RIGHT_DOCK - RIGHT_CART))
      + (LEFT_CART - LEFT_DOCK) * (loadLeft + unloadLeft)
      + (RIGHT_DOCK - RIGHT_CART) * (unloadRight + loadRight)
    ) / ROLLER_RADIUS,
  };
}

function seededRandom(seed) {
  return () => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function kraftMaps() {
  const size = 512;
  const random = seededRandom(1636);
  const heights = new Float32Array(size * size);
  const color = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(color.length);
  const roughness = new Uint8Array(color.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      const grain = random();
      const corrugation = Math.sin(x * Math.PI * 2 / 32);
      const fibre = Math.sin(x * 1.11 + y * .085) * Math.cos(y * .031);
      const tone = grain * 18 + corrugation * 1.5 + fibre * 2.1;
      heights[index] = grain * .18 + corrugation * .10 + fibre * .055;
      color.set([167 + tone, 125 + tone * .82, 82 + tone * .67, 255], index * 4);
      const rough = 215 + grain * 30;
      roughness.set([rough, rough, rough, 255], index * 4);
    }
  }
  const at = (x, y) => heights[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * .72;
      const dy = (at(x, y - 1) - at(x, y + 1)) * .72;
      const length = Math.hypot(dx, dy, 1);
      normal.set([
        128 + 127 * dx / length,
        128 + 127 * dy / length,
        128 + 127 / length,
        255,
      ], (y * size + x) * 4);
    }
  }
  return [color, normal, roughness].map((data, index) => {
    const texture = new THREE.DataTexture(data, size, size);
    texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  });
}

function labelMap(title, subtitle, background = '#263b34', foreground = '#f2e5cc') {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 768, 256);
  ctx.strokeStyle = '#b99761';
  ctx.lineWidth = 5;
  ctx.strokeRect(18, 18, 732, 220);
  ctx.fillStyle = foreground;
  ctx.textAlign = 'center';
  ctx.font = '700 59px Georgia, serif';
  ctx.fillText(title, 384, 115);
  ctx.font = '29px Arial, sans-serif';
  ctx.fillText(subtitle, 384, 179);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function finishMaps() {
  const size = 128, random = seededRandom(2147);
  const normal = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(normal.length);
  for (let i = 0; i < size * size; i++) {
    // Fine coat variation, with no large noise that would read as damaged plastic.
    const grain = random();
    normal.set([127 + random() * 2, 127 + random() * 2, 255, 255], i * 4);
    const rough = 221 + grain * 21;
    roughness.set([rough, rough, rough, 255], i * 4);
  }
  return [normal, roughness].map(data => {
    const map = new THREE.DataTexture(data, size, size);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(8, 3);
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.magFilter = THREE.LinearFilter;
    map.generateMipmaps = true;
    map.anisotropy = 8;
    map.needsUpdate = true;
    return map;
  });
}

function latheProfile(points, segments = 96) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

function part(mat, position, scale, shape = 'box', rotation = ZERO) {
  return { mat, position, scale, shape, rotation };
}

function makeBatches(parts, assets) {
  const bins = new Map();
  const pose = new THREE.Object3D();
  for (const { mat, position, scale, shape, rotation } of parts) {
    pose.position.set(...position);
    pose.scale.set(...scale);
    pose.rotation.set(...rotation);
    pose.updateMatrix();
    const source = assets[shape];
    const geometry = (source.index ? source.toNonIndexed() : source.clone()).applyMatrix4(pose.matrix);
    if (!bins.has(mat)) bins.set(mat, []);
    bins.get(mat).push(geometry);
  }
  return Array.from(bins, ([key, pieces]) => {
    const geometry = mergeGeometries(pieces);
    pieces.forEach(piece => piece.dispose());
    return { key, geometry, material: assets.materials[key] };
  });
}

function wheelGeometry(assets, hub) {
  const profile = hub
    ? [[0, -.025], [.029, -.025], [.038, -.022], [.041, -.015], [.041, .015], [.038, .022], [.029, .025], [0, .025]]
    : [[0, -.024], [.042, -.024], [.059, -.021], [.066, -.014], [WHEEL_RADIUS, 0], [.066, .014], [.059, .021], [.042, .024], [0, .024]];
  return latheProfile(profile, 48).rotateX(Math.PI / 2);
}

function createAssets(shared) {
  const materials = {};
  const ownedMaterials = [];
  const textures = [];
  function own(key, options) {
    const material = new THREE.MeshStandardMaterial(options);
    ownedMaterials.push(material);
    materials[key] = material;
  }
  function polished(key, options) {
    const material = new THREE.MeshPhysicalMaterial(options);
    ownedMaterials.push(material);
    materials[key] = material;
  }
  for (const [key, color] of Object.entries({
    ivory: '#e4dccc', ink: '#253a34', gold: '#b99555', wine: '#713b42',
    green: '#466652', stone: '#cbc1ae',
  })) {
    if (shared?.mats?.[key]) materials[key] = shared.mats[key];
    else own(key, { color, roughness: key === 'gold' ? .31 : .61, metalness: key === 'gold' ? .72 : 0 });
  }
  own('rubber', { color: '#242825', roughness: .93 });
  own('hub', { color: '#b7a27e', roughness: .31, metalness: .74 });
  own('steel', { color: '#b2b8ae', roughness: .38, metalness: .65 });
  own('guide', { color: '#67685e', roughness: .82, metalness: .15 });
  own('yellow', { color: '#cdaa60', roughness: .73 });
  own('tape', { color: '#b38756', roughness: .82 });
  own('corrugation', { color: '#765031', roughness: .96 });
  const maps = kraftMaps();
  textures.push(...maps);
  own('kraft', { map: maps[0], normalMap: maps[1], roughnessMap: maps[2], roughness: 1 });
  const finish = finishMaps();
  textures.push(...finish);
  const coating = { normalMap: finish[0], normalScale: new THREE.Vector2(.13, .13), roughnessMap: finish[1] };
  polished('robotCrimson', { ...coating, color: '#8c172a', roughness: .31, metalness: .28, clearcoat: .8, clearcoatRoughness: .19 });
  polished('robotEbony', { ...coating, color: '#20242a', roughness: .32, metalness: .4, clearcoat: .65, clearcoatRoughness: .2 });
  polished('robotMetal', { ...coating, color: '#b7b9ba', roughness: .27, metalness: .92, clearcoat: .3 });
  polished('robotLens', { color: '#090f18', roughness: .12, metalness: .22, clearcoat: 1, clearcoatRoughness: .09 });
  own('robotGasket', { ...coating, color: '#1b1d1e', roughness: .9 });
  own('bookCrimson', { ...coating, color: '#791c2a', roughness: .62 });
  own('bookNavy', { ...coating, color: '#202e3e', roughness: .67 });
  own('bookPaper', { color: '#e8e0ce', roughness: .91 });
  own('pageEdge', { color: '#b9ad96', roughness: .94 });

  for (const [key, title, subtitle, background, foreground] of [
    ['receiving', 'RECEPÇÃO', 'ENTRADA DO ACERVO'],
    ['intake', 'TRIAGEM', 'CONSERVAÇÃO'],
    ['case1', 'ACERVO 01', '↑↑  DOCUMENTOS', '#e4d1af', '#493723'],
    ['case2', 'ACERVO 02', '↑↑  DOCUMENTOS', '#e4d1af', '#493723'],
    ['cart1', 'V·01', 'VERITAS', '#171c23', '#d5d5cf'],
    ['cart2', 'V·02', 'VERITAS', '#171c23', '#d5d5cf'],
    ['bookLabel', 'VERITAS', 'HARVARD · 1636', '#791c2a', '#c7ad73'],
  ]) {
    const map = labelMap(title, subtitle, background, foreground);
    textures.push(map);
    own(key, { map, roughness: .83 });
  }
  own('ready', { color: '#bcd5da', emissive: '#8baab2', emissiveIntensity: .6, roughness: .36 });
  own('docking', { color: '#ce9657', emissive: '#b37c42', emissiveIntensity: .53, roughness: .36 });
  own('standby', { color: '#b7a081', emissive: '#b7a081', emissiveIntensity: .14, roughness: .44 });
  const assets = {
    materials, textures, ownedMaterials,
    box: new THREE.BoxGeometry(1, 1, 1),
    rounded: new RoundedBoxGeometry(1, 1, 1, 3, .075),
    plane: new THREE.PlaneGeometry(1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 40),
    shell: latheProfile([[0, .053], [.244, .053], [.276, .058], [.292, .071], [.299, .094], [.299, .124], [.291, .148], [.275, .166], [.249, .177], [.21, .18], [0, .18]]),
    belly: latheProfile([[0, .041], [.223, .041], [.259, .047], [.278, .059], [.285, .079], [.28, .096], [0, .096]]),
    bumper: latheProfile([[.296, .073], [.306, .075], [.314, .083], [.316, .097], [.313, .11], [.304, .116], [.296, .113], [.296, .073]]),
    rim: new THREE.TorusGeometry(1, .012, 10, 96),
    lidSeam: new THREE.TorusGeometry(1, .005, 8, 96),
    lidar: latheProfile([[0, 0], [.032, 0], [.037, .004], [.039, .011], [.039, .025], [.035, .033], [0, .033]], 48),
  };
  assets.tyre = wheelGeometry(assets, false);
  assets.wheelHub = wheelGeometry(assets, true);
  assets.roller = makeBatches([
    part('steel', ZERO, [ROLLER_RADIUS, .397, ROLLER_RADIUS], 'cylinder', [Math.PI / 2, 0, 0]),
    part('steel', [0, .031, 0], [.022, .004, .379]),
  ], assets)[0].geometry;
  return assets;
}

function forecourt() {
  const x = (ARCHIVE_GROUND_BOUNDS.x[0] + ARCHIVE_GROUND_BOUNDS.x[1]) / 2;
  const z = (ARCHIVE_GROUND_BOUNDS.z[0] + ARCHIVE_GROUND_BOUNDS.z[1]) / 2;
  const width = ARCHIVE_GROUND_BOUNDS.x[1] - ARCHIVE_GROUND_BOUNDS.x[0];
  const depth = ARCHIVE_GROUND_BOUNDS.z[1] - ARCHIVE_GROUND_BOUNDS.z[0];
  const parts = [
    part('ivory', [x, -.43, z], [width, .62, depth], 'rounded'),
    part('ink', [x, -.117, z], [width - .012, .115, depth - .012], 'rounded'),
    part('gold', [x, -.179, z], [width - .006, .022, depth - .005], 'rounded'),
    part('stone', [x, .015, z], [width - .018, .155, depth - .018]),
  ];
  for (const laneZ of LANE_Z) {
    for (const side of [-1, 1]) {
      parts.push(part('yellow', [x, FLOOR + .002, laneZ + side * .322], [width - .28, .003, .012]));
    }
    for (let i = 0; i < 7; i++) {
      parts.push(part('guide', [7.45 + i * .40, FLOOR + .002, laneZ], [.15, .003, .017]));
    }
  }
  return parts;
}

function dockParts(center, laneZ, role) {
  const parts = [
    part('ink', [center, .053, laneZ], [.637, .106, .49], 'rounded'),
    part('ink', [center, .169, laneZ], [.609, .14, .38], 'rounded'),
    part('ivory', [center, .197, laneZ], [.607, .043, .42], 'rounded'),
    part(role, [center, .104, laneZ + .247], [.47, .138, 1], 'plane'),
  ];
  for (const side of [-1, 1]) {
    parts.push(
      part('ink', [center, .231, laneZ + side * .22], [.635, .053, .036], 'rounded'),
      part('gold', [center, .263, laneZ + side * .224], [.625, .012, .020]),
      part('rubber', [center, .128, laneZ + side * .199], [.61, .062, .029], 'rounded'),
    );
  }
  for (const side of [-1, 1]) {
    const edge = center + side * .326;
    parts.push(part('yellow', [edge, .194, laneZ], [.014, .056, .436]));
    for (let i = 0; i < 5; i++) {
      parts.push(part('ink', [edge + side * .008, .194, laneZ - .161 + i * .080], [.003, .056, .027], 'box', [side * -.50, 0, 0]));
    }
  }
  return parts;
}

function cartParts(index) {
  const parts = [
    part('robotEbony', ZERO, [1, 1, 1], 'belly'),
    part(index === 0 ? 'robotCrimson' : 'robotEbony', ZERO, [1, 1, 1], 'shell'),
    part('robotGasket', ZERO, [1, 1, 1], 'bumper'),
    part('robotMetal', [0, .128, 0], [.295, .295, .295], 'rim', [Math.PI / 2, 0, 0]),
    part('robotGasket', [0, .176, 0], [.248, .248, .248], 'lidSeam', [Math.PI / 2, 0, 0]),
    part('robotMetal', [0, .199, 0], [.175, .042, .175], 'cylinder'),
    part('robotEbony', [0, .224, 0], [.224, .028, .224], 'cylinder'),
    part('robotGasket', [0, .244, 0], [.218, .012, .218], 'cylinder'),
    part('robotEbony', [0, .138, .289], [.144, .041, .014], 'rounded'),
    part(index === 0 ? 'cart1' : 'cart2', [0, .138, .298], [.129, .033, 1], 'plane'),
    // The lidar sits outside the load footprint; its scan band remains clear.
    part('robotMetal', [0, .188, -.265], [.044, .014, .044], 'cylinder'),
    part('robotLens', [0, .195, -.265], [1, 1, 1], 'lidar'),
    part(index === 0 ? 'robotCrimson' : 'robotEbony', [0, .229, -.265], [.034, .004, .034], 'cylinder'),
  ];
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const x = Math.cos(angle), z = Math.sin(angle);
    parts.push(
      part('robotEbony', [x * .298, .107, z * .298], [.018, .037, .058], 'rounded', [0, -angle, 0]),
      part('robotLens', [x * .310, .107, z * .310], [.012, .005, .012], 'cylinder', [0, -angle, Math.PI / 2]),
      part('robotMetal', [x * .267, .171, z * .267], [.005, .003, .005], 'cylinder'),
    );
    for (let j = 0; j < 3; j++) {
      const a = angle + .09 + j * .045;
      parts.push(part('robotGasket', [Math.cos(a) * .233, .1805, Math.sin(a) * .233], [.019, .002, .004], 'rounded', [0, -a, 0]));
    }
  }
  return parts;
}

function cartonParts(index) {
  if (index === 1) {
    const parts = [];
    const books = [
      { x: 0, z: 0, base: 0, height: .088, width: .452, depth: .326, yaw: 0, mat: 'bookNavy' },
      { x: .012, z: -.006, base: .104, height: .062, width: .412, depth: .302, yaw: .055, mat: 'bookCrimson' },
      { x: -.006, z: .004, base: .182, height: .072, width: .428, depth: .310, yaw: -.035, mat: 'bookCrimson' },
    ];
    for (const book of books) {
      const { x, z, base, height, width, depth, yaw, mat } = book;
      parts.push(
        part(mat, [x, base + .004, z], [width, .008, depth], 'rounded', [0, yaw, 0]),
        part('bookPaper', [x, base + .008 + height / 2, z], [width - .016, height, depth - .016], 'rounded', [0, yaw, 0]),
        part(mat, [x, base + .012 + height, z], [width, .008, depth], 'rounded', [0, yaw, 0]),
        part(mat, [x - Math.sin(yaw) * depth / 2, base + .008 + height / 2, z - Math.cos(yaw) * depth / 2], [width, height + .016, .016], 'rounded', [0, yaw, 0]),
      );
      for (let i = 0; i < 8; i++) {
        parts.push(part('pageEdge', [x + Math.sin(yaw) * (depth / 2 - .008), base + .013 + i * (height - .012) / 8, z + Math.cos(yaw) * (depth / 2 - .008)], [width - .027, .0008, .001], 'box', [0, yaw, 0]));
      }
      for (const side of [-1, 1]) {
        const localX = side * width * .34, localZ = -depth / 2 - .009;
        parts.push(part('gold', [x + Math.cos(yaw) * localX + Math.sin(yaw) * localZ, base + .008 + height / 2, z - Math.sin(yaw) * localX + Math.cos(yaw) * localZ], [.009, height * .7, .0015], 'rounded', [0, yaw, 0]));
      }
    }
    parts.push(part('bookLabel', [-.006, .2708, .004], [.238, .14, 1], 'plane', [-Math.PI / 2, 0, -.035]));
    return parts;
  }
  const parts = [
    part('kraft', [0, .159, 0], [.462, .317, .344], 'rounded'),
    part('corrugation', [0, .316, 0], [.013, .003, .326]),
    part('tape', [0, .319, 0], [.057, .004, .347], 'rounded'),
    part('tape', [0, .278, .174], [.057, .08, .004], 'rounded'),
    part('tape', [0, .278, -.174], [.057, .08, .004], 'rounded'),
    part(index === 0 ? 'case1' : 'case2', [.065, .188, .174], [.263, .088, 1], 'plane'),
  ];
  for (const side of [-1, 1]) {
    parts.push(part('corrugation', [0, .093, side * .173], [.097, .009, .003]));
    for (let i = 0; i < 14; i++) {
      parts.push(part('corrugation', [-.181 + i * .028, .310, side * .173], [.008, .009, .003]));
    }
  }
  return parts;
}

function useBatches(parts, assets) {
  const batches = useMemo(() => makeBatches(parts, assets), [parts, assets]);
  useEffect(() => () => batches.forEach(batch => batch.geometry.dispose()), [batches]);
  return batches;
}

function BatchMeshes({ batches }) {
  return batches.map(({ key, geometry, material }) =>
    <mesh key={key} geometry={geometry} material={material} castShadow receiveShadow />);
}

function setRollers(mesh, xPositions, angle, pose) {
  if (!mesh) return;
  pose.rotation.set(0, 0, angle);
  for (let i = 0; i < xPositions.length; i++) {
    pose.position.set(xPositions[i], ROLLER_Y, 0);
    pose.updateMatrix();
    mesh.setMatrixAt(i, pose.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

function Lane({ index, assets, time }) {
  const { gl } = useThree();
  const cart = useRef();
  const suspension = useRef();
  const scanner = useRef();
  const cargo = useRef();
  const wheels = useRef();
  const hubs = useRef();
  const leftRollers = useRef();
  const rightRollers = useRef();
  const cartRollers = useRef();
  const indicator = useRef();
  const pose = useMemo(() => new THREE.Object3D(), []);
  const lastSample = useRef(null);
  const docks = useMemo(() => [
    ...dockParts(LEFT_DOCK, 0, 'receiving'),
    ...dockParts(RIGHT_DOCK, 0, 'intake'),
  ], []);
  const stationary = useBatches(docks, assets);
  const body = useBatches(useMemo(() => cartParts(index), [index]), assets);
  const carton = useBatches(useMemo(() => cartonParts(index), [index]), assets);
  const lastTelemetry = useRef('');
  const m = assets.materials;

  useFrame(() => {
    if (!cart.current || !cargo.current || !wheels.current || !hubs.current) return;
    const seconds = timeValue(time);
    if (lastSample.current === seconds) return;
    lastSample.current = seconds;
    const state = archiveGroundState(seconds, index);
    cart.current.position.x = state.vehicleX;
    cart.current.rotation.y = state.vehicleYaw;
    suspension.current.position.y = state.bodyLift;
    cargo.current.position.set(state.cargoX, state.cargoY - FLOOR, 0);
    scanner.current.rotation.y = seconds * 2.2;
    const currentIndicator = state.moving ? m.ready : state.support.includes('-and-') ? m.docking : m.standby;
    indicator.current.material = currentIndicator;

    WHEEL_POSITIONS.forEach(({ x, z, scale }, i) => {
      const steering = x === 0 ? 0 : Math.sign(x) * state.casterSteer * Math.PI / 2;
      pose.rotation.set(0, steering, state.wheelAngles[i]);
      pose.scale.setScalar(scale);
      pose.position.set(x, WHEEL_RADIUS * scale, z);
      pose.updateMatrix();
      wheels.current.setMatrixAt(i, pose.matrix);
      hubs.current.setMatrixAt(i, pose.matrix);
    });
    wheels.current.instanceMatrix.needsUpdate = true;
    hubs.current.instanceMatrix.needsUpdate = true;
    pose.scale.setScalar(1);
    setRollers(leftRollers.current, LEFT_ROLLERS, state.leftRollerAngle, pose);
    setRollers(rightRollers.current, RIGHT_ROLLERS, state.rightRollerAngle, pose);
    setRollers(cartRollers.current, CART_ROLLERS, state.cartRollerAngle, pose);

    const stamp = state.phase.toFixed(3);
    if (lastTelemetry.current === stamp) return;
    lastTelemetry.current = stamp;
    const key = 'worldAgv' + (index + 1);
    gl.domElement.dataset[key + 'Phase'] = stamp;
    gl.domElement.dataset[key + 'Task'] = state.task;
    gl.domElement.dataset[key + 'Support'] = state.support;
    gl.domElement.dataset[key + 'X'] = state.vehicleX.toFixed(4);
    gl.domElement.dataset[key + 'Z'] = state.z.toFixed(4);
    gl.domElement.dataset[key + 'CargoX'] = state.cargoX.toFixed(4);
    gl.domElement.dataset[key + 'CargoY'] = state.cargoY.toFixed(4);
    gl.domElement.dataset[key + 'Yaw'] = state.vehicleYaw.toFixed(4);
    gl.domElement.dataset[key + 'BodyLift'] = state.bodyLift.toFixed(5);
  });

  return <group position={[0, FLOOR, LANE_Z[index]]}>
    <BatchMeshes batches={stationary}/>
    <instancedMesh ref={leftRollers} args={[assets.roller, m.steel, LEFT_ROLLERS.length]} castShadow receiveShadow frustumCulled={false}/>
    <instancedMesh ref={rightRollers} args={[assets.roller, m.steel, RIGHT_ROLLERS.length]} castShadow receiveShadow frustumCulled={false}/>
    <group ref={cart} position={[LEFT_CART, 0, 0]}>
      <instancedMesh ref={wheels} args={[assets.tyre, m.rubber, WHEEL_POSITIONS.length]} castShadow receiveShadow frustumCulled={false}/>
      <instancedMesh ref={hubs} args={[assets.wheelHub, m.hub, WHEEL_POSITIONS.length]} castShadow receiveShadow frustumCulled={false}/>
      <group ref={suspension}>
        <BatchMeshes batches={body}/>
        <instancedMesh ref={cartRollers} args={[assets.roller, m.steel, CART_ROLLERS.length]} castShadow receiveShadow frustumCulled={false}/>
        <mesh ref={indicator} geometry={assets.rim} material={m.standby} position={[0, .212, -.265]} rotation={[Math.PI / 2, 0, 0]} scale={.0395}/>
        <group ref={scanner} position={[0, .213, -.265]}>
          <mesh geometry={assets.cylinder} material={m.robotMetal} position={[.037, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[.006, .004, .006]}/>
          <mesh geometry={assets.cylinder} material={m.robotLens} position={[.0395, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[.004, .001, .004]}/>
        </group>
      </group>
    </group>
    <group ref={cargo} position={[LEFT_DOCK, CARGO_Y, 0]}>
      <BatchMeshes batches={carton}/>
    </group>
  </group>;
}

function deliveryBookParts(index) {
  const cover=index?'bookNavy':'bookCrimson';
  const parts=[
    part(cover,[0,-.022,0],[.34,.006,.25],'rounded'),
    part('bookPaper',[0,0,0],[.324,.038,.234],'rounded'),
    part(cover,[-.167,0,0],[.006,.05,.25],'rounded'),
  ];
  for(let i=0;i<9;i++)parts.push(part('pageEdge',[.162,-.015+i*.0037,0],[.0009,.0006,.227]));
  return parts;
}

function deliveryPose() {
  return {pelvisAbsolute:.83,pelvis:.83,lean:0,headPitch:0,headYaw:0,
    leftHand:new THREE.Vector3(),rightHand:new THREE.Vector3(),leftFoot:new THREE.Vector3(),rightFoot:new THREE.Vector3()};
}

function localTarget(world,actor,out) {
  const x=world.x-actor.position.x,z=world.z-actor.position.z,c=Math.cos(actor.yaw),s=Math.sin(actor.yaw);
  return out.set(c*x-s*z,world.y-actor.position.y,s*x+c*z);
}

function updateDeliveryPose(p,actor,book,seconds,student,index,tablet,scratch) {
  const walking=actor.walkWeight,step=actor.walkDistance/.40;
  p.walkDistance=actor.walkDistance;p.walkWeight=walking;p.walkStride=.40;p.motionTime=seconds;
  p.handTaskWeight=Math.max(actor.grip,actor.seated,actor.crouch);
  p.pelvisAbsolute=actor.pelvisAbsolute+Math.abs(Math.sin(step*Math.PI*2))*.008*walking;
  p.pelvis=p.pelvisAbsolute;
  p.lean=.035+walking*.035+actor.crouch*.52+actor.seated*.075+(student?0:.10*actor.grip*(1-actor.crouch));
  // Library errands start with the student's own bag already beside the chair.
  p.backpackWorn=false;
  p.headPitch=.11+actor.crouch*.15+actor.seated*.12+actor.activity*.11;
  p.headYaw=student?Math.sin(seconds*.32+index)*.035*actor.seated:0;
  for(const [side,foot]of[[-1,p.leftFoot],[1,p.rightFoot]]){
    const f=((step+(side>0?.5:0))%1+1)%1;
    let z=.16-f*.40,y=.055;
    if(f>=.62){const u=(f-.62)/.38;z=-.088+.248*(u*u*(3-2*u));y+=Math.sin(Math.PI*u)*.065;}
    foot.set(side*.10,THREE.MathUtils.lerp(.055,y,walking),THREE.MathUtils.lerp(.15+.09*actor.seated,z,walking));
  }
  const swing=Math.sin(step*Math.PI*2)*.10*walking;
  p.leftHand.set(-.22,.94,.12+swing);p.rightHand.set(.22,.94,.12-swing);
  if(student&&actor.seated>0){
    p.leftHand.lerp(scratch.set(-.14,1.075,.40),actor.seated);
    p.rightHand.lerp(scratch.set(.14,1.075,.40),actor.seated);
    scratch.copy(tablet);scratch.x+=.12;scratch.y+=.014+Math.sin(seconds*9)*.0025;
    scratch.z+=index?-.035:.035;
    localTarget(scratch,actor,scratch);
    (index?p.leftHand:p.rightHand).lerp(scratch,actor.seated*(1-actor.activity)*.9);
  }
  const grip=Math.max(actor.grip,actor.activity*.86);
  if(grip>0){
    const delta=actor.yaw-book.yaw;
    const r=1/Math.sqrt((Math.cos(delta)/.155)**2+(Math.sin(delta)/.109)**2);
    for(const [side,hand]of[[-1,p.leftHand],[1,p.rightHand]]){
      // The wrists meet the two near corners of the cover. Reaching across
      // the centre of a low payload stretched Harper's shorter forearms.
      scratch.set(book.position.x+Math.cos(actor.yaw)*side*r*.75-Math.sin(actor.yaw)*.07,book.position.y+.020,book.position.z-Math.sin(actor.yaw)*side*r*.75-Math.cos(actor.yaw)*.07);
      localTarget(scratch,actor,scratch);hand.lerp(scratch,Math.min(1,grip));
    }
  }
}

function CampusJourney({index,assets,time}) {
  const {gl}=useThree(),m=assets.materials;
  const robot=useRef(),suspension=useRef(),wheels=useRef(),hubs=useRef(),indicator=useRef(),scanner=useRef(),loadPad=useRef(),loadColumn=useRef();
  const worker=useRef(),student=useRef(),chair=useRef(),book=useRef(),cover=useRef();
  const state=useMemo(campusDeliveryState,[]),workerPose=useMemo(deliveryPose,[]),studentPose=useMemo(deliveryPose,[]);
  const pose=useMemo(()=>new THREE.Object3D(),[]),scratch=useMemo(()=>new THREE.Vector3(),[]),last=useRef(-1);
  const body=useBatches(useMemo(()=>cartParts(index),[index]),assets);
  const volume=useBatches(useMemo(()=>deliveryBookParts(index),[index]),assets);
  const seat=CAMPUS_DELIVERY_SEATS[index],tablet=CAMPUS_DELIVERY_TABLETS[index];
  const backpackHome=useMemo(()=>backpackHomeAt(seat.position,seat.rotation),[seat]);
  const tabletPoint=useMemo(()=>new THREE.Vector3(...tablet.position),[tablet]);
  const initialYaw=useMemo(()=>campusDeliveryAt(0,index).robot.yaw,[index]);
  useFrame(()=>{
    const seconds=timeValue(time);if(seconds===last.current||!robot.current||!worker.current||!student.current)return;last.current=seconds;
    campusDeliveryAt(seconds,index,state);
    robot.current.position.copy(state.robot.position);robot.current.rotation.y=state.robot.yaw;
    suspension.current.position.y=state.robot.bodyLift;scanner.current.rotation.y=seconds*2.2;
    loadPad.current.position.y=.253+state.robot.platformLift;loadColumn.current.position.y=.25+state.robot.platformLift/2;loadColumn.current.scale.y=Math.max(.002,state.robot.platformLift);
    indicator.current.material=Math.abs(state.robot.speed)>.005?m.ready:state.host==='robot'?m.docking:m.standby;
    WHEEL_POSITIONS.forEach(({x,z,scale},i)=>{
      const steer=x===0?0:Math.atan2(x*state.robot.curvature,1+z*state.robot.curvature);
      const spin=-(state.robot.distance+z*(state.robot.yaw-initialYaw))/(WHEEL_RADIUS*scale);
      pose.position.set(x,WHEEL_RADIUS*scale,z);pose.rotation.set(0,steer,spin);pose.scale.setScalar(scale);pose.updateMatrix();
      wheels.current.setMatrixAt(i,pose.matrix);hubs.current.setMatrixAt(i,pose.matrix);
    });
    wheels.current.instanceMatrix.needsUpdate=true;hubs.current.instanceMatrix.needsUpdate=true;
    worker.current.position.copy(state.worker.position);worker.current.rotation.y=state.worker.yaw;
    student.current.position.copy(state.student.position);student.current.rotation.y=state.student.yaw;
    chair.current.position.copy(state.chair);
    book.current.position.copy(state.book.position);book.current.rotation.y=state.book.yaw;cover.current.rotation.z=state.book.open;
    updateDeliveryPose(workerPose,state.worker,state.book,seconds,false,index,tabletPoint,scratch);
    updateDeliveryPose(studentPose,state.student,state.book,seconds,true,index,tabletPoint,scratch);
    const key='worldDelivery'+(index+1),agv='worldAgv'+(index+1);
    const telemetry={Phase:state.phase.toFixed(2),Task:state.task,BookHost:state.host,BookX:state.book.position.x.toFixed(3),BookY:state.book.position.y.toFixed(3),BookZ:state.book.position.z.toFixed(3),StudentX:state.student.position.x.toFixed(3),StudentZ:state.student.position.z.toFixed(3)};
    for(const [name,value]of Object.entries(telemetry))gl.domElement.dataset[key+name]=value;
    gl.domElement.dataset[agv+'X']=state.robot.position.x.toFixed(3);gl.domElement.dataset[agv+'Z']=state.robot.position.z.toFixed(3);
    gl.domElement.dataset[agv+'Task']=state.task;gl.domElement.dataset[agv+'CargoX']=state.book.position.x.toFixed(3);
  },-3);
  return <group name={'campus-delivery-journey-'+(index+1)}>
    <group ref={robot}>
      <instancedMesh ref={wheels} args={[assets.tyre,m.rubber,WHEEL_POSITIONS.length]} castShadow receiveShadow frustumCulled={false}/>
      <instancedMesh ref={hubs} args={[assets.wheelHub,m.hub,WHEEL_POSITIONS.length]} castShadow receiveShadow frustumCulled={false}/>
      <group ref={suspension}>
        <BatchMeshes batches={body}/>
        <mesh ref={loadColumn} geometry={assets.cylinder} material={m.robotMetal} position={[0,.251,0]} scale={[.055,.002,.055]} castShadow receiveShadow/>
        <mesh ref={loadPad} geometry={assets.rounded} material={m.robotGasket} position={[0,.253,0]} scale={[.35,.006,.26]} castShadow receiveShadow/>
        <mesh ref={indicator} geometry={assets.rim} material={m.standby} position={[0,.212,-.265]} rotation={[Math.PI/2,0,0]} scale={.0395}/>
        <group ref={scanner} position={[0,.213,-.265]}>
          <mesh geometry={assets.cylinder} material={m.robotMetal} position={[.037,0,0]} rotation={[0,0,Math.PI/2]} scale={[.006,.004,.006]}/>
          <mesh geometry={assets.cylinder} material={m.robotLens} position={[.0395,0,0]} rotation={[0,0,Math.PI/2]} scale={[.004,.001,.004]}/>
        </group>
      </group>
    </group>
    <group ref={worker} name={'delivery-staff-'+index}><Suspense fallback={null}><ImportedScholar actorRef={worker} pose={workerPose} variant={index+2}/></Suspense></group>
    <group ref={student} name={'delivery-student-'+index}><Suspense fallback={null}><ImportedScholar actorRef={student} pose={studentPose} variant={index} backpack={index===0} backpackHome={backpackHome}/></Suspense></group>
    <group ref={chair} position={seat.position}><Suspense fallback={null}><ReadyReadingChair rotation={[0,seat.rotation,0]} height={1} seatHeight={.64}/></Suspense></group>
    <StudyDevice type="tablet" position={tablet.position} rotation={[0,tablet.rotation,0]} scale={.8}/>
    <group ref={book} name={'persistent-delivery-book-'+index}>
      <BatchMeshes batches={volume}/>
      <group ref={cover} position={[-.17,.022,0]}>
        <mesh geometry={assets.rounded} material={index?m.bookNavy:m.bookCrimson} position={[.17,0,0]} scale={[.34,.006,.25]} castShadow receiveShadow/>
        <mesh geometry={assets.plane} material={m.bookLabel} position={[.17,.0032,0]} rotation={[-Math.PI/2,0,0]} scale={[.185,.12,1]}/>
      </group>
    </group>
  </group>;
}

/** Free floor delivery, without islands, tracks, roller docks or hidden loads. */
function ServiceRobotBase({assets,state,time}){
 const body=useBatches(useMemo(()=>cartParts(0),[]),assets),wheels=useRef(),hubs=useRef(),scanner=useRef(),object=useMemo(()=>new THREE.Object3D(),[]),m=assets.materials;
 useFrame(()=>{const s=state.current;WHEEL_POSITIONS.forEach(({x,z,scale},i)=>{object.position.set(x,WHEEL_RADIUS*scale,z);object.rotation.set(0,0,-s.distance/(WHEEL_RADIUS*scale));object.scale.setScalar(scale);object.updateMatrix();wheels.current.setMatrixAt(i,object.matrix);hubs.current.setMatrixAt(i,object.matrix);});wheels.current.instanceMatrix.needsUpdate=true;hubs.current.instanceMatrix.needsUpdate=true;scanner.current.rotation.y=time.current*2.2;});
 return <group name="circular street-service mobile robot"><instancedMesh ref={wheels} args={[assets.tyre,m.rubber,WHEEL_POSITIONS.length]} castShadow receiveShadow/><instancedMesh ref={hubs} args={[assets.wheelHub,m.hub,WHEEL_POSITIONS.length]} castShadow receiveShadow/><BatchMeshes batches={body}/><group ref={scanner} position={[0,.213,-.265]}><mesh geometry={assets.cylinder} material={m.robotMetal} rotation={[0,0,Math.PI/2]} scale={[.006,.004,.006]}/><mesh geometry={assets.cylinder} material={m.robotLens} position={[.0395,0,0]} rotation={[0,0,Math.PI/2]} scale={[.004,.001,.004]}/></group></group>;
}
export function ArchiveRobotJourneys({assets,time}) {
  const owned=useMemo(()=>createAssets(assets),[assets]),{gl}=useThree();
  useEffect(()=>{
    const data=gl.domElement.dataset;
    Object.assign(data,{worldAgvCount:'3',worldAgvStyle:'free-floor-circular-crimson-ebony-lidar',worldDeliveryWorkerCount:'4',worldDeliveryStudentCount:'2',worldDeliveryBookCount:'2',worldDeliveryCycle:'96'});
    return()=>{
      for(const key of Object.keys(data).filter(k=>k.startsWith('worldDelivery')||k.startsWith('worldAgv')))delete data[key];
      owned.ownedMaterials.forEach(material=>material.dispose());owned.textures.forEach(texture=>texture.dispose());
      Object.values(owned).filter(value=>value?.isBufferGeometry).forEach(geometry=>geometry.dispose());
    };
  },[gl,owned]);
  return <group dispose={null} name="archive-free-floor-robot-journeys"><CampusJourney index={0} assets={owned} time={time}/><CampusJourney index={1} assets={owned} time={time}/><ArchiveStreetRobot assets={owned} time={time} Robot={ServiceRobotBase}/></group>;
}

export default ArchiveRobotJourneys;
