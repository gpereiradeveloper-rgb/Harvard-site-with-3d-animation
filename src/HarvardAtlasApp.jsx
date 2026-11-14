import React,{Suspense,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import LoopingFilm from './LoopingFilm';
import {createQuietScore} from './QuietScore';
import {usePersistentRenderQuality,useViewportRenderQuality} from './RenderQuality';
import './styles.css';
import './AtlasExperience.css';

gsap.registerPlugin(ScrollTrigger);
const CampusAtlas=React.lazy(()=>import('./CampusAtlas'));
const HarvardCodex=React.lazy(()=>import('./HarvardCodex'));
const AcademicVolume3D=React.lazy(()=>import('./AcademicVolume3D'));
const GoogleCampusAtlas=React.lazy(()=>import('./GoogleCampusAtlas'));
const MAPS_DEMO_KEY=import.meta.env.DEV?(import.meta.env.VITE_GOOGLE_MAPS_DEMO_KEY||''):'';
const OFFICIAL_FILM='https://college.harvard.edu/sites/default/files/2024-04/Webpage%20Landing%20Cut%20%28Campus%29_v2.mp4';
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=(a,b,p)=>{const t=clamp((p-a)/(b-a));return t*t*(3-2*t);};
const STOPS=[{id:'yard',year:'1636',title:'Harvard Yard',at:.22},{id:'memorial',year:'1878',title:'Memorial Hall',at:.43},{id:'university',year:'1815',title:'University Hall',at:.62},{id:'widener',year:'1915',title:'Widener Library',at:.86}];
const STORIES={
 yard:{kicker:'01 / UM LUGAR DE ENCONTROS',year:'1636',name:'Harvard Yard',title:<>Os caminhos<br/>{' '}das <em>ideias.</em></>,text:'Entre árvores, pátios e edifícios, descubra os lugares que dão forma à história de Harvard.',detail:'Harvard foi fundada em 28 de outubro de 1636. John Harvard, que deixou à instituição parte de seus bens e sua biblioteca, foi seu primeiro grande benfeitor.',source:'https://www.harvard.edu/about/history/',sourceName:'Harvard University · História'},
 memorial:{kicker:'02 / ARQUITETURA E MEMÓRIA',year:'1878',name:'Memorial Hall',title:<>A memória<br/>ganha <em>forma.</em></>,text:'Uma torre, encontros e histórias. Aproxime-se de um dos marcos arquitetônicos do campus.',detail:'O Memorial Hall foi concebido em memória dos ex-alunos de Harvard que lutaram pela União na Guerra Civil. Sua construção começou em 1870 e foi concluída em etapas; o edifício foi entregue à Universidade em 1878.',image:'/assets/memorial-hall.jpg',imageAlt:'Fachada e torre do Memorial Hall em uma fotografia de Daderot',source:'https://guides.library.harvard.edu/hua/MemorialHall',sourceName:'Harvard Library · Memorial Hall'},
 university:{kicker:'03 / NO CORAÇÃO DO YARD',year:'1815',name:'University Hall',title:<>Cada lugar,<br/>uma <em>perspectiva.</em></>,text:'O granito claro da University Hall marca uma pausa entre os edifícios de tijolos do Yard.',detail:'Projetada por Charles Bulfinch e concluída em 1815, a University Hall foi construída em granito de Chelmsford. Sua fachada de pedra se destacou entre os edifícios de tijolos que a cercavam.',source:'https://harvardplanning.emuseum.com/sites/337/university-hall',sourceName:'Harvard Planning · University Hall'},
 widener:{kicker:'04 / UM UNIVERSO DE LEITURAS',year:'1915',name:'Widener Library',title:<>O mundo cabe<br/>entre <em>páginas.</em></>,text:'A viagem chega à Widener. Abra sua história, descubra a sala de leitura e encontre um novo caminho no livro.',detail:'A Harry Elkins Widener Memorial Library abriu em 1915, construída com uma doação de Eleanor Elkins Widener em memória de seu filho Harry, da turma de 1907. Hoje, seus espaços e acervos fazem parte da Harvard Library.',image:'/assets/widener-4k.jpg',imageAlt:'Fachada original da Widener Library, fotografada por Ajay Suresh',source:'https://library.harvard.edu/libraries/widener',sourceName:'Harvard Library · Widener'}
};
function Arrow(){return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.4"/></svg>;}
function Shield(){return <svg viewBox="0 0 50 60" aria-hidden="true" fill="none"><path d="M3 3h44v27c0 14-22 27-22 27S3 44 3 30V3Z" stroke="currentColor" strokeWidth="1.5"/><path d="M10 12h13v12H10zM27 12h13v12H27zM18 31h14v12H18z" stroke="currentColor"/><path d="M16.5 12v12m17-12v12M25 31v12" stroke="currentColor"/><text x="16.5" y="21" textAnchor="middle">VE</text><text x="33.5" y="21" textAnchor="middle">RI</text><text x="25" y="40" textAnchor="middle">TAS</text></svg>;}
function Speaker({muted}){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m11 4-6 5H2v6h3l6 5V4Z" stroke="currentColor" strokeWidth="1.3"/>{muted?<path d="m16 9 6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.3"/>:<path d="M15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14" stroke="currentColor" strokeWidth="1.3"/>}</svg>;}
class SceneBoundary extends React.Component{
 constructor(p){super(p);this.state={failed:false};}
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){this.props.onError();}
 render(){return this.state.failed?null:this.props.children;}
}

export default function HarvardAtlasApp(){
 const root=useRef(),track=useRef(),book=useRef(),lenis=useRef(),hero=useRef(),settingsRef=useRef(),aboutRef=useRef(),storyRef=useRef(),mediaRef=useRef(),menuRef=useRef(),video=useRef();
 const motion=useRef({progress:0,pointerX:0,pointerY:0}).current;
 const bookMotion=useRef({progress:0,pointerX:0,pointerY:0}).current;
 const score=useMemo(()=>createQuietScore(),[]);
 const [quality,setQuality]=usePersistentRenderQuality('high'),profile=useViewportRenderQuality(quality);
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion:reduce)').matches);
 const [phase,setPhase]=useState('cover'),[bookVisible,setBookVisible]=useState(false),[sceneReady,setSceneReady]=useState(false),[sceneFailed,setSceneFailed]=useState(false),[posterReady,setPosterReady]=useState(false),[bookChapter,setBookChapter]=useState('cover'),[readerChapter,setReaderChapter]=useState('origins');
 const [paused,setPaused]=useState(false),[sound,setSound]=useState(false),[volume,setVolume]=useState(.35),[notice,setNotice]=useState('');
 const [settings,setSettings]=useState(false),[about,setAbout]=useState(false),[selected,setSelected]=useState(null),[media,setMedia]=useState(null),[menu,setMenu]=useState(false);
 const reducedRef=useRef(reduced),modal=settings||about||Boolean(selected)||Boolean(media)||menu;
 const onReady=useCallback(()=>setSceneReady(true),[]),onSceneError=useCallback(()=>setSceneFailed(true),[]);
 const openStory=useCallback(id=>{if(STORIES[id])setSelected(id);},[]);
 const openMedia=useCallback(id=>setMedia(id==='film'?'film':'library'),[]);
 const openBookChapter=useCallback(id=>{setReaderChapter(id);setMedia('reader');},[]);
 useEffect(()=>{const mq=matchMedia('(prefers-reduced-motion:reduce)'),change=e=>setReduced(e.matches);mq.addEventListener('change',change);return()=>mq.removeEventListener('change',change);},[]);
 useEffect(()=>{reducedRef.current=reduced;if(lenis.current)lenis.current.options.smoothWheel=!reduced;},[reduced]);
 useEffect(()=>{
  const controller=new Lenis({duration:.95,smoothWheel:!reducedRef.current,syncTouch:false});lenis.current=controller;
  controller.on('scroll',ScrollTrigger.update);
  let target=0,current=0,bookTarget=0,bookCurrent=0,lastPhase='cover',lastBook='cover';
  const sync=self=>{target=self.progress;};
  const trigger=ScrollTrigger.create({trigger:track.current,start:'top top',end:'bottom bottom',onUpdate:sync,onRefresh:sync});sync(trigger);
  const bookTrigger=ScrollTrigger.create({trigger:book.current,start:'top top',end:'bottom bottom',onUpdate:self=>{bookTarget=self.progress;},onRefresh:self=>{bookTarget=self.progress;}});bookTarget=bookTrigger.progress;
  const tick=(time,delta)=>{
   controller.raf(time*1000);
   const dt=Math.min((delta||16.667)/1000,.08);
   current=reducedRef.current?target:current+(target-current)*(1-Math.exp(-10*dt));
   if(Math.abs(target-current)<.00004)current=target;
   motion.progress=clamp((current-.12)/.88);
   bookCurrent=reducedRef.current?bookTarget:bookCurrent+(bookTarget-bookCurrent)*(1-Math.exp(-10*dt));
   if(Math.abs(bookCurrent-bookTarget)<.00004)bookCurrent=bookTarget;
   bookMotion.progress=bookCurrent;
   const nextBook=bookCurrent<.30?'cover':bookCurrent<.485?'origins':bookCurrent<.685?'library':'collections';if(lastBook!==nextBook){lastBook=nextBook;setBookChapter(nextBook);}
   const next=current<.12?'cover':motion.progress<.23?'yard':motion.progress<.45?'memorial':motion.progress<.67?'university':'widener';
   if(next!==lastPhase){lastPhase=next;setPhase(next);}
   const el=root.current;if(!el)return;
   el.style.setProperty('--atlas-enter',smooth(.045,.14,current));
   el.style.setProperty('--hero-opacity',1-smooth(.02,.115,current));
   el.style.setProperty('--atlas-progress',motion.progress);
   el.style.setProperty('--atlas-end',smooth(.93,1,current));
   el.dataset.journeyProgress=current.toFixed(4);el.dataset.bookProgress=bookCurrent.toFixed(4);el.style.setProperty('--book-heading-alpha',1-smooth(.055,.22,bookCurrent));
  };
  gsap.ticker.add(tick);gsap.ticker.lagSmoothing(0);
  const resize=()=>ScrollTrigger.refresh();addEventListener('resize',resize,{passive:true});
  return()=>{gsap.ticker.remove(tick);trigger.kill();bookTrigger.kill();controller.destroy();removeEventListener('resize',resize);};
 },[motion,bookMotion]);
 useEffect(()=>{const observer=new IntersectionObserver(entries=>setBookVisible(entries[0].isIntersecting),{threshold:.08});observer.observe(book.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(modal)lenis.current?.stop();else lenis.current?.start();},[modal]);
 useEffect(()=>{
  for(const [ref,show]of[[settingsRef,settings],[aboutRef,about],[storyRef,Boolean(selected)],[mediaRef,Boolean(media)],[menuRef,menu]]){
   const d=ref.current;if(show&&!d.open)d.showModal();else if(!show&&d.open)d.close();
  }
  if(media==='film')video.current?.play().catch(()=>{});else video.current?.pause();
 },[settings,about,selected,media,menu]);
 useEffect(()=>{score.setVolume(volume);},[score,volume]);
 useEffect(()=>{
  const update=()=>{if(sound&&!paused&&!media&&!document.hidden)score.start().catch(()=>{setSound(false);setNotice('Toque em Música para iniciar o som.');});else score.stop();};
  update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);
 },[score,sound,paused,media]);
 useEffect(()=>()=>score.dispose(),[score]);
 const go=(value)=>{
  setMenu(false);setSelected(null);lenis.current?.start();
  const top=value==='book'?book.current.offsetTop:track.current.offsetTop+(track.current.offsetHeight-innerHeight)*value;
  lenis.current?.scrollTo(top,{duration:reduced?0:1.25,immediate:reduced});
 };
 const goBook=fraction=>{setMenu(false);lenis.current?.start();lenis.current?.scrollTo(book.current.offsetTop+(book.current.offsetHeight-innerHeight)*fraction,{duration:reduced?0:1.15,immediate:reduced});};
 const toggleMusic=async()=>{setNotice('');if(sound){score.stop();setSound(false);}else{try{await score.start();setSound(true);}catch{setNotice('O navegador não conseguiu iniciar a música.');}}};
 const chosen=STORIES[selected],current=STORIES[phase];
 return <div ref={root} className={`experience atlas-app ${MAPS_DEMO_KEY?'map-real':''} ${phase!=='cover'&&!bookVisible?'atlas-ink':''} ${bookVisible?'at-book':''} ${reduced?'reduced':''} ${paused?'campus-paused':''}`}>
  <a className="skip" href="#atlas-controls">Pular para os controles da experiência</a>
  <header className="header"><button className="brand" onClick={()=>go(0)} aria-label="Harvard, voltar ao início"><Shield/><span>HARVARD<small>THE PURSUIT OF POSSIBILITY</small></span></button><nav className="navigation" aria-label="Principal"><button onClick={()=>go(.22)}>Explorar o atlas <span>↗</span></button><button onClick={()=>go('book')}>O livro</button><button onClick={()=>setAbout(true)}>Sobre a experiência</button></nav><button className="menu-toggle" aria-expanded={menu} onClick={()=>setMenu(true)}>Menu <span>+</span></button></header>
  <main>
   <div ref={track} className="atlas-track"><section className="atlas-stage" aria-label="Atlas ilustrado e interativo de Harvard" onPointerMove={e=>{motion.pointerX=e.clientX/innerWidth*2-1;motion.pointerY=1-e.clientY/innerHeight*2;}} onPointerLeave={()=>{motion.pointerX=0;motion.pointerY=0;}}>
    <div className="film-layer"><LoopingFilm ref={hero} src="/assets/harvard-cinematic.mp4" poster="/assets/harvard-cinematic-poster.jpg" active={phase==='cover'&&!paused&&!media} reducedMotion={reduced} onPosterReady={()=>setPosterReady(true)}/><div className="film-shade"/></div>
    <div className="atlas-canvas-layer" aria-hidden={phase==='cover'} inert={phase==='cover'||bookVisible||undefined}><SceneBoundary onError={onSceneError}><Suspense fallback={null}>{MAPS_DEMO_KEY?<GoogleCampusAtlas apiKey={MAPS_DEMO_KEY} motion={motion} active={!bookVisible&&!modal} onReady={onReady} onError={onSceneError} onSelect={openStory}/>:<CampusAtlas motion={motion} quality={quality} reduced={reduced} paused={paused} active={!bookVisible&&!modal} onReady={onReady} onSelect={openStory}/>}</Suspense></SceneBoundary>{sceneFailed&&<div className="atlas-fallback"><img src="/assets/widener-4k.jpg" alt="A fachada original da Widener Library"/><button onClick={()=>go('book')}>Abrir o livro de Harvard <Arrow/></button></div>}</div>
    <div className="atlas-reading-shade"/>
    <div className="atlas-dust" aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} style={{'--x':`${(i*37+13)%100}%`,'--y':`${(i*19+7)%100}%`,'--delay':`${-i*1.7}s`,'--size':`${i%4===0?3:1.5}px`}}/>)}</div>
    <div className="coordinates"><span>{phase==='cover'?'CAMBRIDGE, MASSACHUSETTS':'CAMBRIDGE · UM ATLAS DE IDEIAS'}</span><span>EST. 1636 <i/> VERITAS</span></div>
    <div className={`intro-copy scene-copy ${phase==='cover'?'visible':''}`} aria-hidden={phase!=='cover'}><p className="eyebrow">A CURIOSIDADE NOS MOVE.</p><h1>Harvard<span>.</span></h1><h2>Um lugar para imaginar<br/><em>o que vem a seguir.</em></h2><p className="caption">Uma jornada por ideias, histórias e possibilidades.</p><button className="begin-button" onClick={()=>go(.22)} tabIndex={phase==='cover'?0:-1}>Entre na história <Arrow/></button></div>
    <div className={`atlas-story-copy ${current?'is-visible':''}`} aria-hidden={!current}>
     {current&&<div key={phase} className="atlas-story-inner"><p className="eyebrow">{current.kicker}</p><h2>{current.title}</h2><p className="atlas-story-description">{current.text}</p><button className="atlas-discover" onClick={()=>openStory(phase)}>Descobrir {current.name} <Arrow/></button></div>}
    </div>
    <div className="atlas-compass" aria-hidden="true"><span>N</span><svg viewBox="0 0 70 70"><circle cx="35" cy="35" r="30"/><path d="m35 9 7 26-7 26-7-26 7-26Zm-26 26h52"/><path className="atlas-compass-needle" d="m35 9 7 26h-14l7-26Z"/></svg></div>
    <div className="atlas-caption-note">HARVARD YARD <span>42°22′ N &nbsp; 71°07′ W</span></div>
    <div className="atlas-bottom-navigation"><p><span className="atlas-scroll-orbit"/>Role para aproximar.<br/><span>Escolha um lugar para descobrir.</span></p><nav aria-label="Lugares do atlas">{STOPS.map(stop=><button key={stop.id} onClick={()=>go(stop.at)} aria-current={phase===stop.id?'step':undefined}><span>{stop.year}</span><i/><b>{stop.title}</b></button>)}<button onClick={()=>go('book')}><span>VERITAS</span><i/><b>O livro</b></button></nav></div>
    <div className="atlas-progress-track" aria-hidden="true"><i/></div>
    <div className={`loading-screen ${posterReady?'ready':''}`} aria-hidden={posterReady}><Shield/><span>HARVARD</span><p>A curiosidade nos move.</p><i/></div>
    {!sceneReady&&!sceneFailed&&phase!=='cover'&&<p className="atlas-loading" role="status">Revelando o atlas…</p>}
   </section></div>
   <section ref={book} id="harvard-volume" className="atlas-book-section atlas-book-track" aria-label="Livro tridimensional de Harvard controlado pelo scroll"><div className="atlas-book-stage" onPointerMove={e=>{bookMotion.pointerX=e.clientX/innerWidth*2-1;bookMotion.pointerY=1-e.clientY/innerHeight*2;}} onPointerLeave={()=>{bookMotion.pointerX=0;bookMotion.pointerY=0;}}><div className="atlas-book-heading"><p className="eyebrow">O LIVRO DE HARVARD</p><h2>O conhecimento<br/><em>abre caminhos.</em></h2><p>Role para abrir o volume<br/>e atravessar suas páginas.</p></div><div className="academic-volume-layer"><SceneBoundary onError={()=>setNotice('Não foi possível iniciar o livro 3D neste navegador.')}><Suspense fallback={<p className="atlas-book-loading">Preparando o volume…</p>}><AcademicVolume3D motion={bookMotion} quality={quality} reduced={reduced} paused={paused} active={bookVisible&&!modal} onChapter={openBookChapter}/></Suspense></SceneBoundary></div><div className="academic-book-label"><span>{bookChapter==='cover'?'UM ATLAS DE IDEIAS':bookChapter==='origins'?'I / AS ORIGENS':bookChapter==='library'?'II / A BIBLIOTECA':'III / O ACERVO'}</span><p>{bookChapter==='cover'?'Role para abrir.':'Role para virar a página.'}</p></div><nav className="academic-scroll-stops" aria-label="Capítulos do livro"><button onClick={()=>goBook(.02)} aria-current={bookChapter==='cover'?'step':undefined}>A capa</button><button onClick={()=>goBook(.32)} aria-current={bookChapter==='origins'?'step':undefined}>As origens</button><button onClick={()=>goBook(.515)} aria-current={bookChapter==='library'?'step':undefined}>A biblioteca</button><button onClick={()=>goBook(.715)} aria-current={bookChapter==='collections'?'step':undefined}>O acervo</button><button onClick={()=>openBookChapter(bookChapter==='cover'?'origins':bookChapter)}>Índice e leitura ↗</button></nav></div></section><footer className="atlas-colophon atlas-final-footer"><span>HARVARD · UM ATLAS DE IDEIAS</span><button onClick={()=>go(.22)}>Voltar ao campus <Arrow/></button><button onClick={()=>setAbout(true)}>Fontes e créditos ↗</button></footer>
  </main>
  <div className="atlas-utilities" id="atlas-controls"><button className={`atlas-music ${sound?'music-on':''}`} onClick={toggleMusic} aria-pressed={sound}><Speaker muted={!sound}/><span>{sound?'Música ligada':'Música ambiente'}</span><i aria-hidden="true"/></button><div><button onClick={()=>setPaused(!paused)} aria-label={paused?'Retomar movimentos do campus':'Pausar movimentos do campus'}>{paused?'▷':'Ⅱ'}</button><button onClick={()=>setSettings(true)} className="atlas-quality">{quality==='cinema'?'Cinema':quality==='high'?'Alta':'Qualidade'}<span aria-hidden="true">◦</span></button></div></div>
  {notice&&<button className="atlas-notice" onClick={()=>setNotice('')} role="status">{notice} <span>×</span></button>}
  <dialog ref={menuRef} className="atlas-menu-dialog" data-lenis-prevent onCancel={()=>setMenu(false)} onClose={()=>setMenu(false)}><button className="modal-close" aria-label="Fechar menu" onClick={()=>setMenu(false)}>×</button><p className="eyebrow">ESCOLHA SEU CAMINHO</p><button onClick={()=>go(.22)}>Explorar o atlas <Arrow/></button><button onClick={()=>go('book')}>Abrir o livro <Arrow/></button><button onClick={()=>{setMenu(false);setAbout(true);}}>Sobre a experiência <Arrow/></button></dialog>
  <dialog ref={storyRef} className="atlas-detail-dialog" data-lenis-prevent onCancel={()=>setSelected(null)} onClose={()=>setSelected(null)}><button className="modal-close" aria-label="Fechar história" onClick={()=>setSelected(null)}>×</button>{chosen&&<><div className="atlas-detail-heading"><p className="eyebrow">UM LUGAR, UMA HISTÓRIA</p><span>{chosen.year}</span><h2>{chosen.name}</h2></div>{chosen.image&&<img className="atlas-detail-photo" src={chosen.image} alt={chosen.imageAlt}/>}<p className="atlas-detail-text">{chosen.detail}</p>{selected==='widener'&&<button className="atlas-detail-action" onClick={()=>{setSelected(null);setMedia('library');}}>Ver a Loker Reading Room <Arrow/></button>}<a className="atlas-detail-source" href={chosen.source} target="_blank" rel="noopener noreferrer">{chosen.sourceName} ↗</a><button className="atlas-detail-book" onClick={()=>go('book')}>Descobrir mais no livro <Arrow/></button></>}</dialog>
  <dialog ref={mediaRef} className={`atlas-media-dialog ${media==='library'?'atlas-library-dialog':media==='reader'?'atlas-reader-dialog':''}`} data-lenis-prevent onCancel={()=>setMedia(null)} onClose={()=>setMedia(null)}><button className="modal-close" aria-label="Fechar mídia" onClick={()=>setMedia(null)}>×</button>{media==='film'?<><video ref={video} src={OFFICIAL_FILM} controls playsInline/><p>Filme oficial de Harvard College · apresentado sem edição · faixa original silenciosa.</p></>:media==='library'?<><p className="eyebrow">WIDENER LIBRARY · O INTERIOR ORIGINAL</p><h2>Loker Reading Room</h2><div className="atlas-library-image" tabIndex={0} aria-label="Fotografia panorâmica: role horizontalmente para explorar a sala"><img src="/assets/loker-native.jpg" alt="Panorama fotográfico original da Loker Reading Room, com mesas, estantes e claraboias"/></div><p>Fotografia de Jerem43 · CC BY-SA 3.0 <a href="https://commons.wikimedia.org/wiki/File:Loker_Reading_Room.jpg" target="_blank" rel="noopener noreferrer">Fonte ↗</a></p></>:media==='reader'?<Suspense fallback={<p className="atlas-book-loading">Abrindo o capítulo…</p>}><HarvardCodex key={readerChapter} active onOpenMedia={openMedia} initialOpen initialPage={readerChapter==='origins'?1:readerChapter==='library'?2:4}/></Suspense>:null}</dialog>
  <dialog ref={settingsRef} className="modal atlas-settings" data-lenis-prevent onCancel={()=>setSettings(false)} onClose={()=>setSettings(false)}><button className="modal-close" aria-label="Fechar ajustes" onClick={()=>setSettings(false)}>×</button><p className="eyebrow">NO SEU RITMO</p><h2>A experiência,<br/><em>do seu jeito.</em></h2><label className="setting-row"><span>{MAPS_DEMO_KEY?'Qualidade do livro 3D':'Qualidade do atlas e do livro'}<small>A escolha permanece fixa ao rolar.</small></span><select value={quality} onChange={e=>setQuality(e.target.value)}><option value="auto">Automática</option><option value="high">Alta</option><option value="cinema">Cinema · máxima</option></select></label><p className="resolution-readout">Renderização: {profile.renderWidth} × {profile.renderHeight} px.</p><label className="setting-row"><span>Volume da música</span><input aria-label="Volume da música" type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label><label className="setting-row"><span>Movimento reduzido</span><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/></label></dialog>
  <dialog ref={aboutRef} className="modal atlas-about" data-lenis-prevent onCancel={()=>setAbout(false)} onClose={()=>setAbout(false)}><button className="modal-close" aria-label="Fechar créditos" onClick={()=>setAbout(false)}>×</button><p className="eyebrow">UM ATLAS DE IDEIAS</p><h2>Feito para<br/><em>descobrir.</em></h2><p>Uma experiência editorial independente, sem vínculo institucional com Harvard University.</p><p>O campus é uma ilustração arquitetônica interativa, com posições e proporções interpretadas para esta narrativa. A câmera, as pessoas e os veículos são animados em tempo real. As fotografias do acervo mostram lugares reais.</p><p>A capa mantém o filme criado anteriormente para este projeto. O livro tem uma nova encadernação digital em linho e papel. A música instrumental é uma composição original suave, inspirada em cordas dedilhadas e flauta.</p><div className="credit-links"><a href="/assets/CREDITS-atlas.md" target="_blank" rel="noopener noreferrer">Fontes, autoria e créditos completos ↗</a><a href="https://www.harvard.edu/about/history/" target="_blank" rel="noopener noreferrer">História de Harvard ↗</a><a href="https://library.harvard.edu/" target="_blank" rel="noopener noreferrer">Harvard Library ↗</a></div></dialog>
 </div>;
}
