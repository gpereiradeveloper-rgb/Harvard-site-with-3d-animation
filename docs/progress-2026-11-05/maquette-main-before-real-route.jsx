import React,{Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import LoopingFilm from './LoopingFilm';
import WidenerTour from './WidenerTour';
import {usePersistentRenderQuality,useViewportRenderQuality} from './RenderQuality';
import './styles.css';
const HarvardWorld=React.lazy(()=>import('./ArchiveWorld'));
gsap.registerPlugin(ScrollTrigger);
const OFFICIAL_FILM='https://college.harvard.edu/sites/default/files/2024-04/Webpage%20Landing%20Cut%20%28Campus%29_v2.mp4';
const clamp=n=>Math.min(1,Math.max(0,n)),smooth=(a,b,p)=>{const x=clamp((p-a)/(b-a));return x*x*(3-2*x);};
const CHAPTERS=[{name:'O começo',at:0},{name:'Entre na história',at:.22},{name:'O salão das ideias',at:.37},{name:'Dentro do livro',at:.60},{name:'Uma nova perspectiva',at:1}];
function Arrow({diagonal=false}){return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d={diagonal?'M5 19 19 5M5 5h14v14':'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.4"/></svg>;}
function Shield(){return <svg viewBox="0 0 50 60" aria-hidden="true" fill="none"><path d="M3 3h44v27c0 14-22 27-22 27S3 44 3 30V3Z" stroke="currentColor" strokeWidth="1.5"/><path d="M10 12h13v12H10zM27 12h13v12H27zM18 31h14v12H18z" stroke="currentColor"/><path d="M16.5 12v12m17-12v12M25 31v12" stroke="currentColor"/><text x="16.5" y="21" textAnchor="middle">VE</text><text x="33.5" y="21" textAnchor="middle">RI</text><text x="25" y="40" textAnchor="middle">TAS</text></svg>;}
function Speaker({muted=false}){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m11 4-6 5H2v6h3l6 5V4Z" stroke="currentColor" strokeWidth="1.3"/>{muted?<path d="m16 9 6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.3"/>:<path d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14" stroke="currentColor" strokeWidth="1.3"/>}</svg>;}
function Gear(){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z" stroke="currentColor" strokeWidth="1.2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.2"/></svg>;}
function App(){
 const track=useRef(),film=useRef(),worldLayer=useRef(),veil=useRef(),root=useRef(),lenis=useRef(),ambient=useRef(),player=useRef();
 const settingsDialog=useRef(),creditsDialog=useRef(),filmDialog=useRef();
 const motion=useRef({progress:0,pointerX:0,pointerY:0}).current;
 const readyRef=useRef(false),worldReadyRef=useRef(false),worldFailedRef=useRef(false),yardReadyRef=useRef(false),libraryReadyRef=useRef(false),modalRef=useRef(false),soundRef=useRef(false),volumeRef=useRef(.28);
 const [quality,setQuality]=usePersistentRenderQuality('high');const profile=useViewportRenderQuality(quality);
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion:reduce)').matches);
 const [chapter,setChapter]=useState(0),[visibleChapter,setVisibleChapter]=useState(0),[ink,setInk]=useState('light'),[progress,setProgress]=useState(0);
 const [posterReady,setPosterReady]=useState(false),[filmReady,setFilmReady]=useState(false),[worldReady,setWorldReady]=useState(false),[filmActive,setFilmActive]=useState(true);
 const [settings,setSettings]=useState(false),[credits,setCredits]=useState(false),[filmOpen,setFilmOpen]=useState(false),[menu,setMenu]=useState(false),[tourOpen,setTourOpen]=useState(false);
 const [sound,setSound]=useState(false),[volume,setVolume]=useState(.28),[audioNotice,setAudioNotice]=useState(''),[paused,setPaused]=useState(false),[worldError,setWorldError]=useState(false);
 const pausedRef=useRef(false),reducedRef=useRef(reduced);
 const onFilmReady=useCallback(()=>{readyRef.current=true;setFilmReady(true);},[]);
 const onWorldReady=useCallback(()=>{worldReadyRef.current=true;worldFailedRef.current=false;setWorldError(false);setWorldReady(true);},[]);
 const onWorldError=useCallback(()=>{worldFailedRef.current=true;setWorldError(true);},[]);
 const onPanoramaReady=useCallback(()=>{yardReadyRef.current=true;},[]);
 const onLibraryReady=useCallback(()=>{libraryReadyRef.current=true;},[]);
 useEffect(()=>{soundRef.current=sound;},[sound]);useEffect(()=>{volumeRef.current=volume;if(ambient.current)ambient.current.volume=volume;},[volume]);
 useEffect(()=>{pausedRef.current=paused;},[paused]);useEffect(()=>{reducedRef.current=reduced;if(lenis.current)lenis.current.options.smoothWheel=!reduced;},[reduced]);
 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion:reduce)'),f=e=>setReduced(e.matches);m.addEventListener('change',f);return()=>m.removeEventListener('change',f);},[]);
 useEffect(()=>{
  const l=new Lenis({duration:1.12,smoothWheel:!matchMedia('(prefers-reduced-motion:reduce)').matches,syncTouch:false});lenis.current=l;l.on('scroll',ScrollTrigger.update);
  let lastProgress=-1,frameP=0,requested=0,first=true;
  const sync=self=>{requested=self.progress;};
  const st=ScrollTrigger.create({trigger:track.current,start:'top top',end:'bottom bottom',onUpdate:sync,onRefresh:sync});sync(st);
  const ticker=(t,deltaMS)=>{
   l.raf(t*1000);
   const cap=worldFailedRef.current ? 1 : !worldReadyRef.current ? .035 : !yardReadyRef.current ? .64 : 1;
   const desired=Math.min(requested,cap),dt=Math.min((deltaMS||16.667)/1000,.1);
   if(first){frameP=desired;first=false;}else frameP=reducedRef.current?desired:frameP+Math.max(-dt*.25,Math.min(dt*.25,(desired-frameP)*(1-Math.exp(-14.9*dt))));
   motion.progress=frameP;
   const p=frameP,c=p<.13?0:p<.29?1:p<.47?2:p<.81?3:4;
   const alpha=worldReadyRef.current&&!worldFailedRef.current?smooth(.025,.12,p):0;
   if(worldLayer.current)worldLayer.current.style.opacity=String(alpha);
   if(veil.current)veil.current.style.opacity='0';
   if(Math.abs(lastProgress-p)>.0001){
    setChapter(c);setProgress(Math.round(p*100));setVisibleChapter(p<.08?0:p>.16&&p<.255?1:p>.32&&p<.42?2:p>.435&&p<.487?3:p>.978?4:-1);
    setInk(p>.66&&p<.81?'dark':'light');setFilmActive(p<.12);
    root.current?.style.setProperty('--progress',p);root.current?.style.setProperty('--film-exit',smooth(.09,.25,p));root.current?.style.setProperty('--book-focus',smooth(.30,.50,p));lastProgress=p;
   }
  };
  gsap.ticker.add(ticker);gsap.ticker.lagSmoothing(0);
  const pointer=e=>{motion.pointerX=e.clientX/innerWidth*2-1;motion.pointerY=1-e.clientY/innerHeight*2;};addEventListener('pointermove',pointer,{passive:true});
  const size=()=>ScrollTrigger.refresh();addEventListener('resize',size,{passive:true});
  return()=>{gsap.ticker.remove(ticker);st.kill();l.destroy();removeEventListener('pointermove',pointer);removeEventListener('resize',size);};
 },[motion]);
 useEffect(()=>{const blocked=settings||credits||filmOpen||menu||tourOpen;modalRef.current=blocked;if(blocked)lenis.current?.stop();else lenis.current?.start();document.body.style.overflow=blocked?'hidden':'';return()=>{document.body.style.overflow='';};},[settings,credits,filmOpen,menu,tourOpen]);
 useEffect(()=>{for(const [ref,open] of [[settingsDialog,settings],[creditsDialog,credits]]){const d=ref.current;if(open&&!d.open)d.showModal();else if(!open&&d.open)d.close();}},[settings,credits]);
 useEffect(()=>{
  const a=ambient.current;if(!a)return;
  if(sound&&!tourOpen&&!document.hidden&&(filmOpen?!player.current?.paused:!paused)){a.muted=false;a.volume=volume;a.play().catch(()=>setAudioNotice('Toque em Som para permitir o áudio no navegador.'));}else a.pause();
 },[sound,paused,volume,filmOpen,tourOpen]);
 useEffect(()=>{if(!menu)return;const toggle=document.querySelector('.menu-toggle'),items=[toggle,...document.querySelectorAll('#mobile-menu button')];const key=e=>{if(e.key==='Escape'){setMenu(false);toggle.focus();}if(e.key==='Tab'){const i=items.indexOf(document.activeElement),n=e.shiftKey?(i<=0?items.length-1:i-1):(i+1)%items.length;e.preventDefault();items[n].focus();}};document.addEventListener('keydown',key);items[1]?.focus();return()=>document.removeEventListener('keydown',key);},[menu]);
 useEffect(()=>{const visibility=()=>{if(document.hidden){ambient.current?.pause();player.current?.pause();}else if(soundRef.current&&!pausedRef.current&&!filmOpen)ambient.current?.play().catch(()=>{});};document.addEventListener('visibilitychange',visibility);return()=>{document.removeEventListener('visibilitychange',visibility);ambient.current?.pause();};},[filmOpen]);
 const go=index=>{setMenu(false);lenis.current?.start();const target=track.current.offsetTop+(track.current.offsetHeight-innerHeight)*CHAPTERS[index].at;lenis.current?.scrollTo(target,{duration:reduced?0:1.8,immediate:reduced});};
 const toggleAudio=async()=>{
  const enabled=!soundRef.current;soundRef.current=enabled;setSound(enabled);setAudioNotice('');
  if(enabled){try{ambient.current.muted=false;ambient.current.volume=volumeRef.current;await ambient.current.play();if(player.current&&filmOpen){player.current.muted=false;player.current.volume=volumeRef.current;}}catch{soundRef.current=false;setSound(false);setAudioNotice('O navegador bloqueou o áudio. Toque para tentar de novo.');}}
  else{ambient.current?.pause();if(player.current)player.current.muted=true;}
 };
 const openFilm=()=>{
  setFilmOpen(true);const d=filmDialog.current;if(!d.open)d.showModal();const v=player.current;v.currentTime=0;v.muted=!soundRef.current;v.volume=volumeRef.current;v.play().catch(()=>{});if(soundRef.current)ambient.current?.play().catch(()=>{});
 };
 const closeFilm=()=>{player.current?.pause();filmDialog.current?.close();setFilmOpen(false);if(soundRef.current&&!pausedRef.current)ambient.current?.play().catch(()=>{});};
 const videoVolume=()=>{if(!filmOpen)return;const v=player.current;if(!v)return;const enable=!v.muted&&v.volume>0;soundRef.current=enable;setSound(enable);setVolume(v.volume);if(enable&&!v.paused)ambient.current?.play().catch(()=>{});else ambient.current?.pause();};
 const togglePlayback=()=>{setPaused(v=>!v);if(paused)film.current?.play();else film.current?.pause();};
 return <div ref={root} className={`experience ink-${ink} ${reduced?'reduced':''}`}>
  <a className="skip" href="#intro-controls">Pular para os controles da experiência</a>
  <audio ref={ambient} src="/assets/harvard-square.mp3" preload="none" loop aria-hidden="true"/>
  <main><div className="journey-track" ref={track}><section className="experience-stage" aria-label="Uma jornada cinematográfica por Harvard">
   <div className="film-layer"><LoopingFilm ref={film} src="/assets/harvard-cinematic.mp4" poster="/assets/harvard-cinematic-poster.jpg" active={(filmActive||worldError)&&!paused&&!filmOpen&&!tourOpen} reducedMotion={reduced} onReady={onFilmReady} onError={onFilmReady} onPosterReady={()=>setPosterReady(true)}/><div className="film-shade"/></div>
   <div ref={worldLayer} className={`world-layer ${chapter===4?'interactive':''} `} aria-label="Corredores, arcos e acervo em 3D, livro Veritas e Harvard Yard"><Suspense fallback={null}><HarvardWorld motion={motion} quality={quality} reducedMotion={reduced||paused} active={(!worldReady||progress>2)&&!filmOpen&&!tourOpen&&!paused} onReady={onWorldReady} onError={onWorldError} onPanoramaReady={onPanoramaReady} onLibraryReady={onLibraryReady}/></Suspense></div>
   <div ref={veil} className="transition-veil" aria-hidden="true"><span>Olhe além.</span><small>UMA NOVA PERSPECTIVA</small></div>
   <div className="edge-shade"/>
   <header className="header"><button className="brand" onClick={()=>go(0)} aria-label="Harvard, voltar ao início"><Shield/><span>HARVARD<small>THE PURSUIT OF POSSIBILITY</small></span></button><nav className="navigation" aria-label="Principal"><button onClick={openFilm}>O filme <span>↗</span></button><button onClick={()=>setTourOpen(true)}>Dentro da Widener</button><button onClick={()=>go(4)}>Harvard em 360°</button><button onClick={()=>setCredits(true)}>Sobre a experiência</button></nav><button className="menu-toggle" aria-expanded={menu} aria-controls="mobile-menu" onClick={()=>setMenu(!menu)}>{menu?'Fechar':'Menu'} <span>{menu?'−':'+'}</span></button></header>
   {menu&&<nav id="mobile-menu" className="mobile-menu" aria-label="Navegação móvel"><button onClick={()=>{setMenu(false);openFilm();}}>O filme ↗</button><button onClick={()=>{setMenu(false);setTourOpen(true);}}>Dentro da Widener</button><button onClick={()=>go(4)}>Harvard em 360°</button><button onClick={()=>{setMenu(false);setCredits(true);}}>Sobre a experiência</button></nav>}
   <div className="coordinates"><span>CAMBRIDGE, MASSACHUSETTS</span><span>EST. 1636 <i/> VERITAS</span></div>
   <div className={`intro-copy scene-copy ${visibleChapter===0?'visible':''}`} aria-hidden={visibleChapter!==0}><p className="eyebrow">A CURIOSIDADE NOS MOVE.</p><h1>Harvard<span>.</span></h1><h2>Um lugar para imaginar<br/><em>o que vem a seguir.</em></h2><p className="caption">Uma jornada por ideias, histórias e possibilidades.</p><button className="begin-button" tabIndex={visibleChapter===0?0:-1} onClick={()=>go(1)}>Entre na história <Arrow/></button></div>
   <div className={`architecture-copy scene-copy ${visibleChapter===1?'visible':''}`} aria-hidden={visibleChapter!==1}><p className="eyebrow">01 / UM LUGAR DE IDEIAS</p><h2>Entre na<br/><em>história.</em></h2><p className="caption">Cada passo abre uma perspectiva.<br/>Cada pergunta, um novo caminho.</p><span className="fine-label">O ARQUIVO · UMA INTERPRETAÇÃO DE HARVARD</span></div>
   <div className={`veritas-copy scene-copy ${visibleChapter===2?'visible':''}`} aria-hidden={visibleChapter!==2}><p className="eyebrow">02 / O SALÃO DAS IDEIAS</p><h2>Entre ideias,<br/><em>novos mundos.</em></h2><p className="caption">Um espaço para perguntar.<br/>Um universo para descobrir.</p></div>
   <div className={`library-copy scene-copy ${visibleChapter===3?'visible':''}`} aria-hidden={visibleChapter!==3}><p className="eyebrow">03 / DENTRO DO LIVRO</p><h2>Uma palavra.<br/><em>Infinitas descobertas.</em></h2><p className="caption">O próximo caminho começa<br/>dentro de um livro.</p><span className="fine-label">VERITAS · A BUSCA CONTINUA</span></div>
   <div className={`yard-copy scene-copy ${visibleChapter===4?'visible':''}`} aria-hidden={visibleChapter!==4}><p className="eyebrow">04 / UMA NOVA PERSPECTIVA</p><h2>O conhecimento<br/><em>muda o olhar.</em></h2><p className="caption">Arraste para explorar o Harvard Yard.<br/>Um panorama real, em todas as direções.</p><a className="visit-link" tabIndex={visibleChapter===4?0:-1} href="https://www.harvard.edu/visit/" target="_blank" rel="noopener noreferrer">Continue em Harvard <Arrow diagonal/></a><span className="fine-label">FOTOGRAFIA 360° · SDKB · CC BY-SA 4.0 · FONTE 8K</span></div>
   <nav className="chapter-nav" aria-label="Capítulos">{CHAPTERS.map((c,i)=><button key={c.name} onClick={()=>go(i)} aria-label={`Ir para ${c.name}`} aria-current={chapter===i?'step':undefined}><span>0{i+1}</span><i/><b>{c.name}</b></button>)}</nav>
   <div className="bottom-bar" id="intro-controls"><button className="sound-control" onClick={toggleAudio} aria-pressed={sound}><Speaker muted={!sound}/><span>{sound?'Som ambiente ligado':'Ativar som ambiente'}</span></button><span className="scroll-cue">{chapter===4?'ARRASTE PARA OLHAR AO REDOR':progress>55&&progress<81?'ATRAVESSE A PALAVRA VERITAS':chapter===3?'APROXIME-SE DO LIVRO':'ROLE PARA DESCOBRIR'}<span>{chapter===4?'↔':'↓'}</span></span><div className="utility-controls"><button onClick={togglePlayback} aria-label={paused?'Retomar animações':'Pausar animações'}>{paused?'▷':'Ⅱ'}</button><button className="settings-button" onClick={()=>setSettings(true)}><Gear/><span>{quality==='cinema'?'Cinema':quality==='high'?'Alta qualidade':'Qualidade'}</span></button></div></div>
   <div className="progress-line" aria-hidden="true"><i/></div><span className="progress-number" aria-label={`${progress}% da experiência`}>{String(chapter+1).padStart(2,'0')}<i/>05</span>
   {worldError&&<p className="status-notice" role="status">A vista 3D não carregou. O filme continua disponível.</p>}{audioNotice&&<p className="status-notice" role="status">{audioNotice}</p>}
   <div className={`loading-screen ${posterReady||filmReady||worldReady||worldError||reduced?'ready':''}`} aria-hidden={posterReady||filmReady||worldReady||worldError||reduced}><Shield/><span>HARVARD</span><p>A curiosidade nos move.</p><i/></div>
  </section></div></main>
  <WidenerTour open={tourOpen} onClose={()=>setTourOpen(false)}/>
  <dialog className="modal settings-modal" ref={settingsDialog} data-lenis-prevent aria-labelledby="settings-title" onCancel={()=>setSettings(false)} onClose={()=>setSettings(false)}><button className="modal-close" onClick={()=>setSettings(false)} aria-label="Fechar ajustes">×</button><p className="eyebrow">A EXPERIÊNCIA, DO SEU JEITO</p><h2 id="settings-title">Cada detalhe<br/><em>importa.</em></h2><label className="setting-row"><span>Qualidade do 3D<small>A escolha permanece fixa ao mover e rolar.</small></span><select value={quality} onChange={e=>setQuality(e.target.value)} aria-label="Qualidade do 3D"><option value="auto">Automática</option><option value="high">Alta</option><option value="cinema">Cinema · máxima</option></select></label><p className="resolution-readout">Renderização prevista: {profile.renderWidth.toLocaleString('pt-BR')} × {profile.renderHeight.toLocaleString('pt-BR')} px</p><label className="setting-row"><span>Volume do ambiente<small>Gravação real de Harvard Square.</small></span><input type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))} aria-label="Volume do som ambiente"/></label><label className="setting-row"><span>Movimento reduzido<small>Reduz oscilações e pausa o vídeo de fundo.</small></span><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/></label><button className="modal-action" onClick={()=>setSettings(false)}>Continuar a experiência <Arrow/></button></dialog>
  <dialog ref={filmDialog} className="film-dialog" data-lenis-prevent aria-label="Filme de Harvard College" onCancel={e=>{e.preventDefault();closeFilm();}} onClose={()=>{if(filmOpen)closeFilm();}}><button className="film-close" aria-label="Fechar filme" onClick={closeFilm}>×</button><video ref={player} src={OFFICIAL_FILM} playsInline controls preload="metadata" onVolumeChange={videoVolume} onPlay={()=>{if(soundRef.current)ambient.current?.play().catch(()=>{});}} onPause={()=>{if(filmOpen)ambient.current?.pause();}}/><div className="film-dialog-caption"><span>HARVARD COLLEGE · HARVARD YARD</span><button onClick={toggleAudio}><Speaker muted={!sound}/>{sound?'Ambiente ligado':'Ativar áudio ambiente'}</button></div><p>A filmagem oficial possui trilha silenciosa. O som ambiente é uma gravação separada de Harvard Square, por themfish.</p></dialog>
  <dialog className="modal credits-modal" ref={creditsDialog} data-lenis-prevent aria-labelledby="credits-title" onCancel={()=>setCredits(false)} onClose={()=>setCredits(false)}><button className="modal-close" aria-label="Fechar créditos" onClick={()=>setCredits(false)}>×</button><p className="eyebrow">SOBRE ESTA EXPERIÊNCIA</p><h2 id="credits-title">Uma homenagem<br/><em>à curiosidade.</em></h2><p>Estudo conceitual independente, sem vínculo institucional com a Harvard University.</p><h3>Imagem, arquitetura e som</h3><p>Filme de entrada gerado no Higgsfield com MiniMax H3 (2560 × 1440), usando uma fotografia real de Widener como referência. O arquivo é uma biblioteca conceitual em 3D, com arcos, corredores e acervo, inspirada na linguagem arquitetônica de Harvard. O livro e o portal são criações deste projeto. O Harvard Yard usa fotografia real em 360°. A visita Dentro da Widener abre o visualizador oficial da Harvard Library, com fotografia e navegação próprias. Os móveis e volumes digitalizados e as texturas fotográficas vêm de fontes CC0.</p><p>Som ambiente: themfish, Harvard Square, CC BY 4.0. O vídeo de Harvard College é exibido sem edição; sua faixa original é silenciosa.</p><div className="credit-links"><a href="/assets/CREDITS-v4.md" target="_blank" rel="noopener noreferrer">Fontes, licenças e dados da mídia ↗</a><a href="https://freesound.org/people/themfish/sounds/33544/" target="_blank" rel="noopener noreferrer">Ouvir a gravação original de Harvard Square ↗</a><a href="https://college.harvard.edu/about/campus" target="_blank" rel="noopener noreferrer">Conhecer o campus no site oficial ↗</a></div><h3>Direção de movimento</h3><p>Pesquisa de cenografia e navegação espacial: Igloo/Abeto, MotionSites, Scrolltide e referências enviadas. A experiência usa código e assets próprios ou licenciados, sem reproduzir modelos proprietários.</p></dialog>
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
