import React,{Suspense,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import LoopingFilm from './LoopingFilm';
import {createQuietScore} from './QuietScore';
import ArchiveEditorial from './ArchiveEditorial';
import {usePersistentRenderQuality,useViewportRenderQuality} from './RenderQuality';
import './styles.css';
import './HarvardJourney.css';
gsap.registerPlugin(ScrollTrigger);
const GoogleCampusAtlas=React.lazy(()=>import('./GoogleCampusAtlas'));
const HarvardArchiveWorld=React.lazy(()=>import('./HarvardArchiveWorld'));
const HarvardAlbum3D=React.lazy(()=>import('./HarvardAlbum3D'));
const AlbumVolumeReader=React.lazy(()=>import('./AlbumVolumeReader'));
const KEY=import.meta.env.DEV?(import.meta.env.VITE_GOOGLE_MAPS_DEMO_KEY||''):'';
const clamp=n=>Math.max(0,Math.min(1,n));
const range=(a,b,n)=>clamp((n-a)/(b-a));
const smooth=(a,b,n)=>{const t=range(a,b,n);return t*t*(3-2*t);};
const FILM='https://college.harvard.edu/sites/default/files/2024-04/Webpage%20Landing%20Cut%20%28Campus%29_v2.mp4';
const CHAPTERS=[{id:'cover',at:0,label:'A chegada'},{id:'campus',at:.19,label:'O campus'},{id:'world',at:.58,label:'O ateliê'},{id:'album',at:.93,label:'O álbum'}];
const VOLUMES=[
 {id:'origins',title:'As origens',kicker:'I / 1636',description:'As origens de Harvard e o começo de uma história de conhecimento.',image:'/assets/widener-4k.jpg',source:'https://www.harvard.edu/about/history/',sourceName:'Harvard University · História'},
 {id:'library',title:'A biblioteca',kicker:'II / OS LUGARES',description:'A Widener e a luz da Loker Reading Room, em fotografias originais.',image:'/assets/loker-4k.jpg',source:'https://library.harvard.edu/libraries/widener',sourceName:'Harvard Library · Widener'},
 {id:'architecture',title:'Arquitetura',kicker:'III / FORMA E MEMÓRIA',description:'Observar os edifícios, seus ritmos, materiais e histórias.',image:'/assets/memorial-church-front.jpg',source:'https://memorialchurch.harvard.edu/history-0',sourceName:'Harvard · Memorial Church'},
 {id:'collections',title:'O acervo',kicker:'IV / ENTRE PÁGINAS',description:'Livros, coleções e caminhos de pesquisa na Harvard Library.',image:'/assets/loker-4k.jpg',source:'https://library.harvard.edu/collections/gutenberg-bible',sourceName:'Harvard Library · Gutenberg Bible'},
 {id:'campus',title:'O campus',kicker:'V / CAMBRIDGE',description:'Lugares e perspectivas para continuar descobrindo Harvard.',image:'/assets/widener-4k.jpg',source:'https://www.harvard.edu/visit/maps-directions/',sourceName:'Harvard University · Mapas'},
 {id:'research',title:'Novas ideias',kicker:'VI / DESCOBRIR',description:'Uma pergunta, uma fonte, uma nova possibilidade de leitura.',image:'/assets/loker-4k.jpg',source:'https://www.harvard.edu/in-focus/',sourceName:'Harvard University · In Focus'},
];
function Shield(){return <svg viewBox="0 0 50 60" aria-hidden="true" fill="none"><path d="M3 3h44v27c0 14-22 27-22 27S3 44 3 30V3Z" stroke="currentColor" strokeWidth="1.5"/><path d="M10 12h13v12H10zM27 12h13v12H27zM18 31h14v12H18z" stroke="currentColor"/><path d="M16.5 12v12m17-12v12M25 31v12" stroke="currentColor"/><text x="16.5" y="21" textAnchor="middle">VE</text><text x="33.5" y="21" textAnchor="middle">RI</text><text x="25" y="40" textAnchor="middle">TAS</text></svg>;}
function Arrow(){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.3"/></svg>;}
function Speaker({muted}){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m11 4-6 5H2v6h3l6 5V4Z" stroke="currentColor" strokeWidth="1.3"/>{muted?<path d="m16 9 6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.3"/>:<path d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14" stroke="currentColor" strokeWidth="1.3"/>}</svg>;}
class SceneBoundary extends React.Component{state={failed:false};static getDerivedStateFromError(){return{failed:true};}componentDidCatch(){this.props.onError?.();}render(){return this.state.failed?this.props.fallback||null:this.props.children;}}

export default function HarvardJourneyApp(){
 const root=useRef(),track=useRef(),lenis=useRef(),menuRef=useRef(),settingsRef=useRef(),aboutRef=useRef(),readerRef=useRef(),filmRef=useRef(),videoRef=useRef();
 const mapMotion=useRef({progress:0,pointerX:0,pointerY:0}).current,photoMotion=useRef({progress:0,pointerX:0,pointerY:0}).current,albumMotion=useRef({progress:0,pointerX:0,pointerY:0}).current;
 const score=useMemo(()=>createQuietScore(),[]),[quality,setQuality]=usePersistentRenderQuality('auto'),profile=useViewportRenderQuality(quality);
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion:reduce)').matches),reducedRef=useRef(reduced);
 const [phase,setPhase]=useState('cover'),[mapReady,setMapReady]=useState(false),[mapFailed,setMapFailed]=useState(false),[photoReady,setPhotoReady]=useState(false),[posterReady,setPosterReady]=useState(false);
 const [worldMounted,setWorldMounted]=useState(false),[albumMounted,setAlbumMounted]=useState(false);
 const [paused,setPaused]=useState(false),[sound,setSound]=useState(false),[volume,setVolume]=useState(.32),[notice,setNotice]=useState('');
 const [menu,setMenu]=useState(false),[settings,setSettings]=useState(false),[about,setAbout]=useState(false),[reader,setReader]=useState(null),[film,setFilm]=useState(false);
 const modal=menu||settings||about||Boolean(reader)||film;
 const onMapReady=useCallback(()=>setMapReady(true),[]),onMapError=useCallback(()=>setMapFailed(true),[]),onPhotoReady=useCallback(()=>setPhotoReady(true),[]),openVolume=useCallback(id=>setReader(id),[]);
 // Warm the next chapter while it approaches, then retain its scene and clock.
 // The opening film should not compete with two hidden WebGL scenes and models.
 useEffect(()=>{if(phase==='campus'||phase==='world'||phase==='passage')setWorldMounted(true);if(phase==='passage'||phase==='album')setAlbumMounted(true);},[phase]);
 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion:reduce)'),change=e=>setReduced(e.matches);m.addEventListener('change',change);return()=>m.removeEventListener('change',change);},[]);
 useEffect(()=>{reducedRef.current=reduced;if(lenis.current)lenis.current.options.smoothWheel=!reduced;},[reduced]);
 useEffect(()=>{
  const controller=new Lenis({duration:.78,smoothWheel:!reducedRef.current,syncTouch:false});lenis.current=controller;controller.on('scroll',ScrollTrigger.update);
  let target=0,current=0,lastPhase='cover';
  const sync=self=>{target=self.progress;};
  const trigger=ScrollTrigger.create({trigger:track.current,start:'top top',end:'bottom bottom',onUpdate:sync,onRefresh:sync});sync(trigger);current=target;
  const tick=(time,delta)=>{
   controller.raf(time*1000);const dt=Math.min((delta||16.667)/1000,.08);
   current=reducedRef.current?target:current+(target-current)*(1-Math.exp(-15*dt));if(Math.abs(current-target)<.00002)current=target;
   mapMotion.progress=range(.065,.39,current);photoMotion.progress=range(.38,.865,current);albumMotion.progress=range(.865,1,current);
   const next=current<.075?'cover':current<.38?'campus':current<.72?'world':current<.865?'passage':'album';if(lastPhase!==next){lastPhase=next;setPhase(next);}
   const el=root.current;if(!el)return;
   const values={ '--j-hero':1-smooth(.025,.078,current),'--j-map':smooth(.035,.085,current)*(1-smooth(.355,.415,current)),'--j-photo':smooth(.355,.415,current)*(1-smooth(.855,.885,current)),'--j-album':smooth(.855,.885,current),'--j-progress':current,'--j-photo-exit':smooth(.82,.88,current),'--j-map-copy':smooth(.095,.13,current)*(1-smooth(.29,.37,current)),'--j-church-copy':smooth(.42,.47,current)*(1-smooth(.65,.70,current)),'--j-drawer-cue':smooth(.704,.723,current)*(1-smooth(.775,.805,current)),'--j-portal':0};
   for(const[name,value]of Object.entries(values))el.style.setProperty(name,value);
   el.dataset.journeyProgress=current.toFixed(4);el.dataset.mapProgress=mapMotion.progress.toFixed(4);el.dataset.photoProgress=photoMotion.progress.toFixed(4);el.dataset.albumProgress=albumMotion.progress.toFixed(4);
  };gsap.ticker.add(tick);gsap.ticker.lagSmoothing(0);
  const resize=()=>{const progress=target;ScrollTrigger.refresh();controller.scrollTo(track.current.offsetTop+(track.current.offsetHeight-innerHeight)*progress,{immediate:true,force:true});ScrollTrigger.update();};addEventListener('resize',resize,{passive:true});
  return()=>{gsap.ticker.remove(tick);trigger.kill();controller.destroy();removeEventListener('resize',resize);};
 },[mapMotion,photoMotion,albumMotion]);
 useEffect(()=>{if(modal)lenis.current?.stop();else lenis.current?.start();},[modal]);
 useEffect(()=>{for(const[ref,open]of[[menuRef,menu],[settingsRef,settings],[aboutRef,about],[readerRef,Boolean(reader)],[filmRef,film]]){const d=ref.current;if(open&&!d.open)d.showModal();else if(!open&&d.open)d.close();}if(film)videoRef.current?.play().catch(()=>{});else videoRef.current?.pause();},[menu,settings,about,reader,film]);
 useEffect(()=>{score.setVolume(volume);},[score,volume]);
 useEffect(()=>{const update=()=>{if(sound&&!paused&&!reader&&!film&&!document.hidden)score.start().catch(()=>{setSound(false);setNotice('Toque em Música para iniciar o som.');});else score.stop();};update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[score,sound,paused,reader,film]);
 useEffect(()=>()=>score.dispose(),[score]);
 const go=p=>{setMenu(false);setReader(null);lenis.current?.start();lenis.current?.scrollTo(track.current.offsetTop+(track.current.offsetHeight-innerHeight)*p,{duration:reduced?0:1.05,immediate:reduced,force:true});};
 const toggleMusic=async()=>{setNotice('');if(sound){score.stop();setSound(false);}else{try{await score.start();setSound(true);}catch{setNotice('Toque novamente para iniciar a música.');}}};
 const pointer=e=>{const x=e.clientX/innerWidth*2-1,y=1-e.clientY/innerHeight*2;mapMotion.pointerX=photoMotion.pointerX=albumMotion.pointerX=x;mapMotion.pointerY=photoMotion.pointerY=albumMotion.pointerY=y;};
 const inWorld=phase==='world'||phase==='passage',headerHidden=phase==='album'||phase==='passage';
 const photoActive=inWorld&&!modal,albumActive=phase==='album'&&!modal;
 return <div ref={root} className={`experience harvard-journey is-${phase} ${reduced?'reduced':''} ${paused?'ambient-paused':''}`}>
  <a className="skip" href="#journey-controls">Pular para os controles</a>
  <header className="header" aria-hidden={headerHidden} inert={headerHidden||undefined}><button className="brand" onClick={()=>go(0)} aria-label="Harvard, voltar ao início"><Shield/><span>HARVARD<small>THE PURSUIT OF POSSIBILITY</small></span></button><nav className="navigation" aria-label="Principal"><button onClick={()=>go(.19)}>O campus <span>↗</span></button><button onClick={()=>go(.93)}>O álbum</button><button onClick={()=>setAbout(true)}>Sobre a experiência</button></nav><button className="menu-toggle" aria-expanded={menu} onClick={()=>setMenu(true)}>Menu <span>+</span></button></header>
  <main><div ref={track} className="hj-track"><section className="hj-stage" aria-label="Uma jornada por Harvard controlada pelo scroll" onPointerMove={pointer} onPointerLeave={()=>{photoMotion.pointerX=photoMotion.pointerY=0;}}>
   <div className="hj-hero-layer" aria-hidden={phase!=='cover'}><LoopingFilm src="/assets/harvard-cinematic.mp4" poster="/assets/harvard-cinematic-poster.jpg" active={phase==='cover'&&!paused&&!modal} reducedMotion={reduced} onPosterReady={()=>setPosterReady(true)}/><div className="film-shade"/></div>
   <div className="hj-map-layer" aria-hidden={phase!=='campus'} inert={phase!=='campus'||undefined}><img className="hj-map-backup" src="/assets/widener-4k.jpg" alt=""/>{KEY&&!mapFailed&&<SceneBoundary onError={onMapError}><Suspense fallback={null}><GoogleCampusAtlas apiKey={KEY} motion={mapMotion} active={(phase==='cover'||phase==='campus')&&!modal} onReady={onMapReady} onError={onMapError} onSelect={id=>{if(id==='church')go(.58);else setReader(id==='yard'?'origins':'architecture');}}/></Suspense></SceneBoundary>}{(!KEY||mapFailed)&&<div className="hj-map-unavailable"><p>O álbum de Harvard está à sua espera.</p><button onClick={()=>go(.58)}>Explorar o ateliê de ideias <Arrow/></button></div>}</div>
   <div className="hj-world-layer" aria-hidden={!inWorld} inert={!inWorld||undefined}><SceneBoundary fallback={<button className="hj-direct-reader" onClick={()=>go(.93)}>Abrir o álbum de Harvard <Arrow/></button>}><Suspense fallback={<p className="hj-preparing">Construindo novos caminhos…</p>}>{worldMounted&&<HarvardArchiveWorld motion={photoMotion} active={photoActive} quality={quality} reduced={reduced} paused={paused} onReady={onPhotoReady} onSelect={openVolume}/>}</Suspense></SceneBoundary></div>
   <div className="hj-album-layer" aria-hidden={phase!=='album'} inert={phase!=='album'||undefined}><SceneBoundary fallback={<button className="hj-direct-reader" onClick={()=>openVolume('origins')}>Abrir as histórias de Harvard <Arrow/></button>}><Suspense fallback={<p className="hj-preparing">Preparando o álbum…</p>}>{albumMounted&&<HarvardAlbum3D motion={albumMotion} quality={quality} reduced={reduced} paused={paused} active={albumActive} onVolume={openVolume}/>}</Suspense></SceneBoundary></div>
   <div className={`intro-copy scene-copy ${phase==='cover'?'visible':''}`} aria-hidden={phase!=='cover'} inert={phase!=='cover'||undefined}><p className="eyebrow">A CURIOSIDADE NOS MOVE.</p><h1>Harvard<span>.</span></h1><h2>Um lugar para imaginar<br/><em>o que vem a seguir.</em></h2><p className="caption">Uma jornada por ideias, histórias e possibilidades.</p><button className="begin-button" tabIndex={phase==='cover'?0:-1} onClick={()=>go(.13)}>Entre na história <Arrow/></button></div>
   <div className="hj-map-copy" aria-hidden={phase!=='campus'} inert={phase!=='campus'||undefined}><p className="hj-kicker">01 / UM LUGAR DE POSSIBILIDADES</p><h2>Um novo<br/><em>ponto de vista.</em></h2><p>Entre os caminhos do Yard,<br/>a curiosidade encontra seu lugar.</p><button tabIndex={phase==='campus'?0:-1} onClick={()=>go(.58)}>Conheça o ateliê de ideias <Arrow/></button></div>
   <ArchiveEditorial phase={phase}/>
   <div className="hj-arrival-type" aria-hidden="true"><span>Uma história abre outra.</span><small>HARVARD · UM ATLAS DE IDEIAS</small></div>
   {phase==='campus'&&!mapReady&&!mapFailed&&KEY&&<p className="hj-loading" role="status">Revelando Harvard…</p>}
   <div className={`loading-screen ${posterReady?'ready':''}`} aria-hidden={posterReady}><Shield/><span>HARVARD</span><p>A curiosidade nos move.</p><i/></div>
  </section></div></main>
  <footer className="hj-footer"><span>UM ESTUDO DE GUILHERME GALVÃO · HARVARD</span><button onClick={()=>go(.19)}>Rever o campus <Arrow/></button><button onClick={()=>setAbout(true)}>Fontes e créditos ↗</button></footer>
  <div className="hj-controls" id="journey-controls"><button className="hj-sound" aria-pressed={sound} onClick={toggleMusic}><Speaker muted={!sound}/><span>{sound?'Música ligada':'Música ambiente'}</span></button><nav aria-label="Etapas da jornada">{CHAPTERS.map((c,i)=><button key={c.id} aria-label={c.label} aria-current={(phase===c.id||(c.id==='world'&&phase==='passage'))?'step':undefined} onClick={()=>go(c.at)}><span>0{i+1}</span><i/><b>{c.label}</b></button>)}</nav><div className="hj-options"><button aria-label={paused?'Retomar movimento ambiente':'Pausar movimento ambiente'} onClick={()=>setPaused(!paused)}>{paused?'▷':'Ⅱ'}</button><button onClick={()=>setSettings(true)}>{quality==='cinema'?'Cinema':quality==='high'?'Alta':'Ajustes'} <span>◦</span></button></div></div>
  {notice&&<button className="hj-notice" role="status" onClick={()=>setNotice('')}>{notice} ×</button>}
  <dialog ref={menuRef} className="modal hj-menu" data-lenis-prevent onCancel={()=>setMenu(false)} onClose={()=>setMenu(false)}><button className="modal-close" aria-label="Fechar menu" onClick={()=>setMenu(false)}>×</button><p className="hj-kicker">ESCOLHA SEU CAMINHO</p>{CHAPTERS.map(c=><button key={c.id} className="hj-menu-link" onClick={()=>go(c.at)}>{c.label}<Arrow/></button>)}</dialog>
  <dialog ref={settingsRef} className="modal hj-settings" data-lenis-prevent onCancel={()=>setSettings(false)} onClose={()=>setSettings(false)}><button className="modal-close" aria-label="Fechar ajustes" onClick={()=>setSettings(false)}>×</button><p className="hj-kicker">NO SEU RITMO</p><h2>O seu<br/><em>ponto de vista.</em></h2><label className="setting-row"><span>Qualidade da cena e do álbum<small>A escolha permanece ao rolar.</small></span><select value={quality} onChange={e=>setQuality(e.target.value)}><option value="auto">Automática</option><option value="high">Alta</option><option value="cinema">Cinema · máxima</option></select></label><p className="resolution-readout">Renderização: {profile.renderWidth} × {profile.renderHeight} px.</p><label className="setting-row"><span>Música</span><input aria-label="Volume da música" type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label><label className="setting-row"><span>Movimento reduzido</span><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/></label></dialog>
  <dialog ref={aboutRef} className="modal hj-about" data-lenis-prevent onCancel={()=>setAbout(false)} onClose={()=>setAbout(false)}><button className="modal-close" aria-label="Fechar créditos" onClick={()=>setAbout(false)}>×</button><p className="hj-kicker">UM ATLAS DE IDEIAS</p><h2>Uma nova<br/><em>perspectiva.</em></h2><p>Uma experiência editorial independente de Guilherme Galvão, sem vínculo institucional com Harvard University.</p><p>{KEY?'O panorama utiliza imagens geográficas reais de Google Maps em uma demonstração local. As imagens não representam trânsito ao vivo.':'O mapa geográfico da demonstração é exclusivo da prévia local.'}</p><p>O ateliê é um cenário artístico autoral: reúne arquitetura, leitura e arquivo em um pequeno mundo animado. Não representa um interior original de Harvard. O álbum e os seis volumes são objetos tridimensionais interativos. As fotografias nos livros mostram lugares reais.</p><p>A capa conserva o filme temático aprovado anteriormente. A música opcional é uma composição original, inspirada em cordas dedilhadas e flauta.</p><div className="credit-links"><a href="/assets/CREDITS-atlas.md" target="_blank" rel="noopener noreferrer">Autoria, fontes e licenças ↗</a><a href="/assets/study-devices/CREDITS.md" target="_blank" rel="noopener noreferrer">Dispositivos e mochilas · modelos licenciados ↗</a><a href="/assets/ready-models/CREDITS.md" target="_blank" rel="noopener noreferrer">Pessoas, plantas e livros · modelos CC0 ↗</a><a href="/assets/warehouse-models/CREDITS.md" target="_blank" rel="noopener noreferrer">Recebimento e empilhadeira · modelos CC0 ↗</a><a href="/assets/kenney-conveyor/CREDITS.md" target="_blank" rel="noopener noreferrer">Scanner e esteiras · modelos CC0 ↗</a><a href="/assets/collection-models/CREDITS.md" target="_blank" rel="noopener noreferrer">Mobiliário e luminárias · modelos CC0 ↗</a><a href="https://www.figma.com/design/5JLgqQ96GqZeNzydUQIA0K?node-id=3-2" target="_blank" rel="noopener noreferrer">Direção editorial no Figma ↗</a><a href="/assets/CREDITS-memorial-church.md" target="_blank" rel="noopener noreferrer">Fotografias da Memorial Church ↗</a><a href="https://memorialchurch.harvard.edu/" target="_blank" rel="noopener noreferrer">The Memorial Church · Harvard ↗</a></div></dialog>
  <dialog ref={readerRef} className="hj-reader-dialog" data-lenis-prevent onCancel={()=>setReader(null)} onClose={()=>setReader(null)}><button className="hj-reader-close" aria-label="Fechar o livro e voltar à cena" onClick={()=>setReader(null)}>Voltar à cena <span>×</span></button><Suspense fallback={<p className="hj-preparing">Abrindo o volume…</p>}>{reader&&<AlbumVolumeReader key={reader} volume={VOLUMES.find(v=>v.id===reader)||VOLUMES[0]} reduced={reduced} onClose={()=>setReader(null)} onOpenMedia={()=>{setReader(null);setFilm(true);}}/>}</Suspense></dialog>
  <dialog ref={filmRef} className="film-dialog" data-lenis-prevent onCancel={()=>setFilm(false)} onClose={()=>setFilm(false)}><button className="film-close" aria-label="Fechar filme" onClick={()=>setFilm(false)}>×</button>{film&&<video ref={videoRef} src={FILM} controls playsInline/>}<p>Filme oficial de Harvard College, apresentado sem edição. A faixa original é silenciosa.</p></dialog>
 </div>;
}
