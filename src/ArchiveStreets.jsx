import React, {useEffect, useMemo, useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeShuttleRoute, ROAD_BOUNDS, shuttleServiceAt, shuttleTravelAt, serviceState, travelState} from './ArchiveRoadMotion';

/**
 * An authored miniature service street, not geographic Harvard road data.
 * Add as a Scene sibling of PlacedObjects to keep asphalt on the ground:
 * <ArchiveStreets assets={assets} time={time}/>
 * Parent time.current controls every movement, including pause/reduced motion.
 * Road dimensions and vehicle paths share ArchiveRoadMotion's bounds.
 * Sidewalks/fixtures reach x10.73, z9.13. Ground surface y=-.88.
 * The electric library shuttle remains on the front street; its60s schedule
 * clears the approved courier's arrival and right-hand return sweep.
 */
const GROUND = -.88;
const PI = Math.PI;
const ZERO = [0, 0, 0];
const readTime = time => {const n = typeof time === 'number' ? time : time?.current; return Number.isFinite(n) ? Math.max(0, n) : 0;};
const seeded = (seed = 1636) => () => {seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646;};

function asphaltMaps() {
  const size = 256, random = seeded(1836), heights = new Float32Array(size * size);
  const color = new Uint8Array(size * size * 4), normal = new Uint8Array(size * size * 4), rough = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const k = y * size + x, grain = random(), low = Math.sin(x * .067) * Math.cos(y * .053) * .14;
    heights[k] = grain * .06 + low * .08;
    const v = Math.round(64 + grain * 4 + low * 3), i = k * 4;
    color[i] = v; color[i + 1] = v + 3; color[i + 2] = v + 6; color[i + 3] = 255;
    rough[i] = rough[i + 1] = rough[i + 2] = Math.round(215 + grain * 8); rough[i + 3] = 255;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const dx = heights[y * size + (x + 1) % size] - heights[y * size + (x + size - 1) % size];
    const dy = heights[((y + 1) % size) * size + x] - heights[((y + size - 1) % size) * size + x];
    const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
    normal[i] = Math.round(128 - dx * inv * 92); normal[i + 1] = Math.round(128 - dy * inv * 92); normal[i + 2] = Math.round(128 + inv * 127); normal[i + 3] = 255;
  }
  return [color, normal, rough].map((data, index) => {
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(1.7, 1.7);
    texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true; texture.anisotropy = 4;
    if (index === 0) texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true; return texture;
  });
}
function makeKit(assets) {
  const materials = [], geometries = [], textures = [];
  const own = geometry => {geometries.push(geometry); return geometry;};
  const material = (color, extra = {}) => {const m = new THREE.MeshStandardMaterial({color, roughness: .68, ...extra}); materials.push(m); return m;};
  const physical = (color, extra = {}) => {const m = new THREE.MeshPhysicalMaterial({color, roughness: .31, metalness: .09, clearcoat: .72, clearcoatRoughness: .18, ...extra}); materials.push(m); return m;};
  const maps = asphaltMaps(); textures.push(...maps);
  const shared = assets?.mats || {};
  const m = {
    asphalt: material('#ffffff', {map: maps[0], normalMap: maps[1], normalScale: new THREE.Vector2(.04, .04), roughnessMap: maps[2], roughness: .74}),
    concrete: physical('#bfc4c3', {roughness: .49, metalness: .015, clearcoat: .20, clearcoatRoughness: .34}),
    gutter: material('#646e73', {roughness: .55, metalness: .12}), paint: material('#e5e6df', {roughness: .65}),
    ink: shared.ink || material('#223632'), gold: shared.gold || material('#b99555', {metalness: .76, roughness: .28}),
    ivory: physical('#e8e3d4'), wine: physical('#713b42'), dark: material('#202722', {roughness: .94}),
    metal: material('#a8aba0', {roughness: .28, metalness: .77}), wood: shared.wood || material('#b49167'),
    paper: shared.paper || material('#f8ecd2'), skin: material('#bb8866'),
    glass: physical('#f1efe4', {transmission: .68, thickness: .028, ior: 1.43, roughness: .10, metalness: 0, clearcoat: .9, attenuationColor: '#bcbbae', attenuationDistance: 1.8}),
    lit: material('#f4e9cd', {emissive: '#eac78a', emissiveIntensity: .4, roughness: .24}),
    rear: material('#934b44', {emissive: '#682a25', emissiveIntensity: .18, roughness: .25}),
  };
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 320;
  const c = canvas.getContext('2d'); c.fillStyle = '#e8e0cc'; c.fillRect(0, 0, 1024, 320);
  c.strokeStyle = '#b99555'; c.lineWidth = 5; c.strokeRect(18, 18, 988, 284);
  c.fillStyle = '#223632'; c.textAlign = 'center'; c.font = '74px Georgia, serif'; c.fillText('HARVARD LIBRARY', 512, 143);
  c.fillStyle = '#713b42'; c.font = '31px Georgia, serif'; c.fillText('LIVROS EM MOVIMENTO', 512, 231);
  const labelTexture = new THREE.CanvasTexture(canvas); labelTexture.colorSpace = THREE.SRGBColorSpace; labelTexture.anisotropy = 4; textures.push(labelTexture);
  m.label = material('#ffffff', {map: labelTexture, roughness: .75});
  const box = own(new RoundedBoxGeometry(1, 1, 1, 2, .035));
  const cylinder = own(new THREE.CylinderGeometry(1, 1, 1, 24));
  const plane = own(new THREE.PlaneGeometry(1, 1));
  const sphere = own(new THREE.SphereGeometry(1, 12, 8));
  const ring = own(new THREE.TorusGeometry(1, .10, 8, 24));
  const tyre = own(new THREE.TorusGeometry(.125, .045, 8, 24).rotateY(PI / 2));
  return {m, box, cylinder, plane, sphere, ring, tyre, own, textures, dispose() {geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());}};
}
function batches(a, draw) {
  const pieces = {}, cache = {matrix: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3()};
  const add = (key, geometry, p = ZERO, s = [1, 1, 1], r = ZERO) => {
    cache.p.set(...p); cache.s.set(...s); cache.e.set(...r); cache.q.setFromEuler(cache.e); cache.matrix.compose(cache.p, cache.q, cache.s);
    let g = geometry.clone(); if (g.index) {const non = g.toNonIndexed(); g.dispose(); g = non;}
    g.applyMatrix4(cache.matrix); (pieces[key] ||= []).push(g);
  };
  const box = (key, p, s, r) => add(key, a.box, p, s, r);
  const cylinder = (key, p, radius, height, r) => add(key, a.cylinder, p, [radius, height, radius], r);
  draw({add, box, cylinder});
  return Object.entries(pieces).map(([key, all]) => {
    const geometry = a.own(mergeGeometries(all, false)); all.forEach(g => g.dispose());
    geometry.computeBoundingSphere(); return {key, geometry, material: a.m[key]};
  });
}
function BatchMeshes({items, shadow = true}) {
  return items.map(item => <mesh key={item.key} geometry={item.geometry} material={item.material} castShadow={shadow} receiveShadow/>);
}
function streetGeometry(a) {
  return batches(a, ({add, box, cylinder}) => {
    const rightCurb = ROAD_BOUNDS.spurRight + .05, rightWalk = ROAD_BOUNDS.spurRight + .39;
    // Low curbs remain outside the approved base and the courier's wheel tracks.
    for (let x = -6.10; x < 6.55; x += .65) {
      const width = Math.min(.618, 6.55 - x), cx = x + width / 2;
      box('concrete', [cx, .062, 5.47], [width, .12, .58]);
      box('concrete', [cx, .046, 5.79], [width, .088, .10]);
      box('gutter', [cx, .009, 5.86], [width, .015, .052]);
    }
    for (let x = -6.10; x < 10.10; x += .65) {
      box('concrete', [x + .315, .062, 8.88], [.618, .12, .49]);
      box('concrete', [x + .315, .045, 8.59], [.624, .086, .10]);
      box('gutter', [x + .315, .008, 8.52], [.624, .014, .052]);
    }
    for (let z = .45; z < 5.75; z += .58) {
      const depth = Math.min(.553, 5.75 - z), cz = z + depth / 2;
      box('concrete', [6.565, .045, cz], [.068, .086, depth]);
      box('gutter', [6.64, .009, cz], [.064, .016, depth]);
      box('concrete', [rightCurb, .045, cz], [.105, .086, depth]);
      box('gutter', [ROAD_BOUNDS.spurRight - .025, .009, cz], [.052, .016, depth]);
      box('concrete', [rightWalk, .062, cz], [.54, .12, depth]);
    }
    // Restrained lane marks, crossings, and storm-water grilles.
    for (let x = -5.55; x < 9.4; x += 1.05) box('paint', [x, .012, 7.20], [.45, .008, .027]);
    for (let z = 1.5; z < 5.7; z += .83) box('paint', [8.015, .012, z], [.026, .008, .35]);
    for (let i = 0; i < 5; i++) box('paint', [3.60 + i * .26, .014, 7.20], [.15, .009, 2.14]);
    for (let i = 0; i < 4; i++) box('paint', [8.02, .014, 1.05 + i * .25], [2.22, .009, .14]);
    for (const x of [-4.2, 1.6, 7.2]) {
      box('gutter', [x, .018, 8.46], [.34, .027, .11]);
      for (let i = 0; i < 7; i++) box('metal', [x - .13 + i * .043, .034, 8.46], [.012, .008, .095]);
    }
    // Cast-metal bollards are short enough to leave the atelier unobstructed.
    for (const x of [-5.1, -3.2, .5, 2.65, 5.45]) {
      cylinder('ink', [x, .26, 5.47], .038, .29); cylinder('gold', [x, .39, 5.47], .043, .025);
      cylinder('ink', [x, .13, 5.47], .070, .035);
    }
    for (const z of [1.05, 3.55, 5.25]) {
      cylinder('ink', [rightWalk, .26, z], .038, .29); cylinder('gold', [rightWalk, .39, z], .043, .025);
    }
    for (const [x, z] of [[-4.7, 8.86], [1.5, 8.86], [8.8, 8.86], [rightWalk, 2.7]]) {
      cylinder('ink', [x, .22, z], .11, .21); cylinder('gold', [x, .35, z], .065, .035);
      cylinder('ink', [x, 1.14, z], .033, 1.62); cylinder('gold', [x, 1.93, z], .048, .038);
      box('ink', [x, 2.04, z], [.27, .25, .24]); box('lit', [x, 2.037, z + .128], [.20, .16, .012]);
      box('lit', [x + .143, 2.037, z], [.012, .16, .17]); box('ink', [x, 2.19, z], [.35, .064, .31]);
      cylinder('gold', [x, 2.25, z], .027, .071);
    }
    // A small service sign and the shuttle's inset book-receiving station.
    for (const x of [5.10, 6.10]) cylinder('ink', [x, .64, 5.47], .026, 1.04);
    box('ink', [5.60, 1.17, 5.47], [1.31, .47, .065]);
    add('label', a.plane, [5.60, 1.17, 5.508], [1.23, .39, 1]);
    box('ink', [-1.40, .253, 5.56], [.58, .39, .58]);
    box('gold', [-1.40, .455, 5.56], [.61, .016, .61]);
    box('gutter', [-1.40, .468, 5.56], [.45, .012, .45]);
    for (const side of [-1, 1]) box('ivory', [-1.40 + side * .267, .479, 5.56], [.037, .025, .58]);
  });
}
function roadGeometry(a) {
  const s = new THREE.Shape();
  const {left, right, front, junction, spurLeft, spurRight} = ROAD_BOUNDS;
  const coords = [[left, junction], [spurLeft, junction], [spurLeft, .45], [spurRight, .45], [spurRight, junction], [right, junction], [right, front], [left, front]];
  coords.forEach(([x, z], index) => index ? s.lineTo(x, -z) : s.moveTo(x, -z)); s.closePath();
  return a.own(new THREE.ShapeGeometry(s, 8).rotateX(-PI / 2));
}
function shuttleBody(a) {
  return batches(a, ({add, box, cylinder}) => {
    box('ink', [0, .275, 0], [.70, .11, 1.53]); box('ivory', [0, .47, -.43], [.79, .24, .77]);
    box('ivory', [0, .47, -.76], [.77, .21, .25]); box('wine', [0, .955, -.43], [.81, .082, .76]);
    box('ink', [0, .65, -.64], [.65, .055, .17]);
    box('glass', [0, .767, -.794], [.656, .293, .025], [.18, 0, 0]);
    for (const side of [-1, 1]) {
      box('wine', [side * .35, .77, -.79], [.045, .35, .045], [.18, 0, 0]);
      box('glass', [side * .389, .775, -.435], [.018, .285, .53]);
      box('wine', [side * .381, .78, -.14], [.040, .34, .044]);
      box('metal', [side * .409, .56, -.31], [.015, .018, .115]);
      box('ink', [side * .403, .48, -.12], [.008, .155, .009]);
      box('wine', [side * .17, .616, -.36], [.21, .073, .24]);
      box('wine', [side * .17, .742, -.235], [.21, .24, .05], [.11, 0, 0]);
      box('ink', [side * .445, .716, -.72], [.11, .019, .028]);
      box('wine', [side * .494, .751, -.72], [.05, .105, .077]);
      box('metal', [side * .494, .751, -.676], [.037, .079, .009]);
      box('ivory', [side * .34, .42, -.866], [.12, .10, .027]);
      box('lit', [side * .278, .479, -.88], [.12, .071, .023]);
      box('rear', [side * .327, .46, .866], [.084, .078, .019]);
    }
    box('ink', [0, .468, -.866], [.36, .104, .023]);
    for (let i = 0; i < 3; i++) box('metal', [0, .434 + i * .028, -.883], [.33, .008, .009]);
    box('metal', [0, .331, -.853], [.84, .058, .07]);
    box('wood', [0, .406, .38], [.76, .054, .94]);
    box('wine', [.389, .55, .38], [.043, .29, .94]); box('wine', [0, .55, .836], [.78, .29, .045]);
    box('wine', [0, .55, -.09], [.78, .29, .045]);
    for (const side of [-1, 1]) {
      box('metal', [side * .385, .706, .38], [.052, .023, .96]);
      box('metal', [side * .385, .35, .38], [.046, .028, .97]);
      cylinder('ink', [side * .386, .28, .78], .022, .23);
    }
    add('label', a.plane, [.416, .55, .38], [.61, .19, 1], [0, PI / 2, 0]);
    box('metal', [0, .31, .85], [.83, .059, .07]);
    // A visible driver silhouette and a real steering rim, not blue window blocks.
    box('ink', [.17, .718, -.38], [.16, .20, .13], [-.13, 0, 0]);
    add('skin', a.sphere, [.17, .864, -.37], [.073, .089, .071]);
    add('ink', a.sphere, [.17, .907, -.35], [.075, .047, .069]);
    for (const x of [.10, .24]) box('ink', [x, .72, -.50], [.047, .055, .20], [-.15, 0, 0]);
  });
}
function rimGeometry(a) {
  const items = [];
  const add = (geometry, matrix) => {let g = geometry.clone(); if (g.index) {const n = g.toNonIndexed(); g.dispose(); g = n;} g.applyMatrix4(matrix); items.push(g);};
  const transform = (p, s, r = ZERO) => new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
  add(a.cylinder, transform(ZERO, [.096, .13, .096], [0, 0, PI / 2]));
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) add(a.box, transform([side * .071, 0, 0], [.014, .16, .022], [i * PI / 3, 0, 0]));
  add(a.cylinder, transform(ZERO, [.035, .16, .035], [0, 0, PI / 2]));
  const merged = a.own(mergeGeometries(items, false)); items.forEach(g => g.dispose()); return merged;
}
function caseGeometry(a) {
  return batches(a, ({box}) => {
    box('wood', [0, .022, 0], [.35, .043, .35]);
    for (const side of [-1, 1]) {
      box('wood', [side * .169, .108, 0], [.022, .15, .35]); box('wood', [0, .108, side * .169], [.33, .15, .022]);
      box('gold', [side * .173, .104, 0], [.016, .018, .35]);
    }
    for (let i = 0; i < 2; i++) {
      box('wine', [0, .119 + i * .079, 0], [.25, .019, .27]);
      box('paper', [0, .151 + i * .079, 0], [.23, .047, .25]);
      box('wine', [0, .182 + i * .079, 0], [.25, .018, .27]);
    }
  });
}
function gateGeometry(a) {
  return batches(a, ({add, box}) => {
    box('wine', [0, .147, 0], [.036, .29, .83]);
    box('metal', [-.023, .147, 0], [.016, .235, .78]);
    box('metal', [0, .302, 0], [.05, .026, .85]);
    add('label', a.plane, [-.024, .143, 0], [.60, .18, 1], [0, -PI / 2, 0]);
  });
}
function rollerBridge(a) {
  return batches(a, ({box, cylinder}) => {
    for (const side of [-1, 1]) {
      box('metal', [side * .202, -.025, .145], [.023, .032, .29]);
      box('ink', [side * .202, -.046, .145], [.027, .013, .29]);
    }
    for (let i = 0; i < 6; i++) cylinder('metal', [0, -.014, .025 + i * .048], .014, .385, [0, 0, PI / 2]);
  });
}
function Shuttle({a, time}) {
  const root = useRef(), gate = useRef(), packet = useRef(), bridge = useRef([]), steeringRim = useRef(), steer = useRef([]), wheels = useRef([]), {gl} = useThree();
  const body = useMemo(() => shuttleBody(a), [a]), cargo = useMemo(() => caseGeometry(a), [a]), door = useMemo(() => gateGeometry(a), [a]);
  const rim = useMemo(() => rimGeometry(a), [a]), rollers = useMemo(() => rollerBridge(a), [a]);
  const route = useMemo(makeShuttleRoute, []), travel = useMemo(travelState, []), service = useMemo(serviceState, []);
  useFrame(() => {
    const seconds = readTime(time);
    shuttleTravelAt(seconds, route, travel); shuttleServiceAt(seconds, travel, service);
    root.current.position.copy(travel.position); root.current.rotation.y = travel.yaw;
    steer.current.forEach((group, index) => {
      if (!group) return;
      const side = index % 2 ? 1 : -1, front = index < 2;
      group.rotation.y = THREE.MathUtils.clamp(Math.atan(.47 * travel.curvature / Math.max(.35, 1 + side * .345 * travel.curvature)) * (front ? 1 : -1), -1.02, 1.02);
    });
    wheels.current.forEach(wheel => {if (wheel) wheel.rotation.x = travel.spin;});
    steeringRim.current.rotation.z = Math.atan(.47 * travel.curvature) * 1.8;
    gate.current.rotation.z = service.gate * (PI / 2 - .11);
    packet.current.position.copy(service.casePosition); packet.current.rotation.y = service.caseYaw;
    // Three nested sections slide on rails; each roller remains present while
    // the bridge extends from the receiving station to the open truck deck.
    bridge.current.forEach((section, index) => {
      if (!section) return;
      const extension = index * .285 * service.bridge;
      section.position.set(-1.40, .479 - extension * .04, 5.56 + extension);
    });
    a.m.rear.emissiveIntensity = travel.speed < .02 ? .6 : .18;
    Object.assign(gl.domElement.dataset, {worldShuttleTask: service.task, worldShuttleX: travel.position.x.toFixed(3), worldShuttleZ: travel.position.z.toFixed(3), worldShuttleGate: service.gate.toFixed(3), worldShuttleSteer: Math.atan(.47 * travel.curvature).toFixed(3), worldShuttleCrateX: service.casePosition.x.toFixed(3), worldShuttleCrateY: service.casePosition.y.toFixed(3), worldShuttleCrateZ: service.casePosition.z.toFixed(3), worldShuttleLoadIdentity: 'one-persistent-book-crate', worldRoadCycle: '60'});
  });
  return <>
    <group ref={root}>
      <BatchMeshes items={body}/>
      {[-.48, .48].flatMap((z, axle) => [-1, 1].map((side, index) => <group key={`${axle}-${side}`} ref={el => {steer.current[axle * 2 + index] = el;}} position={[side * .345, .18, z]}>
        <group ref={el => {wheels.current[axle * 2 + index] = el;}}><mesh geometry={a.tyre} material={a.m.dark} castShadow/><mesh geometry={rim} material={a.m.metal} castShadow/></group>
      </group>))}
      <mesh ref={steeringRim} geometry={a.ring} material={a.m.metal} position={[.17, .723, -.608]} scale={.057} rotation={[-.45, 0, 0]}/>
      <group ref={gate} position={[-.405, .410, .38]}><BatchMeshes items={door}/></group>
    </group>
    <group ref={packet} name="shuttle-persistent-book-crate"><BatchMeshes items={cargo}/></group>
    {[0, 1, 2].map(index => <group key={index} ref={el => {bridge.current[index] = el;}} rotation={[Math.atan(.04), 0, 0]} name={`shuttle-telescopic-bridge-${index}`}><BatchMeshes items={rollers}/></group>)}
  </>;
}

export default function ArchiveStreets({assets, time}) {
  const a = useMemo(() => makeKit(assets), [assets]);
  const street = useMemo(() => streetGeometry(a), [a]), road = useMemo(() => roadGeometry(a), [a]);
  const {gl} = useThree();
  useEffect(() => {
    Object.assign(gl.domElement.dataset, {worldStreetLayout: 'authored-L-front-right', worldStreetVehicleCount: '1', worldStreetMaps: 'procedural-color-normal-roughness', worldStreetStaticBatches: String(street.length + 1)});
    return () => {for (const key of ['worldStreetLayout', 'worldStreetVehicleCount', 'worldStreetMaps', 'worldStreetStaticBatches', 'worldShuttleTask', 'worldShuttleX', 'worldShuttleZ', 'worldShuttleGate', 'worldShuttleSteer', 'worldShuttleCrateX', 'worldShuttleCrateY', 'worldShuttleCrateZ', 'worldShuttleLoadIdentity', 'worldRoadCycle']) delete gl.domElement.dataset[key];};
  }, [gl, street]);
  useEffect(() => {
    let mounted = true;
    const loader = new THREE.TextureLoader(), names = ['color', 'normal', 'roughness'];
    Promise.allSettled(names.map(name => loader.loadAsync(`/assets/atelier-materials/asphalt-${name}-2k.jpg`))).then(results => {
      const maps = results.filter(result => result.status === 'fulfilled').map(result => result.value);
      if (!mounted || maps.length !== 3) {maps.forEach(map => map.dispose()); return;}
      maps.forEach((map, index) => {
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        // ShapeGeometry UVs are world metres: keep aggregate at a consistent
        // physical scale instead of stretching one photo over the entire road.
        map.repeat.setScalar(1 / 2.3);
        map.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        map.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        map.needsUpdate = true;
      });
      a.textures.push(...maps);
      Object.assign(a.m.asphalt, {map: maps[0], normalMap: maps[1], roughnessMap: maps[2]});
      a.m.asphalt.normalScale.set(.30, .30); a.m.asphalt.needsUpdate = true;
      Object.assign(gl.domElement.dataset, {worldStreetMaps: 'photographic-2048-color-normal-roughness', worldStreetTextureSize: String(maps[0].image.width)});
    });
    return () => {mounted = false; delete gl.domElement.dataset.worldStreetTextureSize;};
  }, [a, gl]);
  useEffect(() => () => a.dispose(), [a]);
  return <group name="archive-authored-service-streets" position={[0, GROUND, 0]}>
    <mesh geometry={road} material={a.m.asphalt} receiveShadow/>
    <BatchMeshes items={street}/>

  </group>;
}
