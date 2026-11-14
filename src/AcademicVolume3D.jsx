import React, {Suspense, useEffect, useMemo, useRef, useState} from 'react';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {ContactShadows, Environment, Html, Lightformer, RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import optimerFont from 'three/examples/fonts/optimer_regular.typeface.json';
import {useViewportRenderQuality} from './RenderQuality';

const W = 2.9, H = 4, PW = 2.64, PH = 3.74;
const FONT = new FontLoader().parse(optimerFont);
const clamp = n => THREE.MathUtils.clamp(n, 0, 1);
const smooth = (a, b, n) => {const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t);};
const CHAPTERS = [
  {id: 'origins', label: 'As origens', from: .30, to: .345},
  {id: 'library', label: 'A biblioteca', from: .485, to: .545},
  {id: 'collections', label: 'O acervo', from: .685, to: .745},
  {id: 'collections', label: 'O próximo capítulo', from: .875, to: 1.01},
];
const seedRandom = (seed = 1636) => () => {seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646;};

function makeTexture(width, height, draw, color = true) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.anisotropy = 12;
  return map;
}

function centerText(ctx, text, y, size, color = '#602139', italic = false) {
  ctx.fillStyle = color; ctx.font = `${italic ? 'italic ' : ''}${size}px Georgia,serif`;
  ctx.textAlign = 'center'; ctx.fillText(text, 768, y);
}

function paper(ctx, width, height) {
  const random = seedRandom(1915);
  ctx.fillStyle = '#f1e9d5'; ctx.fillRect(0, 0, width, height);
  const shade = ctx.createLinearGradient(0, 0, width, 0);
  shade.addColorStop(0, '#ad92672e'); shade.addColorStop(.08, '#fff9e500'); shade.addColorStop(.94, '#fff9e500'); shade.addColorStop(1, '#b39b6f1b');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 26000; i++) {ctx.fillStyle = `rgba(120,95,48,${.025 + random() * .035})`; ctx.fillRect(random() * width, random() * height, .5 + random() * 2, .5 + random());}
  ctx.strokeStyle = '#a88b5655'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(130, 180); ctx.lineTo(width - 130, 180); ctx.moveTo(130, height - 160); ctx.lineTo(width - 130, height - 160); ctx.stroke();
  ctx.font = '28px Georgia,serif'; ctx.fillStyle = '#a28756'; ctx.textAlign = 'left'; ctx.fillText('HARVARD', 140, 132); ctx.textAlign = 'right'; ctx.fillText('UM ATLAS DE IDEIAS', width - 140, 132);
}

function shield(ctx, x, y, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(-104, -112); ctx.lineTo(104, -112); ctx.lineTo(104, 12); ctx.bezierCurveTo(98, 83, 45, 126, 0, 155); ctx.bezierCurveTo(-45, 126, -98, 83, -104, 12); ctx.closePath(); ctx.stroke();
  for (const [bx, by, word] of [[-49, -32, 'VE'], [49, -32, 'RI'], [0, 61, 'TAS']]) {
    ctx.beginPath(); ctx.moveTo(bx, by - 20); ctx.quadraticCurveTo(bx - 19, by - 31, bx - 36, by - 22); ctx.lineTo(bx - 36, by + 20); ctx.quadraticCurveTo(bx - 15, by + 12, bx, by + 24); ctx.quadraticCurveTo(bx + 15, by + 12, bx + 36, by + 20); ctx.lineTo(bx + 36, by - 22); ctx.quadraticCurveTo(bx + 19, by - 31, bx, by - 20); ctx.lineTo(bx, by + 24); ctx.stroke();
    ctx.font = '18px Georgia,serif'; ctx.textAlign = 'center'; ctx.fillText(word, bx, by + 6);
  }
  ctx.restore();
}

function makeMaps() {
  const random = seedRandom();
  const foil = makeTexture(3072, 4096, ctx => {
    ctx.scale(3, 4096 / 1400); ctx.clearRect(0, 0, 1024, 1400); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.2; ctx.strokeRect(58, 58, 908, 1284); ctx.lineWidth = .65; ctx.strokeRect(72, 72, 880, 1256);
    ctx.textAlign = 'center'; ctx.font = '17px Georgia,serif'; ctx.fillText('CAMBRIDGE · MASSACHUSETTS', 512, 154);
    shield(ctx, 512, 405, .92);
    ctx.font = '21px Georgia,serif'; ctx.fillText('UM ATLAS DE IDEIAS', 512, 804);
    ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(456, 900); ctx.lineTo(568, 900); ctx.stroke();
    ctx.font = '54px Georgia,serif'; ctx.fillText('VERITAS', 512, 1045);
    ctx.font = '22px Georgia,serif'; ctx.fillText('1636', 512, 1212);
    for (const x of [89, 935]) for (const y of [89, 1311]) {ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();}
  }, false);
  const linen = makeTexture(1024, 1024, (ctx, w, h) => {
    const pixels = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, grain = (random() - .5) * 12, weave = Math.sin(x * Math.PI / 2) * 4 + Math.sin(y * Math.PI / 2) * 5;
      pixels.data[i] = 224 + grain + weave; pixels.data[i + 1] = 215 + grain + weave; pixels.data[i + 2] = 192 + grain + weave; pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
  });
  const normal = makeTexture(512, 512, (ctx, w, h) => {
    const pixels = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {const i = (y * w + x) * 4; pixels.data[i] = 128 + Math.sin(x * Math.PI / 2) * 20; pixels.data[i + 1] = 128 + Math.sin(y * Math.PI / 2) * 23; pixels.data[i + 2] = 250; pixels.data[i + 3] = 255;}
    ctx.putImageData(pixels, 0, 0);
  }, false);
  const fibre = makeTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#b5b5b5'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {const v = Math.floor(150 + random() * 75); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(random() * w, random() * h, .5 + random() * 2, .4 + random());}
  }, false);
  const rough = makeTexture(256, 256, (ctx, w, h) => {
    const pixels = ctx.createImageData(w, h);
    for (let i = 0; i < pixels.data.length; i += 4) {const v = 232 + Math.floor(random() * 18); pixels.data[i] = v; pixels.data[i + 1] = v; pixels.data[i + 2] = v; pixels.data[i + 3] = 255;}
    ctx.putImageData(pixels, 0, 0);
  }, false);
  const page = kind => makeTexture(1536, 2048, (ctx, w, h) => {
    paper(ctx, w, h);
    if (kind === 'origins') {
      centerText(ctx, 'I / AS ORIGENS', 337, 36, '#9b7f4e'); centerText(ctx, 'Uma história', 570, 150); centerText(ctx, 'que se abre.', 745, 150, '#9c7d4d', true);
      centerText(ctx, '1636', 1160, 350); centerText(ctx, '28 DE OUTUBRO', 1270, 38, '#9b7f4e');
      centerText(ctx, 'A fundação de Harvard.', 1500, 67, '#5c4b3c'); centerText(ctx, 'Uma nova história de conhecimento.', 1600, 58, '#78634c');
    } else if (kind === 'library') {
      centerText(ctx, 'II / OS LUGARES', 337, 36, '#9b7f4e'); centerText(ctx, 'Um lugar', 545, 150); centerText(ctx, 'para ler.', 715, 150, '#9c7d4d', true);
      ctx.fillStyle = '#d7ccb5'; ctx.fillRect(145, 840, 1246, 580); ctx.strokeStyle = '#ad916244'; ctx.lineWidth = 2; ctx.strokeRect(135, 830, 1266, 600);
      centerText(ctx, 'LOKER READING ROOM', 1150, 54, '#a0875b'); centerText(ctx, 'Widener Library · aberta em 1915.', 1555, 63, '#5c4b3c'); centerText(ctx, 'A luz, os livros, as possibilidades.', 1660, 57, '#78634c');
    } else if (kind === 'collections') {
      centerText(ctx, 'III / O ACERVO', 337, 36, '#9b7f4e'); centerText(ctx, 'A página', 570, 150); centerText(ctx, 'impressa.', 745, 150, '#9c7d4d', true);
      ctx.strokeStyle = '#a78b5655'; ctx.strokeRect(557, 875, 422, 460); centerText(ctx, 'G', 1250, 420);
      centerText(ctx, 'A Bíblia de Gutenberg.', 1510, 70, '#5c4b3c'); centerText(ctx, 'O exemplar de Harvard, em dois volumes.', 1620, 54, '#78634c');
    } else if (kind === 'end') {
      centerText(ctx, 'IV / CONTINUAR', 337, 36, '#9b7f4e'); centerText(ctx, 'A descoberta', 600, 150); centerText(ctx, 'continua aqui.', 775, 150, '#9c7d4d', true); ctx.strokeStyle = '#a58b57'; ctx.fillStyle = '#a58b57'; shield(ctx, 768, 1135, .9);
      centerText(ctx, 'Imagens. Histórias. Novas ideias.', 1550, 61, '#5c4b3c'); centerText(ctx, 'Escolha seu próximo capítulo.', 1650, 61, '#78634c');
    } else {
      centerText(ctx, 'HARVARD', 440, 96, '#9b7f4e'); centerText(ctx, 'Toda descoberta', 820, 130); centerText(ctx, 'começa com', 990, 130); centerText(ctx, 'uma pergunta.', 1170, 135, '#9c7d4d', true);
      centerText(ctx, 'UM VOLUME PARA EXPLORAR', 1560, 32, '#9b7f4e');
    }
    ctx.textAlign = 'center'; ctx.font = '30px Georgia,serif'; ctx.fillStyle = '#9b835c'; ctx.fillText(kind === 'origins' ? '01' : kind === 'library' ? '02' : kind === 'collections' ? '03' : 'VERITAS', 768, 1950);
  });
  const maps = {foil, linen, normal, fibre, rough, origins: page('origins'), library: page('library'), collections: page('collections'), end: page('end'), endpaper: page('endpaper')};
  maps.backs = [maps.endpaper, maps.library, maps.collections].map(source => {const t = source.clone(); t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; t.needsUpdate = true; return t;});
  return maps;
}

function EmbossedName() {
  const geometry = useMemo(() => {
    const g = new TextGeometry('HARVARD', {font: FONT, size: .265, depth: .008, curveSegments: 6, bevelEnabled: true, bevelThickness: .0018, bevelSize: .0012, bevelSegments: 2});
    g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, 0, 0); return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={[W / 2, .065, .067]} castShadow><meshPhysicalMaterial color="#cdb279" metalness={.88} roughness={.3} envMapIntensity={1.25}/></mesh>;
}

function PaperBlock() {
  const ref = useRef();
  useEffect(() => {
    const matrix = new THREE.Matrix4(), color = new THREE.Color();
    for (let i = 0; i < 200; i++) {const uneven = Math.sin(i * 12.37) * .0035; matrix.makeTranslation(.012 + uneven, uneven * .6, -.352 + i * .00325); ref.current.setMatrixAt(i, matrix); ref.current.setColorAt(i, color.set(i % 13 === 0 ? '#d1c39f' : i % 3 === 0 ? '#e9dfc4' : '#f0e7cf'));}
    ref.current.instanceMatrix.needsUpdate = true; ref.current.instanceColor.needsUpdate = true;
  }, []);
  return <instancedMesh ref={ref} args={[null, null, 200]} castShadow receiveShadow><boxGeometry args={[PW, PH, .0028]}/><meshStandardMaterial roughness={.94}/></instancedMesh>;
}

function ClothStitches() {
  const ref = useRef();
  useEffect(() => {
    const matrix = new THREE.Matrix4(); let index = 0;
    for (const z of [-.315, .29]) for (let y = -1.85; y < 1.86; y += .075) {matrix.makeTranslation(-W / 2 - .09, y, z); ref.current.setMatrixAt(index++, matrix);}
    ref.current.count = index; ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return <instancedMesh ref={ref} args={[null, null, 104]}><boxGeometry args={[.008, .027, .009]}/><meshStandardMaterial color="#b59e79" roughness={.92}/></instancedMesh>;
}

function CurvedLeaf({index, motion, front, back, fibre}) {
  const hinge = useRef(), previous = useRef(-1);
  const geometry = useMemo(() => {const g = new THREE.PlaneGeometry(PW, PH, 40, 8); g.translate(PW / 2, 0, 0); return g;}, []);
  const base = useMemo(() => new Float32Array(geometry.attributes.position.array), [geometry]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const p = clamp(motion.progress || 0), a = smooth(.345 + index * .20, .485 + index * .20, p);
    hinge.current.rotation.y = -a * Math.PI;
    hinge.current.position.z = .319 + (2 - index) * .007 + a * .015;
    if (Math.abs(previous.current - a) < .00002) return;
    previous.current = a;
    const pos = geometry.attributes.position, curl = Math.sin(a * Math.PI);
    for (let i = 0; i < pos.count; i++) {const x = base[i * 3], y = base[i * 3 + 1], u = x / PW; pos.setXYZ(i, x - Math.sin(Math.PI * u) * curl * .035, y + Math.sin(u * Math.PI) * Math.sin(y * .85) * curl * .025, Math.sin(u * Math.PI) * curl * (.21 + index * .015) + u * u * (curl * .035 + a * a * .64));}
    pos.needsUpdate = true; geometry.computeVertexNormals();
  });
  return <group ref={hinge} position={[-PW / 2, 0, .319 + (2 - index) * .007]}><mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial map={front} bumpMap={fibre} bumpScale={.0017} roughness={.87} side={THREE.FrontSide}/></mesh><mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial map={back} bumpMap={fibre} bumpScale={.0017} roughness={.89} side={THREE.BackSide}/></mesh></group>;
}

function Ribbon() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(.14, .86, 1, 24), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {const t = (pos.getY(i) + .43) / .86; pos.setX(i, pos.getX(i) + Math.sin(t * 3.2) * .07); pos.setZ(i, Math.sin(t * 4) * .08);}
    g.computeVertexNormals(); return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={[.55, -2.2, -.11]} rotation-z={-.13} castShadow><meshPhysicalMaterial color="#602139" roughness={.7} sheen={.7} sheenColor="#ae6b7c" side={THREE.DoubleSide}/></mesh>;
}

function VolumeScene({motion, reduced, paused, active, quality, onReady, onChapter}) {
  const book = useRef(), cover = useRef(), current = useRef(0), calledReady = useRef(false), selected = useRef(null);
  const [hotspot, setHotspot] = useState(null);
  const {camera, size, invalidate, gl} = useThree();
  const maps = useMemo(makeMaps, []), frameMotion = useMemo(() => ({progress: 0}), []);
  const vectors = useMemo(() => ({eye: new THREE.Vector3(), target: new THREE.Vector3(), closed: new THREE.Vector3(7, 5, 10), open: new THREE.Vector3(.35, 1.45, 9.8)}), []);
  useEffect(() => {
    const image = new Image(); let live = true;
    image.onload = () => {
      if (!live) return;
      const ctx = maps.library.image.getContext('2d'), x = 145, y = 840, width = 1246, height = 580, sourceRatio = image.width / image.height, targetRatio = width / height;
      let sw = image.width, sh = image.height, sx = 0, sy = 0;
      if (sourceRatio > targetRatio) {sw = image.height * targetRatio; sx = (image.width - sw) / 2;} else {sh = image.width / targetRatio; sy = (image.height - sh) / 2;}
      ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height); maps.library.needsUpdate = true; maps.backs[1].needsUpdate = true; invalidate();
    };
    image.src = '/assets/loker-4k.jpg';
    return () => {live = false; image.onload = null;};
  }, [maps, invalidate]);
  useEffect(() => () => {for (const [name, texture] of Object.entries(maps)) if (name !== 'backs') texture.dispose(); maps.backs.forEach(t => t.dispose());}, [maps]);
  useEffect(() => {if (!active || paused) invalidate();}, [active, paused, invalidate]);
  useFrame((state, delta) => {
    if (!book.current || !cover.current) return;
    current.current = reduced ? clamp(motion?.progress || 0) : THREE.MathUtils.damp(current.current, clamp(motion?.progress || 0), 13, Math.min(delta, .08));
    const p = current.current; frameMotion.progress = p;
    const opening = smooth(.08, .30, p), settle = smooth(.875, 1, p), portrait = size.width / size.height < 1.1;
    cover.current.rotation.y = -Math.PI * opening;
    // A real front board settles beside the back board when the binding opens.
    // Turned leaves curve down from the raised text-block hinge onto this board.
    cover.current.position.z = .415 - opening * .845;
    vectors.eye.copy(vectors.closed).lerp(vectors.open, smooth(0, .31, p)); vectors.eye.z -= settle * (portrait ? .25 : .8); vectors.eye.y -= settle * .45;
    const viewHeight = 2 * vectors.eye.length() * Math.tan(THREE.MathUtils.degToRad(36) / 2), viewWidth = viewHeight * size.width / size.height;
    const scale = Math.min(portrait ? .98 : 1.06, viewWidth * (portrait ? .84 : .79) / (W * (1 + opening)), viewHeight * .76 / H);
    book.current.scale.setScalar(scale);
    book.current.position.set(opening * W * .5 * scale, portrait ? .02 : -.03, 0);
    book.current.rotation.set(.025 * (1 - opening), -.04 * (1 - opening), -.09 * (1 - opening) - .015 * opening);
    if (!reduced && !paused && p < .08) book.current.position.y += Math.sin(state.clock.elapsedTime * .65) * .025;
    camera.position.copy(vectors.eye); vectors.target.set(0, portrait ? .06 : 0, 0); camera.lookAt(vectors.target); camera.updateProjectionMatrix();
    const chapter = CHAPTERS.find(item => p >= item.from && p < item.to)?.id || null;
    if (chapter !== selected.current) {selected.current = chapter; setHotspot(chapter);}
    const canvas = gl.domElement; canvas.dataset.bookProgress = p.toFixed(4); canvas.dataset.bookChapter = chapter || 'turning';
    if (!calledReady.current) {calledReady.current = true; onReady?.();}
  }, -1);
  const cloth = {map: maps.linen, normalMap: maps.normal, normalScale: new THREE.Vector2(.19, .19), roughnessMap: maps.rough, roughness: .97, metalness: 0, sheen: .18, sheenColor: '#eadfc7'};
  const wine = {color: '#572038', normalMap: maps.normal, normalScale: new THREE.Vector2(.16, .16), roughnessMap: maps.rough, roughness: .96, sheen: .28, sheenColor: '#b07783'};
  const foil = {color: '#d4b87b', metalness: .86, roughness: .34, envMapIntensity: 1.2};
  const portrait = size.width / size.height < 1.1;
  return <>
    <ambientLight intensity={.38}/><hemisphereLight args={['#f6edda', '#382a2b', 1.2]}/>
    <spotLight position={[-3, 7, 8]} intensity={130} angle={.48} penumbra={.85} decay={2} castShadow shadow-mapSize-width={quality === 'cinema' ? 2048 : 1024} shadow-mapSize-height={quality === 'cinema' ? 2048 : 1024} shadow-bias={-.0003} color="#fff0d3"/>
    <directionalLight position={[4, 2, -2]} intensity={2} color="#c9d8e5"/>
    <Environment resolution={256}><Lightformer position={[-4, 5, 6]} rotation-y={.45} scale={[4, 8, 1]} intensity={2.1} color="#fff4dc"/><Lightformer position={[5, 1, 4]} rotation-y={-.6} scale={[3, 6, 1]} intensity={1.1} color="#d7e5ef"/><Lightformer position={[0, 4, -3]} scale={[6, 3, 1]} intensity={1.5} color="#e8d3aa"/></Environment>
    <group ref={book}>
      <RoundedBox args={[W, H, .15]} radius={.045} smoothness={4} position={[0, 0, -.43]} castShadow receiveShadow><meshPhysicalMaterial {...cloth}/></RoundedBox>
      <PaperBlock/>
      <mesh position={[.012, 0, .306]} receiveShadow><planeGeometry args={[PW, PH]}/><meshStandardMaterial map={maps.end} bumpMap={maps.fibre} bumpScale={.0017} roughness={.9}/></mesh>
      {[maps.origins, maps.library, maps.collections].map((front, index) => <CurvedLeaf key={index} index={index} motion={frameMotion} front={front} back={maps.backs[index]} fibre={maps.fibre}/>)}
      <RoundedBox args={[.24, H + .015, .83]} radius={.075} smoothness={5} position={[-W / 2 + .014, 0, -.025]} castShadow receiveShadow><meshPhysicalMaterial {...wine}/></RoundedBox>
      <ClothStitches/>
      {[-1, 1].map(side => <group key={side} position={[-W / 2 + .08, side * (PH / 2 + .015), -.02]}>{Array.from({length: 12}, (_, i) => <mesh key={i} position={[0, 0, -.30 + i * .055]}><cylinderGeometry args={[.018, .018, .16, 5]}/><meshStandardMaterial color={i % 2 ? '#cab58a' : '#642b3d'} roughness={.9}/></mesh>)}</group>)}
      <group ref={cover} position={[-W / 2, 0, .415]}>
        <RoundedBox args={[W, H, .14]} radius={.045} smoothness={5} position={[W / 2, 0, 0]} castShadow receiveShadow><meshPhysicalMaterial {...cloth}/></RoundedBox>
        <RoundedBox args={[.115, H - .01, .15]} radius={.026} smoothness={3} position={[.055, 0, -.002]} castShadow><meshPhysicalMaterial {...wine}/></RoundedBox>
        <mesh position={[W / 2, 0, .072]}><planeGeometry args={[W - .045, H - .045]}/><meshPhysicalMaterial {...foil} alphaMap={maps.foil} transparent alphaTest={.08} bumpMap={maps.foil} bumpScale={.0014} depthWrite={false}/></mesh>
        <EmbossedName/>
        <mesh position={[W / 2, 0, -.072]} rotation-y={Math.PI} receiveShadow><planeGeometry args={[W - .14, H - .14]}/><meshStandardMaterial map={maps.endpaper} bumpMap={maps.fibre} bumpScale={.002} roughness={.93}/></mesh>
      </group>
      <Ribbon/>
      {hotspot && <Html transform position={[.04, -1.46, .365]} distanceFactor={portrait ? 5.5 : 3.3} center zIndexRange={[18, 12]} style={{pointerEvents: active && !paused ? 'auto' : 'none'}}><button onClick={() => onChapter?.(hotspot)} style={{appearance: 'none', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 13px', border: '1px solid #a38750', borderRadius: 2, background: '#64213a', color: '#f7edda', boxShadow: '0 3px 8px #3a221b33', cursor: 'pointer', font: '500 12px/1.3 Manrope,Arial,sans-serif', whiteSpace: 'nowrap'}} aria-label={`Explorar ${hotspot === 'origins' ? 'as origens de Harvard' : hotspot === 'library' ? 'a biblioteca' : 'o acervo'}`}>Explorar este capítulo<svg viewBox="0 0 24 24" fill="none" width="15" height="15" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.3"/></svg></button></Html>}
    </group>
    <ContactShadows position={[0, -2.65, 0]} opacity={.36} scale={11} blur={2.8} far={6} resolution={quality === 'cinema' ? 768 : 512} color="#24131e" frames={active && !paused ? Infinity : 1}/>
  </>;
}

function VolumeFallback({onReady, onChapter, error = "WebGL context unavailable"}) {
  useEffect(() => {onReady?.();}, [onReady]);
  return <div role="status" data-book-error={error} style={{display: 'grid', placeContent: 'center', height: '100%', textAlign: 'center', color: '#eee3cc', gap: 18, font: '14px Manrope,Arial,sans-serif'}}><p>O volume não pôde ser exibido neste navegador.</p><button onClick={() => onChapter?.('origins')} style={{padding: 12, border: '1px solid #a88d59', color: 'inherit', background: '#602139', cursor: 'pointer'}}>Abrir o conteúdo do volume</button></div>;
}

class VolumeBoundary extends React.Component {
  state = {failed: false};
  static getDerivedStateFromError(error) {return {failed: true, message: error?.message || String(error)};}
  render() {return this.state.failed ? <VolumeFallback onReady={this.props.onReady} onChapter={this.props.onChapter} error={this.state.message}/> : this.props.children;}
}

/** A true 3D, scroll-driven clothbound volume. motion.progress is BOOK-LOCAL 0..1. */
export default function AcademicVolume3D({motion, quality = 'high', reduced = false, paused = false, active = true, onReady, onChapter}) {
  const profile = useViewportRenderQuality(quality);
  const stableMotion = useRef({progress: 0});
  return <VolumeBoundary onReady={onReady} onChapter={onChapter}><Canvas dpr={profile.dpr} shadows={{type: THREE.PCFSoftShadowMap}} frameloop={active ? 'always' : 'demand'} camera={{position: [7, 5, 10], fov: 36, near: .04, far: 60}} gl={{alpha: true, antialias: true, powerPreference: 'high-performance'}} style={{width: '100%', height: '100%'}} fallback={<span>Livro tridimensional de Harvard. Use os capítulos abaixo ou abra o índice para ler o conteúdo.</span>} onCreated={({gl}) => {gl.setClearColor('#000000', 0); gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05;}}><Suspense fallback={null}><VolumeScene motion={motion || stableMotion.current} quality={quality} reduced={reduced} paused={paused} active={active} onReady={onReady} onChapter={onChapter}/></Suspense></Canvas></VolumeBoundary>;
}
