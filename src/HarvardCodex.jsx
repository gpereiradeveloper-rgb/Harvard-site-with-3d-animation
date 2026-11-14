import React, {useEffect, useId, useRef, useState} from 'react';
import './HarvardCodex.css';

// Historical facts are paraphrased from the primary sources linked on each page.
const SOURCES = {
  history: 'https://www.harvard.edu/about/history/',
  widener: 'https://library.harvard.edu/libraries/widener/about',
  gutenberg: 'https://library.harvard.edu/collections/gutenberg-bible',
  library: 'https://library.harvard.edu/',
  campus: 'https://college.harvard.edu/about/campus',
  research: 'https://www.harvard.edu/in-focus/',
  collections: 'https://library.harvard.edu/collections',
};
const PAGE_TITLES = ['Folha de rosto', 'As origens', 'Um lugar para ler', 'A memória de Widener', 'Ideias em circulação', 'A página impressa', 'Harvard em movimento', 'Quatro caminhos', 'O próximo capítulo', 'Colofão'];
const TOTAL_PAGES = PAGE_TITLES.length;

function Arrow({back = false, diagonal = false}) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" className={back ? 'hc-arrow-back' : undefined}><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function AcademicShield({className = ''}) {
  return <svg className={`hc-shield ${className}`} viewBox="0 0 80 94" fill="none" aria-hidden="true"><path d="M7 7h66v37c0 23-33 43-33 43S7 67 7 44V7Z" stroke="currentColor" strokeWidth="1.5"/><path d="M14 14h52v29c0 17-26 34-26 34S14 60 14 43V14Z" stroke="currentColor" strokeWidth=".55"/><path d="M19 26c6-2 11-1 16 1v15c-5-2-10-3-16-1V26Zm16 1c5-2 10-3 15-1v15c-5-2-10-1-15 1V27Zm10 22c5-2 10-1 15 1v15c-5-2-10-3-15-1V49Zm-15 1c5-2 10-3 15-1v15c-5-2-10-1-15 1V50Z" stroke="currentColor" strokeWidth=".9"/><path d="M35 27v15m10 7v15" stroke="currentColor" strokeWidth=".65"/><text x="27" y="36" textAnchor="middle">VE</text><text x="43" y="36" textAnchor="middle">RI</text><text x="45" y="59" textAnchor="middle">TAS</text></svg>;
}

function Link({href, children, className = '', label}) {
  return <a className={`hc-link ${className}`} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>{children}<Arrow diagonal/></a>;
}

function ChapterTitle({number, children, subtitle}) {
  return <div className="hc-chapter-title"><span className="hc-kicker">{number}</span><h3>{children}</h3>{subtitle && <p className="hc-deck">{subtitle}</p>}</div>;
}

function Source({href, children = 'Fonte · Harvard University'}) {
  return <a className="hc-source" href={href} target="_blank" rel="noopener noreferrer">{children}<Arrow diagonal/></a>;
}

function PageContent({number, onNavigate, onOpenMedia}) {
  switch (number) {
    case 0:
      return <div className="hc-title-page"><AcademicShield/><p className="hc-kicker">UM ATLAS DE IDEIAS</p><h3>Harvard<span>O conhecimento<br/><em>abre caminhos.</em></span></h3><div className="hc-title-rule"/><p>Um pequeno volume sobre os lugares,<br/>as origens e as possibilidades de descobrir.</p><div className="hc-contents" aria-label="Índice do volume">{[['As origens', 1], ['Um lugar para ler', 2], ['O acervo', 4], ['Harvard em movimento', 6]].map(([label, page]) => <button key={page} onClick={() => onNavigate(page)}><span>{label}</span><span>{String(page + 1).padStart(2, '0')}</span></button>)}</div><span className="hc-edition">CAMBRIDGE, MASSACHUSETTS · VOLUME I</span></div>;
    case 1:
      return <><ChapterTitle number="I / AS ORIGENS">Uma história<br/><em>que se abre.</em></ChapterTitle><div className="hc-date">1636<span>28 DE OUTUBRO</span></div><p className="hc-body-copy">Uma decisão da assembleia da Colônia da Baía de Massachusetts deu origem a Harvard.</p><div className="hc-margin-note"><span>O PRIMEIRO GRANDE BENFEITOR</span><p>John Harvard deixou à instituição parte de seus bens e sua biblioteca.</p></div><Source href={SOURCES.history}>A história de Harvard</Source></>;
    case 2:
      return <><ChapterTitle number="II / OS LUGARES">Um lugar<br/><em>para ler.</em></ChapterTitle><figure className="hc-photo"><img src="/assets/loker-4k.jpg" alt="Mesas, livros e claraboias da Loker Reading Room, no interior da Widener Library" loading="lazy"/><figcaption>LOKER READING ROOM · WIDENER LIBRARY</figcaption></figure><p className="hc-body-copy">Entre estantes e luz natural, a Loker Reading Room faz parte dos espaços de leitura da Widener.</p><Link href="https://library.harvard.edu/libraries/widener">Conhecer a biblioteca</Link><a className="hc-photo-credit" href="https://commons.wikimedia.org/wiki/File:Loker_Reading_Room.jpg" target="_blank" rel="noopener noreferrer">Fotografia: Jerem43 · CC BY-SA 3.0</a></>;
    case 3:
      return <><ChapterTitle number="II / A MEMÓRIA">Livros, lugares<br/><em>e permanência.</em></ChapterTitle><div className="hc-date hc-date-small">1915<span>A ABERTURA DA WIDENER</span></div><p className="hc-body-copy">A Harry Elkins Widener Memorial Library abriu em 1915. Eleanor Elkins Widener financiou sua construção em memória de seu filho Harry.</p><div className="hc-inscription"><span aria-hidden="true">H · E · W</span><p>O edifício preserva uma memória.<br/>A leitura cria outras.</p></div><Source href={SOURCES.widener}>História da Widener Library</Source></>;
    case 4:
      return <><ChapterTitle number="III / O ACERVO">Ideias em<br/><em>circulação.</em></ChapterTitle><p className="hc-body-copy">Comece por uma coleção. Siga uma referência. Encontre uma pergunta que você ainda não fez.</p><div className="hc-index-cards"><Link href={SOURCES.library}><span><small>01 / DESCOBRIR</small>Harvard Library</span></Link><Link href="https://hollis.harvard.edu/"><span><small>02 / PESQUISAR</small>Catálogo HOLLIS</span></Link><Link href="https://dash.harvard.edu/"><span><small>03 / LER</small>Pesquisa em acesso aberto</span></Link></div><Source href={SOURCES.library}>Ferramentas da Harvard Library</Source></>;
    case 5:
      return <><ChapterTitle number="III / UMA OBRA">A página<br/><em>impressa.</em></ChapterTitle><div className="hc-illuminated" aria-hidden="true"><span>G</span><i/><i/><i/><i/></div><p className="hc-body-copy">A Bíblia de Gutenberg foi uma das primeiras grandes obras impressas na Europa com tipos móveis de metal.</p><p className="hc-body-copy">O exemplar de Harvard, impresso em papel, é encadernado em dois volumes. Páginas selecionadas foram digitalizadas e podem ser consultadas online.</p><Link href={SOURCES.gutenberg}>Explorar o exemplar de Harvard</Link><Source href={SOURCES.gutenberg}>Coleção · A Bíblia de Gutenberg</Source></>;
    case 6:
      return <><ChapterTitle number="IV / EM MOVIMENTO">Uma nova<br/><em>perspectiva.</em></ChapterTitle><div className="hc-film-card"><img src="/assets/harvard-cinematic-poster.jpg" alt="Vista temática da Widener Library" loading="lazy"/><span className="hc-film-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 6 10 6-10 6V6Z" fill="currentColor"/></svg></span></div><p className="hc-body-copy">Abra o filme oficial de Harvard College para ver outros recortes da vida no campus.</p>{onOpenMedia ? <button className="hc-link hc-film-button" onClick={() => onOpenMedia('film')}>Assistir ao filme <Arrow diagonal/></button> : <Link href={SOURCES.campus}>Ver o campus de Harvard</Link>}<p className="hc-small-copy">A miniatura é uma interpretação visual criada para este projeto. O filme aberto pelo botão tem origem oficial.</p><Source href={SOURCES.campus}>Harvard College · Campus</Source></>;
    case 7:
      return <><ChapterTitle number="IV / EXPLORAR">Quatro caminhos.<br/><em>Uma curiosidade.</em></ChapterTitle><div className="hc-quadrants"><Link href={SOURCES.history}><span><small>I / MEMÓRIA</small>As origens</span></Link><Link href={SOURCES.library}><span><small>II / LIVROS</small>A biblioteca</span></Link><Link href={SOURCES.research}><span><small>III / IDEIAS</small>Em foco</span></Link><Link href={SOURCES.campus}><span><small>IV / LUGARES</small>O campus</span></Link></div><p className="hc-body-copy">Cada caminho abre uma fonte de Harvard. Continue a pesquisa no seu ritmo.</p></>;
    case 8:
      return <><ChapterTitle number="V / CONTINUAR">O próximo<br/><em>capítulo é seu.</em></ChapterTitle><div className="hc-reading-mark" aria-hidden="true"><AcademicShield/></div><p className="hc-body-copy">Guarde uma ideia. Volte a uma imagem. Escolha uma leitura.</p><div className="hc-index-cards hc-compact-cards"><Link href={SOURCES.library}>Abrir a Harvard Library</Link><Link href={SOURCES.history}>Revisitar a história</Link></div><button className="hc-return-index" onClick={() => onNavigate(0)}>Voltar ao índice <Arrow back/></button></>;
    default:
      return <><ChapterTitle number="V / COLOFÃO">Sobre este<br/><em>volume.</em></ChapterTitle><p className="hc-body-copy">Uma edição digital independente, criada como homenagem à curiosidade. Sem vínculo institucional com Harvard University.</p><dl className="hc-colophon"><div><dt>Encadernação</dt><dd>Linho, papel e movimento em uma interpretação digital.</dd></div><div><dt>Fotografia de interior</dt><dd>Jerem43 · Loker Reading Room · CC BY-SA 3.0.</dd></div><div><dt>Fontes editoriais</dt><dd>Harvard University, Harvard Library e Harvard College.</dd></div></dl><Link href="/assets/CREDITS-atlas.md">Créditos completos</Link><button className="hc-return-index" onClick={() => onNavigate(0)}>Reabrir a primeira página <Arrow back/></button></>;
  }
}

function Page({number, side = 'single', onNavigate, onOpenMedia, decorative = false}) {
  return <article className={`hc-page hc-page-${side} hc-page-number-${number}`} aria-label={`Página ${number + 1}: ${PAGE_TITLES[number]}`} aria-hidden={decorative || undefined} inert={decorative || undefined}><div className="hc-running-head"><span>HARVARD</span><span>UM ATLAS DE IDEIAS</span></div><div className="hc-page-content" data-lenis-prevent><PageContent number={number} onNavigate={onNavigate} onOpenMedia={onOpenMedia}/></div><footer className="hc-page-footer"><span>{PAGE_TITLES[number]}</span><span>{String(number + 1).padStart(2, '0')}</span></footer></article>;
}

/** Standalone editorial book. The parent may open its native film with onOpenMedia('film'). */
export default function HarvardCodex({active = true, onOpenMedia, initialOpen = false, initialPage = 0}) {
  const id = useId(), root = useRef(), reader = useRef(), cover = useRef();
  const [opened, setOpened] = useState(initialOpen), [page, setPage] = useState(initialPage), [turn, setTurn] = useState(null);
  const [single, setSingle] = useState(() => typeof window !== 'undefined' && window.innerWidth < 720);
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)'), update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    const observer = new ResizeObserver(entries => setSingle(entries[0].contentRect.width < 720));
    observer.observe(root.current);
    return () => {media.removeEventListener('change', update); observer.disconnect();};
  }, []);
  useEffect(() => {if (!single) setPage(current => Math.floor(current / 2) * 2); setTurn(null);}, [single]);
  const finishTurn = () => {if (turn) {setPage(turn.to); setTurn(null);}};
  useEffect(() => {
    if (!turn) return;
    if (reduced) {setPage(turn.to); setTurn(null); return;}
    const timeout = setTimeout(() => {setPage(turn.to); setTurn(null);}, 820);
    return () => clearTimeout(timeout);
  }, [turn, reduced]);
  const navigate = requested => {
    if (turn) return;
    const target = single ? Math.max(0, Math.min(TOTAL_PAGES - 1, requested)) : Math.max(0, Math.min(TOTAL_PAGES - 2, Math.floor(requested / 2) * 2));
    if (target === page) return;
    if (reduced) setPage(target); else setTurn({from: page, to: target, direction: target > page ? 'next' : 'previous'});
  };
  const open = () => {setOpened(true); requestAnimationFrame(() => reader.current?.focus({preventScroll: true}));};
  const close = () => {setTurn(null); setOpened(false); requestAnimationFrame(() => cover.current?.focus({preventScroll: true}));};
  const step = single ? 1 : 2, lastPage = single ? TOTAL_PAGES - 1 : TOTAL_PAGES - 2;
  const pages = single ? [turn ? turn.to : page] : turn ? turn.direction === 'next' ? [turn.from, turn.to + 1] : [turn.to, turn.from + 1] : [page, page + 1];
  const front = turn && (single ? turn.from : turn.direction === 'next' ? turn.from + 1 : turn.from);
  const back = turn && (single ? turn.to : turn.direction === 'next' ? turn.to : turn.to + 1);
  const pageProps = {onNavigate: navigate, onOpenMedia};
  const announcement = !opened ? 'Volume fechado' : single ? `Página ${page + 1} de ${TOTAL_PAGES}: ${PAGE_TITLES[page]}` : `Páginas ${page + 1} e ${page + 2} de ${TOTAL_PAGES}`;
  return <section ref={root} className={`harvard-codex ${opened ? 'hc-is-open' : 'hc-is-closed'} ${single ? 'hc-single' : 'hc-spread'} ${reduced ? 'hc-reduced' : ''}`} aria-label="Volume interativo de Harvard" data-active={active} data-codex-state={opened ? 'open' : 'closed'} data-page-index={page} onKeyDown={event => {if (!opened || event.altKey || event.ctrlKey || event.metaKey) return; if (event.key === 'ArrowRight') {event.preventDefault(); navigate(page + step);} else if (event.key === 'ArrowLeft') {event.preventDefault(); navigate(page - step);} else if (event.key === 'Escape') {event.preventDefault(); close();}}}>
    <div className="hc-volume-meta" aria-hidden="true"><span>O VOLUME</span><i/><span>CAMBRIDGE · MASSACHUSETTS</span></div>
    <div className="hc-volume">
      <div className="hc-book-shadow" aria-hidden="true"/><div className="hc-back-cover" aria-hidden="true"/><div className="hc-foreedge" aria-hidden="true"/>
      <div id={id} ref={reader} tabIndex={-1} className="hc-reader" aria-label="Páginas do volume" inert={!opened || undefined}>
        <div className="hc-page-pair">{pages.map((number, index) => <Page key={`${index}-${number}`} number={number} side={single ? 'single' : index === 0 ? 'left' : 'right'} {...pageProps}/>)}</div>
        <span className="hc-gutter" aria-hidden="true"/>
        {turn && <div className={`hc-turn hc-turn-${turn.direction}`} aria-hidden="true" onAnimationEnd={event => {if (event.target === event.currentTarget) finishTurn();}}><div className="hc-turn-face hc-turn-front"><Page number={front} decorative {...pageProps}/></div><div className="hc-turn-face hc-turn-back"><Page number={back} decorative {...pageProps}/></div></div>}
      </div>
      <span className="hc-ribbon" aria-hidden="true"/>
      <button ref={cover} className="hc-cover" onClick={open} aria-expanded={opened} aria-controls={id} tabIndex={opened ? -1 : 0} aria-hidden={opened || undefined} aria-label="Abrir o volume de Harvard">
        <span className="hc-cover-spine" aria-hidden="true"/><span className="hc-cover-frame" aria-hidden="true"/><span className="hc-cover-topline">CAMBRIDGE, MASSACHUSETTS</span><AcademicShield/><span className="hc-cover-wordmark">HARVARD</span><span className="hc-cover-subtitle">Um atlas<br/><em>de ideias.</em></span><span className="hc-cover-rule"/><span className="hc-cover-motto">VERITAS</span><span className="hc-cover-date">EST. 1636</span><span className="hc-cover-open">Abrir o volume <Arrow/></span>
      </button>
    </div>
    <div className="hc-book-controls">{opened ? <><button className="hc-close" onClick={close}>Fechar o volume</button><div className="hc-pagination"><button onClick={() => navigate(page - step)} disabled={page === 0 || Boolean(turn)} aria-label={single ? 'Página anterior' : 'Páginas anteriores'}><Arrow back/></button><span aria-hidden="true">{String(page + 1).padStart(2, '0')}{!single && ` — ${String(page + 2).padStart(2, '0')}`}<i/>10</span><button onClick={() => navigate(page + step)} disabled={page >= lastPage || Boolean(turn)} aria-label={single ? 'Próxima página' : 'Próximas páginas'}><Arrow/></button></div></> : <p>Um volume para abrir. Novos caminhos para descobrir.</p>}</div>
    <p className="hc-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
  </section>;
}
