# Qualidade e áudio — auditoria da edição atual

## 1. Queda de resolução: causa confirmada no código

`src/CinematicScene.jsx` passa `dpr={1}` ao Canvas, enquanto `Cinematography` usa `setDpr` em um efeito dependente apenas de `quality` e tamanho. O Canvas do R3F chama `root.configure` em seu layout effect a cada render. A implementação instalada de `configure` compara o DPR do store com o DPR recebido e volta a chamar `state.setDpr(dpr)`. Portanto, um render do pai causado pelo capítulo, estado da introdução, inspeção, iluminação ou modal pode reaplicar 1; o efeito que havia escolhido Cinema não roda novamente se a qualidade e o tamanho continuaram iguais.

Evidência local: `node_modules/@react-three/fiber/dist/react-three-fiber.esm.js` (layout effect/configure, linha 82) e `node_modules/@react-three/fiber/dist/events-e51d7528.esm.js` (linha 1659).

Correção preparada em `src/RenderQuality.jsx`: um perfil determinístico e um único DPR declarativo passado ao Canvas. Nenhum estado de scroll, ponteiro, capítulo, visibilidade ou FPS altera o perfil. As opções manuais têm limites fixos de pixels/dimensão e persistem em localStorage. Não usar um segundo `setDpr`, `AdaptiveDpr` ou um Canvas com `dpr={1}` ao mesmo tempo.

Integração recomendada:

```jsx
const [quality, setQuality] = usePersistentRenderQuality('auto');
const profile = useViewportRenderQuality(quality);
return <Canvas dpr={profile.dpr}>...</Canvas>;
```

## 2. Resolução da arte de fundo

O cenário inicial é uma imagem de 1672 × 941 projetada em um plano. Aumentar o drawing buffer não cria detalhes fotográficos inexistentes nessa imagem. A fotografia 360° de 8192 × 4096 pertence a outro componente e não eleva a resolução do cenário principal.

## 3. O filme oficial tem trilha AAC

O arquivo local `work/harvard-upgrade-assets/campus-official-reference.mp4` foi inspecionado pelo parser MP4 (trak/mdia/hdlr e stsd) e por `/usr/bin/afinfo`:

- Uma trilha de vídeo `avc1`.
- Uma trilha de áudio `mp4a` / AAC.
- Áudio estéreo, 48.000 Hz, duração estimada de 13,844 segundos.
- 550.284 bytes de áudio, 651 pacotes, bitrate aproximado de 316.983 bit/s.

Atualização: o agente references_and_film decodificou o arquivo com Swift/AVFoundation em execução aprovada. AVAssetReader completou, com 1.329.024 amostras float32, RMS 0,0 e pico 0,0: a trilha AAC contém silêncio digital. Desmutar esse arquivo não produz som. `afconvert` não conseguiu convertê-lo na execução local restrita, mas o leitor AVFoundation completou a medição.

## 4. O controle SOM não controla o vídeo

`CampusFilm` define `muted` incondicionalmente no `<video>`. O botão global SOM chama `toggleSound`, que cria somente três osciladores sine de 130,81 / 196 / 261,63 Hz e altera o ganho deles. Esse estado nunca chega ao elemento de vídeo e nunca muda `muted` ou `volume` do filme. É necessário usar um estado de áudio único, conectar os controles ao vídeo e iniciar o áudio por gesto do usuário. A síntese atual é uma tríade sustentada simples, sem gravação ambiente, dinâmica ou transições.

## Validação preparada

`node --test ../v4-audit/render-quality.test.mjs`: seis testes passaram, cobrindo 2.000 reconfigurações de estados não relacionados, limites de 96 combinações de resolução/DPR/preset, alvos manuais, entradas corrompidas, persistência e armazenamento bloqueado. A validação no navegador ainda cabe à integração do root: comparar `canvas.width/height` antes e depois de rolar, mover o ponteiro, trocar capítulo e abrir/fechar modal.
