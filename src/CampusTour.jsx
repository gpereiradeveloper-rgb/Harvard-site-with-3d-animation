import React, { Component, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import './CampusTour.css';

const PANORAMA_8K = '/assets/harvard-yard-8k.jpg';
const PANORAMA_4K = '/assets/harvard-yard-4k.jpg';
const SOURCE = 'https://commons.wikimedia.org/wiki/File:Harvard_Yard,_February_2022_3.jpg';
const INITIAL_YAW = 0;
const initialPosition = [Math.cos(INITIAL_YAW) * .1, 0, Math.sin(INITIAL_YAW) * .1];

class TourBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function UnsupportedCanvas({ onError }) {
  useEffect(() => { onError(); }, [onError]);
  return null;
}

function Panorama({ controlsRef, rotating, reducedMotion, onStatus }) {
  const { gl, invalidate } = useThree();
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    let alive = true;
    let ownedTexture;
    let attemptId = 0;
    let deadline;
    const smallScreen = matchMedia('(max-width: 760px)').matches;
    const saveData = Boolean(navigator.connection?.saveData);
    const limitedMemory = navigator.deviceMemory && navigator.deviceMemory < 8;
    const highResolution = gl.capabilities.maxTextureSize >= 8192 && !smallScreen && !saveData && !limitedMemory;
    const loader = new THREE.TextureLoader();
    const load = (url, quality) => {
      const attempt = ++attemptId;
      clearTimeout(deadline);
      const fail = () => {
        if (!alive || attempt !== attemptId) return;
        clearTimeout(deadline);
        if (url === PANORAMA_8K) load(PANORAMA_4K, '4K');
        else {
          attemptId += 1;
          onStatus({ phase: 'error', message: 'O panorama não carregou. Você pode tentar novamente ou continuar explorando o site.' });
        }
      };
      deadline = setTimeout(fail, quality === '8K' ? 35000 : 25000);
      loader.load(url, loaded => {
        if (!alive || attempt !== attemptId) { loaded.dispose(); return; }
        clearTimeout(deadline);
        loaded.colorSpace = THREE.SRGBColorSpace;
        // The panorama is viewed from inside the sphere; undo the horizontal mirror.
        loaded.wrapS = THREE.RepeatWrapping;
        loaded.repeat.x = -1;
        loaded.offset.x = 1;
        loaded.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
        ownedTexture = loaded;
        setTexture(loaded);
        onStatus({ phase: 'ready', quality });
        invalidate();
      }, undefined, fail);
    };
    onStatus({ phase: 'loading', quality: highResolution ? '8K' : '4K' });
    load(highResolution ? PANORAMA_8K : PANORAMA_4K, highResolution ? '8K' : '4K');
    const contextLost = event => {
      event.preventDefault();
      if (alive) onStatus({ phase: 'error', message: 'A visualização interativa foi interrompida. A fotografia continua disponível abaixo.' });
    };
    gl.domElement.addEventListener('webglcontextlost', contextLost);
    return () => {
      alive = false;
      clearTimeout(deadline);
      attemptId += 1;
      gl.domElement.removeEventListener('webglcontextlost', contextLost);
      ownedTexture?.dispose();
    };
  }, [gl, invalidate, onStatus]);

  useEffect(() => { invalidate(); }, [rotating, invalidate]);

  return <>
    {texture && <mesh>
      <sphereGeometry args={[500, 80, 48]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
    </mesh>}
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableZoom={false}
      enablePan={false}
      enableDamping={!reducedMotion}
      dampingFactor={.075}
      rotateSpeed={-.32}
      autoRotate={rotating}
      autoRotateSpeed={.32}
      minPolarAngle={.24}
      maxPolarAngle={Math.PI - .24}
      target={[0, 0, 0]}
    />
  </>;
}

/** Real equirectangular panorama, not a video or a reconstructed campus model. */
export default function CampusTour({ open, onClose, reducedMotion = false }) {
  const dialogRef = useRef(), closeRef = useRef(), controlsRef = useRef(), previousFocus = useRef();
  const [status, setStatus] = useState({ phase: 'loading', quality: '8K' });
  const [rotating, setRotating] = useState(false), [retry, setRetry] = useState(0), [posterFailed, setPosterFailed] = useState(false);
  const onStatus = useCallback(next => setStatus(next), []);
  const canvasError = useCallback(() => setStatus({ phase: 'error', message: 'Este navegador não pôde iniciar a vista interativa. Você ainda pode apreciar a fotografia e visitar o site oficial.' }), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    let frame;
    if (open) {
      previousFocus.current = document.activeElement;
      setStatus({ phase: 'loading', quality: '8K' });
      setRotating(false);
      setPosterFailed(false);
      if (!dialog.open) dialog.showModal();
      frame = requestAnimationFrame(() => closeRef.current?.focus());
    } else {
      if (dialog.open) dialog.close();
      setStatus({ phase: 'loading', quality: '8K' });
      previousFocus.current?.focus?.({ preventScroll: true });
    }
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (dialog.open) dialog.close();
      if (open) previousFocus.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => { if (reducedMotion) setRotating(false); }, [reducedMotion]);

  const recenter = () => {
    setRotating(false);
    controlsRef.current?.reset();
  };
  const handleKeys = event => {
    if (event.target.closest('button, a')) return;
    const controls = controlsRef.current;
    if (!controls || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    setRotating(false);
    if (event.key === 'Home') { controls.reset(); return; }
    const step = .11;
    if (event.key === 'ArrowLeft') controls.setAzimuthalAngle(controls.getAzimuthalAngle() + step);
    if (event.key === 'ArrowRight') controls.setAzimuthalAngle(controls.getAzimuthalAngle() - step);
    if (event.key === 'ArrowUp') controls.setPolarAngle(controls.getPolarAngle() - step);
    if (event.key === 'ArrowDown') controls.setPolarAngle(controls.getPolarAngle() + step);
    controls.update();
  };
  const tryAgain = () => {
    setStatus({ phase: 'loading', quality: '8K' });
    setRetry(value => value + 1);
  };

  return <dialog
    ref={dialogRef}
    className="tour-dialog"
    aria-labelledby="tour-title"
    aria-describedby="tour-instructions"
    data-lenis-prevent
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={() => { if (open) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
  >
    {open && <div className="tour-shell">
      <div className="tour-view" tabIndex={0} role="region" aria-label="Panorama interativo de Harvard Yard" onKeyDown={handleKeys}>
        {!posterFailed && <img className={'tour-poster ' + (status.phase === 'ready' ? 'tour-poster-hidden' : '')} src={PANORAMA_4K} alt="Vista panorâmica de Harvard Yard no inverno" onError={() => setPosterFailed(true)} />}
        {status.phase !== 'error' && <TourBoundary key={retry} onError={canvasError}>
          <Canvas
            className={'tour-canvas ' + (status.phase === 'ready' ? 'tour-canvas-ready' : '')}
            frameloop={reducedMotion && !rotating ? 'demand' : 'always'}
            dpr={[1, 2]}
            camera={{ position: initialPosition, fov: 74, near: .01, far: 1000 }}
            gl={{ antialias: false, alpha: true, powerPreference: 'default' }}
            fallback={<UnsupportedCanvas onError={canvasError} />}
          >
            <Panorama controlsRef={controlsRef} rotating={rotating} reducedMotion={reducedMotion} onStatus={onStatus} />
          </Canvas>
        </TourBoundary>}
      </div>

      <div className="tour-edge tour-edge-top" aria-hidden="true" />
      <div className="tour-edge tour-edge-bottom" aria-hidden="true" />
      <header className="tour-heading">
        <p className="tour-kicker">PANORAMA 360° <i /> FONTE 8K</p>
        <h2 id="tour-title">Harvard Yard,<br /><em>em todas as direções.</em></h2>
      </header>
      <button ref={closeRef} className="tour-close" type="button" aria-label="Fechar visita 360 graus" onClick={onClose}>×</button>

      {status.phase === 'loading' && <div className="tour-status" role="status"><span className="tour-loader" aria-hidden="true" />Preparando a vista panorâmica…</div>}
      {status.phase === 'error' && <div className="tour-error" role="status"><p>{status.message}</p><button type="button" onClick={tryAgain}>Tentar novamente <span aria-hidden="true">↻</span></button><a href="https://www.harvard.edu/visit/" target="_blank" rel="noopener noreferrer">Visite Harvard ↗</a></div>}

      <div className="tour-bottom">
        <div className="tour-guide" id="tour-instructions"><span className="tour-drag-icon" aria-hidden="true">↔</span><p>Arraste para olhar ao redor.<small>Também funciona com toque e setas do teclado.</small></p></div>
        <div className="tour-controls" aria-label="Controles do panorama">
          <button type="button" onClick={recenter} disabled={status.phase !== 'ready'}><span aria-hidden="true">⌖</span>Recentralizar</button>
          <button type="button" onClick={() => setRotating(value => !value)} disabled={status.phase !== 'ready'} aria-pressed={rotating}><span aria-hidden="true">{rotating ? 'Ⅱ' : '↻'}</span>{rotating ? 'Pausar giro' : 'Girar devagar'}</button>
        </div>
      </div>
      <div className="tour-credit"><span>FOTOGRAFIA REAL · FEVEREIRO DE 2022</span><a href={SOURCE} target="_blank" rel="noopener noreferrer">Sdkb / Wikimedia Commons</a><a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a><span className="tour-credit-note">Redimensionada e comprimida para a web.</span></div>
    </div>}
  </dialog>;
}
