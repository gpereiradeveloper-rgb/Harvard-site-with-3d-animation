# Checkpoint — Harvard immersive, 5 November 2026

## User intent and current acceptance
The user wants a photographic/lifelike Harvard experience, not a maquette. Scroll must walk continuously THROUGH successive interior spaces, approach a realistic crimson/gold folio, open it and travel INTO a word/page before discovering the Yard. Igloo and Scrolltide Umbral/Rann Mahal are reference quality; do not copy proprietary assets. The current preview is still rejected as too artificial. Do not claim the project is complete or native 8K everywhere.

Latest specific correction: frosted/blue main windows are unacceptable. They must become clear with coherent exterior space, real parallax, convincing light and reflections. Do not restore a flat photo pasted behind glass. Current frost is a temporary unsuccessful workaround.

## Budget
User explicitly selected CONTINUE WITHOUT NEW PAID GENERATION. Do not start Higgsfield trials, subscriptions, purchases or paid jobs. Previous single authorized exterior film is already generated: MiniMax H3, 2560x1440, 5.167s. Higgsfield balance was verified 0. Quotes only: 15s MiniMax2K30 credits, Kling4K90, FLUX4K195. No new job submitted. DLSS5 is NVIDIA RTX technology, unavailable directly on the Apple M5/browser; do not advertise DLSS in the site.

## Project and preview
Checkout: /Users/guilhermepereiragalvao/Documents/Codex/2026-11-04/co/work/harvard-veritas
Existing public Sites project: appgprj_6aeb7e535db08191846d8c78e5dbd7dc
Live older edition: https://harvard-veritas-immersive.greenhoop2.chatgpt.site/
Local dev: http://127.0.0.1:5174/ (server already running, avoid duplicate). Last HTTP readiness:200. This checkpoint is NOT a new deployment. Preserve PUBLIC audience. Use Sites skill/source helper for future synchronization and publication; credentials must stay in session memory/stdin, never files.

## Implemented
- main.jsx: GSAP ScrollTrigger + Lenis shared ticker,900svh desktop/800mobile, decoupled camera progress,5chapters, modal/audio controls. Current import is ArchiveWorld.jsx, not old HarvardWorld/CinematicScene.
- ArchiveWorld.jsx: full metre-scale hallway camera route, continuous CatmullRom arc-length walk until p=.5, book approach and A-hole portal p=.65-.81, panorama after.81. New stronger window sunlight/lower ambient, area-light library initialized, tone mapping/N8AO/SMAA/low bloom.
- ArchiveHall.jsx: true arches/columns/coffered ceiling/panelling. Photographic plaster PBR, frostedglass currently MUSTREPLACE per latestfeedback.
- ArchiveFloor.jsx: textured rough oak, planar reflection512/1024, restrained mirror. Still needs aesthetic and performance review.
- ArchiveFurnishings.jsx: licensed CC0 scanned bookcases/books/desks/chairs, green reading lamps. LOD geometry with stable textures/DPR.
- VeritasBook.jsx: red4Kleather albedo/2Knormalroughness, raised gold lettering, paper fibres, animated hinges/pages, physical portal to actual A counterhole.
- RenderQuality.jsx: persistent fixed quality mode, one Canvas dpr source. No scroll/mouse/FPS downgrades. Cinema16MPcap,maxdimension8192; not promised8Kframebuffer.
- LoopingFilm.jsx: custom rAF250ms fading from heldopacity, fadeout.55seconds beforeend,100msendeddelay, cancellationguards. Posterfallback.
- WidenerTour.jsx/CSS: native dialog lazily embeds official public Matterport tour (fs3gQv7n1QG),brandingretained,externalfallback. Integrated header/mobile buttons and modal scroll/audio/render pause. Browser embed still unverified.
- HarvardSquare real CC BY ambient replaces syntheticoscillators. OfficialCollegefilm native AAC is digital silence, cannot invent originalsound; captiontruthfullyseparateambience. AudioUXbrowserchecks stillpending.

## Verification so far
Latest productionbuild passed after WidenerTour integration. Nine meaningful quality-persistence and rAFfade tests passed. Agent geometry reports in this folder. No browsererror logs on previous hall view. Browser screenshots show meaningful lighting improvement but user still sees maquette. Do NOT turn these checks into a claim of photographic realism.

## Unfinished / next steps
1. Complete free exterior real3Dtrees/ground. Subagent hit usage limit. Only public/assets/exterior/jacaranda_tree/jacaranda-tree.gltf and .bin were written; textures may be missing! Not imported or deployed. Inspect GLTF image URIs, obtain official PolyHaven CC0 source, optimize within ~20MB. No ArchiveExterior.jsx exists yet.
2. Replace frostedblue windows with clear physical glass. Add local room reflection probe, coherent sun/exterior illumination; no flat-photo fallback. PCSS soft shadows were researched but NOT applied. No SSGI package installed.
3. Browser-check bookopening/readabletext/portaljoin, camera path and actual stableDPR during chapters/reload. Confirm no clipping/blankpage; current path was revised but closeupnotyetreviewed.
4. Verify Widener official iframe in CUA. This is a real photographic tour from Harvard Library, NOT ours or custom-scroll API. Matterport SDK requires account/key/licensing; do not bypass.
5. Finish credits/README/VALIDATION,remove unused legacy modules/assets after safebackup. public assets~137MB with unused alternatives. Current CREDITS-v4 still describes abandoned Lokerphotoplane (not currenthall), needscorrection.
6. User asked to save all progress due usage limit. This checkpoint and ZIP preserve source/assets/audit. Continue from here, do not rebuild from scratch or keep promising the screenshot will become lifelike through resolution alone.

## Browser
Use cua_repl for all browser control, rewriteDocumentation after compaction. Selected IAB browser id2. Latest preview tabid4; mayexpireonturnend, rebind/listtabs first. Viewport actual769x827 CSS; prior viewport.set reported success withoutapplying. Reset viewportcap ifsessionstillset. No arbitrary browser automation via shell.

## Primary references
https://www.scrolltide.co/templates/rann-mahal — officialdescription: onefilmcutto240frames,5copychapters.
https://www.scrolltide.co/templates — Umbral isonecontinuouscamerafilm.
https://www.scrolltide.co/templates/mariana —11plates stackedindepth.
https://news.harvard.edu/gazette/story/2020/04/360-degree-virtual-tour-simulates-walk-through-widener-library/
https://library.harvard.edu/libraries/widener
https://my.matterport.com/show/?m=fs3gQv7n1QG
https://research.nvidia.com/labs/adlr/DLSS5/
