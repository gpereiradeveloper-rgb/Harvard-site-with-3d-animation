import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import optimer from 'three/examples/fonts/optimer_regular.typeface.json';

/* An original geometric interpretation of Widener, not a survey or a scan.
 * Facade +Z. Floor -3. Overall: 15.44W × 7.78H × 10.5D including the stair.
 * The actual Widener silhouette has 12 Corinthian columns and a flat parapet.
 */
const FONT = new FontLoader().parse(optimer);
const ASSET = '/assets/architecture/';
const MAPS = ['brick-color.jpg', 'brick-normal.jpg', 'brick-roughness.jpg', 'stone-color.jpg', 'stone-normal.jpg', 'stone-roughness.jpg'].map(name => ASSET + name);
const COL_X = Array.from({ length: 12 }, (_, i) => -5.39 + i * .98);
const BAYS = Array.from({ length: 11 }, (_, i) => -4.9 + i * .98);

function metricUV(geometry, density = 1) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ax > ay && ax > az) uv.setXY(i, p.getZ(i) * density, p.getY(i) * density);
    else if (ay > az) uv.setXY(i, p.getX(i) * density, p.getZ(i) * density);
    else uv.setXY(i, p.getX(i) * density, p.getY(i) * density);
  }
  return geometry;
}
function masonryBox(w, h, d) {
  return metricUV(new RoundedBoxGeometry(w, h, d, 1, Math.min(.014, w * .12, h * .12, d * .12)), 1.55);
}
function Box({ args, position, rotation, material, ...props }) {
  const [w, h, d] = args;
  const geometry = useMemo(() => masonryBox(w, h, d), [w, h, d]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} position={position} rotation={rotation} castShadow receiveShadow {...props} />;
}
function Instances({ geometry, material, items, castShadow = true, receiveShadow = true }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const temp = new THREE.Object3D(), color = new THREE.Color();
    items.forEach(({ p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], c }, i) => {
      temp.position.fromArray(p); temp.rotation.set(...r); temp.scale.fromArray(s); temp.updateMatrix();
      ref.current.setMatrixAt(i, temp.matrix);
      if (c) { color.set(c); ref.current.setColorAt(i, color); }
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow={receiveShadow} />;
}
function makeFlutedShaft() {
  const rings = 32, sides = 120, position = [], uv = [], indices = [];
  for (let y = 0; y <= rings; y++) {
    const t = y / rings, radius = THREE.MathUtils.lerp(.218, .177, t) + Math.sin(t * Math.PI) * .009;
    for (let s = 0; s <= sides; s++) {
      const a = s / sides * Math.PI * 2;
      const flute = 1 - .038 * (.5 + .5 * Math.cos(a * 24));
      position.push(Math.cos(a) * radius * flute, t * 4.10, Math.sin(a) * radius * flute);
      uv.push(s / sides * .75, t * 2.4);
      if (y < rings && s < sides) {
        const i = y * (sides + 1) + s;
        indices.push(i, i + sides + 1, i + 1, i + 1, i + sides + 1, i + sides + 2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals();
  return g;
}
function leafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -.11); shape.bezierCurveTo(-.055, -.05, -.075, .035, -.028, .13);
  shape.bezierCurveTo(-.005, .10, .005, .16, 0, .19);
  shape.bezierCurveTo(.025, .13, .075, .035, .055, -.035); shape.quadraticCurveTo(.025, -.08, 0, -.11);
  const g = new THREE.ExtrudeGeometry(shape, { depth: .018, bevelEnabled: true, bevelSize: .009, bevelThickness: .009, bevelSegments: 1, curveSegments: 5, steps: 1 });
  g.translate(0, 0, -.009); return g;
}
function makeWindowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 256, 512);
  gradient.addColorStop(0, '#5b6b70'); gradient.addColorStop(.32, '#243338'); gradient.addColorStop(.55, '#344044'); gradient.addColorStop(1, '#171d1e');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(199,184,143,${.015 + (i % 3) * .012})`; ctx.fillRect(i * 27, 0, 8 + i % 4, 512); }
  ctx.fillStyle = 'rgba(248,229,171,.12)'; ctx.fillRect(15, 320, 223, 14); ctx.fillRect(49, 355, 153, 10);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8; return texture;
}
function friezeGeometry() {
  const words = 'HARRY ELKINS WIDENER MEMORIAL LIBRARY';
  const geos = []; let cursor = 0;
  for (const char of words) {
    if (char === ' ') { cursor += .18; continue; }
    const geo = new TextGeometry(char, { font: FONT, size: .125, depth: .0035, curveSegments: 3, bevelEnabled: false });
    geo.computeBoundingBox(); const width = geo.boundingBox.max.x - geo.boundingBox.min.x;
    geo.translate(cursor, 0, 0); cursor += width + .115; geos.push(geo);
  }
  const merged = mergeGeometries(geos); geos.forEach(g => g.dispose());
  merged.translate(-cursor / 2, -.055, 0); return merged;
}
function cheekGeometry(side) {
  const x0 = side < 0 ? -6.94 : 6.27, x1 = side < 0 ? -6.27 : 6.94, z0 = 2.47, z1 = 6.65;
  const y0 = -1.02, y1 = -2.08, bottom = -3.04;
  const vertices = [x0,bottom,z0, x1,bottom,z0, x1,bottom,z1, x0,bottom,z1, x0,y0,z0, x1,y0,z0, x1,y1,z1, x0,y1,z1];
  const order = [0,1,4,1,5,4, 3,7,2,2,7,6, 0,4,3,3,4,7, 1,2,5,2,6,5, 4,5,7,5,6,7, 0,3,1,1,3,2];
  for (let i = 0; i < order.length; i += 3) [order[i + 1], order[i + 2]] = [order[i + 2], order[i + 1]];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(order);
  const non = g.toNonIndexed(); g.dispose(); non.computeVertexNormals(); non.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(non.attributes.position.count * 2), 2));
  return metricUV(non, .65);
}

function Columns({ stone }) {
  const geometries = useMemo(() => {
    const base = new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.296,0),new THREE.Vector2(.296,.067),new THREE.Vector2(.265,.081),new THREE.Vector2(.244,.123),new THREE.Vector2(.264,.16),new THREE.Vector2(.258,.205),new THREE.Vector2(.226,.23),new THREE.Vector2(.218,.26)],48);
    const capital = new THREE.LatheGeometry([new THREE.Vector2(.177,0),new THREE.Vector2(.185,.045),new THREE.Vector2(.205,.08),new THREE.Vector2(.229,.19),new THREE.Vector2(.26,.29),new THREE.Vector2(.271,.32)],40);
    return { base, shaft: makeFlutedShaft(), capital, leaf: leafGeometry(), volute: new THREE.TorusGeometry(.067,.019,6,16), cube: new THREE.BoxGeometry(1,1,1) };
  }, []);
  const parts = useMemo(() => {
    const base = [], shaft = [], capital = [], leaves = [], volutes = [], abacus = [];
    COL_X.forEach((x, i) => {
      base.push({p:[x,-1.44,2.18]}); shaft.push({p:[x,-1.18,2.18]}); capital.push({p:[x,2.92,2.18]});
      abacus.push({p:[x,3.265,2.18],s:[.585,.095,.585]});
      for (let row = 0; row < 2; row++) for (let l = 0; l < 8; l++) {
        const a = (l + row * .5) / 8 * Math.PI * 2, radius = row ? .22 : .187;
        leaves.push({p:[x+Math.sin(a)*radius,3.015+row*.14,2.18+Math.cos(a)*radius],r:[row ? .33 : .12,a,0],s:[row ? .83:1.02,row ? .8:1,1]});
      }
      for (const sx of [-1,1]) for (const sz of [-1,1]) volutes.push({p:[x+sx*.205,3.185,2.18+sz*.215],r:[0,sz<0?Math.PI:0,sx*.15]});
    }); return {base,shaft,capital,leaves,volutes,abacus};
  }, []);
  useEffect(()=>()=>Object.values(geometries).forEach(g=>g.dispose()),[geometries]);
  return <group>
    <Instances geometry={geometries.base} material={stone} items={parts.base}/>
    <Instances geometry={geometries.shaft} material={stone} items={parts.shaft}/>
    <Instances geometry={geometries.capital} material={stone} items={parts.capital}/>
    <Instances geometry={geometries.leaf} material={stone} items={parts.leaves}/>
    <Instances geometry={geometries.volute} material={stone} items={parts.volutes}/>
    <Instances geometry={geometries.cube} material={stone} items={parts.abacus}/>
  </group>;
}

function Glazing({ glass, metal, stone }) {
  const unit = useMemo(()=>new THREE.BoxGeometry(1,1,1),[]);
  const components = useMemo(()=>{
    const windows=[],frames=[],mullions=[],doorBars=[],trim=[];
    const addWindow=(x,y,w,h,z=.79,door=false)=>{
      windows.push({p:[x,y,z],s:[w,h,.025],c:door?'#c2ad8b':'#cad6d4'});
      frames.push({p:[x-w/2-.018,y,z+.026],s:[.042,h+.09,.072]},{p:[x+w/2+.018,y,z+.026],s:[.042,h+.09,.072]},{p:[x,y-h/2-.02,z+.026],s:[w+.08,.045,.072]},{p:[x,y+h/2+.02,z+.026],s:[w+.08,.045,.072]});
      for(let v=1;v<3;v++)mullions.push({p:[x-w/2+w*v/3,y,z+.06],s:[.019,h,.028]});
      for(let r=1;r<(door?7:6);r++)mullions.push({p:[x,y-h/2+h*r/(door?7:6),z+.062],s:[w,.018,.028]});
      if(door){
        doorBars.push({p:[x,y,z+.083],s:[.035,h,.04]});
        for(const s of [-1,1]){doorBars.push({p:[x+s*.13,y-.05,z+.112],s:[.021,.22,.033]});}
        for(let j=0;j<5;j++)for(const s of [-1,1])doorBars.push({p:[x,y-h*.35+j*h*.16,z+.09],r:[0,0,s*.58],s:[w*.98,.012,.018]});
      }
      trim.push({p:[x,y+h/2+.10,z+.045],s:[w+.19,.09,.18]},{p:[x,y-h/2-.10,z+.07],s:[w+.19,.085,.22]});
    };
    BAYS.forEach((x,i)=>{addWindow(x,1.56,.66,1.63);if(i>=4&&i<=6)addWindow(x,-.55,.71,1.72,.82,true);else addWindow(x,-.68,.62,1.28);});
    for(const side of [-1,1])for(const y of [-.63,1.6,3.77])addWindow(side*6.7,y,.66,y>3? .67:1.36,1.22);
    return {windows,frames,mullions,doorBars,trim};
  },[]);
  useEffect(()=>()=>unit.dispose(),[unit]);
  return <group>
    <Instances geometry={unit} material={glass} items={components.windows}/>
    <Instances geometry={unit} material={metal} items={components.frames}/>
    <Instances geometry={unit} material={metal} items={components.mullions}/>
    <Instances geometry={unit} material={metal} items={components.doorBars}/>
    <Instances geometry={unit} material={stone} items={components.trim}/>
  </group>;
}

function Cornices({stone, darkStone}) {
  const unit=useMemo(()=>new THREE.BoxGeometry(1,1,1),[]);
  const dentils=useMemo(()=>{
    const a=[];
    for(let i=0;i<78;i++)a.push({p:[-6.18+i*.16,3.61,2.48],s:[.072,.105,.115]});
    for(const side of [-1,1])for(let i=0;i<12;i++)a.push({p:[side*6.7+(i-5.5)*.15,3.62,1.4],s:[.065,.095,.105]});
    return a;
  },[]);
  useEffect(()=>()=>unit.dispose(),[unit]);
  return <group>
    <Box args={[12.46,.29,1.9]} position={[0,3.41,1.65]} material={stone}/>
    <Box args={[12.62,.09,2.04]} position={[0,3.57,1.67]} material={darkStone}/>
    <Box args={[12.79,.105,2.18]} position={[0,3.74,1.68]} material={stone}/>
    <Box args={[12.69,.065,2.10]} position={[0,3.83,1.67]} material={stone}/>
    <Box args={[12.4,.09,.18]} position={[0,3.155,2.56]} material={stone}/>
    <Box args={[12.4,.07,.22]} position={[0,3.03,2.54]} material={darkStone}/>
    <Instances geometry={unit} material={stone} items={dentils}/>
    {[-1,1].map(side=><group key={side}>
      <Box args={[2.02,.25,4.7]} position={[side*6.63,3.42,-.55]} material={stone}/>
      <Box args={[2.18,.105,4.83]} position={[side*6.63,3.76,-.52]} material={stone}/>
      <Box args={[2.03,.085,4.73]} position={[side*6.63,3.86,-.54]} material={stone}/>
      <Box args={[2.0,.10,4.64]} position={[side*6.63,4.50,-.56]} material={stone}/>
    </group>)}
  </group>;
}

export default function WidenerLibrary({motion,reducedMotion=false,quality='auto'}) {
  const originals=useTexture(MAPS);
  const materials=useMemo(()=>{
    const maps=originals.map((original,i)=>{
      const t=original.clone();t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=quality==='cinema'?16:8;
      t.colorSpace=i===0||i===3?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true;return t;
    });
    const brick=new THREE.MeshStandardMaterial({map:maps[0],normalMap:maps[1],roughnessMap:maps[2],normalScale:new THREE.Vector2(.18,.18),color:'#fff2ed',roughness:.94});
    const stone=new THREE.MeshStandardMaterial({map:maps[3],normalMap:maps[4],roughnessMap:maps[5],normalScale:new THREE.Vector2(.045,.045),color:'#eee8da',roughness:.88});
    // Retain the pores at close range while keeping the limestone face quiet.
    stone.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb = mix(vec3(0.72,0.69,0.62),diffuseColor.rgb,0.075);');};
    stone.customProgramCacheKey=()=> 'widener-limestone-v2';
    const darkStone=stone.clone();darkStone.color.set('#b8b0a0');
    darkStone.onBeforeCompile=stone.onBeforeCompile;darkStone.customProgramCacheKey=stone.customProgramCacheKey;
    const metal=new THREE.MeshStandardMaterial({color:'#202722',roughness:.36,metalness:.72});
    const windowMap=makeWindowTexture();
    const glass=new THREE.MeshPhysicalMaterial({map:windowMap,color:'#b5c3c4',metalness:.54,roughness:.25,clearcoat:1,clearcoatRoughness:.18,envMapIntensity:1.3,emissive:'#c78f4a',emissiveIntensity:.055});
    const text=new THREE.MeshStandardMaterial({color:'#756f61',roughness:.86,metalness:.04});
    const darkness=new THREE.MeshStandardMaterial({color:'#171c19',roughness:.95});
    return {maps,windowMap,brick,stone,darkStone,metal,glass,text,darkness};
  // Textures and geometry remain stable while parent scroll state changes.
  },[...originals]);
  const frieze=useMemo(friezeGeometry,[]);
  const cheeks=useMemo(()=>[cheekGeometry(-1),cheekGeometry(1)],[]);
  useEffect(()=>()=>{materials.maps.forEach(t=>t.dispose());materials.windowMap.dispose();for(const v of Object.values(materials))if(v?.isMaterial)v.dispose();},[materials]);
  useEffect(()=>()=>{frieze.dispose();cheeks.forEach(g=>g.dispose());},[frieze,cheeks]);
  useEffect(()=>{materials.maps.forEach(t=>{t.anisotropy=quality==='cinema'?16:8;t.needsUpdate=true;});},[quality,materials]);
  useFrame((_,dt)=>{const night=motion?.mode==='night'||motion?.mode==='dusk';materials.glass.emissiveIntensity=THREE.MathUtils.damp(materials.glass.emissiveIntensity,night ? .22 : .055,reducedMotion?20:2,Math.min(dt,.1));});
  return <group name="Widener Library — architectural interpretation">
    {/* Deep masonry shells leave the colonnade physically separated from the facade. */}
    <Box args={[12.3,5.3,4.45]} position={[0,1.10,-1.55]} material={materials.brick}/>
    <Box args={[15.2,1.32,5.02]} position={[0,-2.35,-1.10]} material={materials.stone}/>
    <Box args={[15.2,.30,5.08]} position={[0,-1.57,-1.10]} material={materials.stone}/>
    <Box args={[12.6,1.50,1.86]} position={[0,-2.24,1.83]} material={materials.stone}/>
    <Box args={[12.6,.17,1.86]} position={[0,-1.44,1.83]} material={materials.stone}/>
    <Box args={[12.4,.72,.52]} position={[0,4.17,1.85]} material={materials.brick}/>
    <Box args={[12.63,.13,.73]} position={[0,4.59,1.86]} material={materials.stone}/>
    <Box args={[3.32,.12,.74]} position={[0,4.68,1.85]} material={materials.stone}/>
    {/* Facade piers and sill courses frame the recessed dark windows. */}
    {Array.from({length:12},(_,i)=><Box key={'pier'+i} args={[.27,4.32,.36]} position={[-5.39+i*.98,.65,.77]} material={materials.brick}/>)}
    <Box args={[11.25,.25,.36]} position={[0,.37,.77]} material={materials.brick}/>
    <Box args={[11.25,.15,.43]} position={[0,.16,.79]} material={materials.stone}/>
    <Box args={[11.25,.32,.36]} position={[0,2.77,.77]} material={materials.brick}/>
    {[-1,1].map(side=><group key={side}>
      <Box args={[1.90,6.12,4.92]} position={[side*6.64,1.45,-1.26]} material={materials.brick}/>
      <Box args={[.17,5.15,.21]} position={[side*5.75,1.0,1.25]} material={materials.stone}/>
      <Box args={[.15,5.15,.21]} position={[side*7.53,1.0,1.25]} material={materials.stone}/>
      <Box args={[1.91,.17,.24]} position={[side*6.64,.35,1.25]} material={materials.stone}/>
      <Box args={[1.91,.22,.27]} position={[side*6.64,-1.45,1.25]} material={materials.stone}/>
    </group>)}
    <Columns stone={materials.stone}/><Glazing glass={materials.glass} metal={materials.metal} stone={materials.stone}/><Cornices stone={materials.stone} darkStone={materials.darkStone}/>
    <mesh geometry={frieze} material={materials.text} position={[0,3.405,2.612]} castShadow/>
    {Array.from({length:15},(_,i)=>{const h=(i+1)*.105,d=3.90-i*.22;return <Box key={'step'+i} args={[12.52,h,d]} position={[0,-3+h/2,2.55+d/2]} material={materials.stone}/>;})}
    {cheeks.map((geometry,i)=><mesh key={'cheek'+i} geometry={geometry} material={materials.stone} castShadow receiveShadow/>)}
    {[-1,1].map(side=><group key={'coping'+side}>
      <Box args={[.82,.13,4.36]} position={[side*6.605,-1.54,4.56]} rotation={[.248,0,0]} material={materials.stone}/>
      <Box args={[.82,.13,.48]} position={[side*6.605,-2.08,6.65]} material={materials.stone}/>
      {[3.05,4.02,5.0,5.97].map(z=><Box key={z} args={[.016,.82,.015]} position={[side*6.955,-2.42,z]} material={materials.darkStone}/>)}
    </group>)}
    {/* Subtle stone joint lines on the front landing and foundation. */}
    {Array.from({length:19},(_,i)=><Box key={'joint'+i} args={[.008,.012,1.7]} position={[-5.94+i*.66,-1.349,1.75]} material={materials.darkStone}/>)}
  </group>;
}
