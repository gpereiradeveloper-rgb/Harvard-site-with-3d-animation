# O arquivo vivo — direção editorial

Figma editável: https://www.figma.com/design/5JLgqQ96GqZeNzydUQIA0K

Sessão: `ba6ceeab-5fba-4aaa-a45c-b09c8a503066`.

## Composições

- Desktop / arquivo: `3:2`, 1440 × 900.
- Desktop / passagem: `3:24`, 1440 × 900.
- Mobile / arquivo: `3:46`, 390 × 844.
- Mobile / passagem: `3:68`, 390 × 844.
- Componentes locais editáveis: `3:3`, `3:25`, `3:47`, `3:69`.

Cada composição usa uma instância editorial, seis camadas de texto e um vetor. Nenhum screenshot foi importado como interface. O fundo neutro apenas permite avaliar a tipografia; o cenário 3D permanece no aplicativo.

## Tipografia e cor

As fontes já usadas pelo produto foram preservadas: **Playfair Display**, regular e italic, para títulos; **Manrope**, regular/medium/semibold, para metadados e legendas. Família e estilos disponíveis foram confirmados no Figma; a leitura estrutural não encontrou famílias incorretas.

- Título desktop: 76 px, entrelinha 98%, tracking −3,5%.
- Título mobile: 42 px, entrelinha 98%, tracking −3,5%.
- Legenda: 13/22 px desktop; 12/20 px mobile.
- Identificação: 10 px desktop, 9 px mobile, tracking 18%.
- Tinta: `#1B2528`; crimson: `#A51C30`; legenda: `#5E6461`.
- Posição desktop: esquerda 5%, topo 143 px no frame de 900 px; mobile esquerda 6%, topo 106 px.

A descoberta de bibliotecas não encontrou um bloco editorial aplicável ou estilos Manrope. Os estilos genéricos de Material 3 não correspondem à tipografia do produto e não foram selecionados. Não havia Code Connect no projeto. A composição foi criada com texto real, auto-layout e componentes locais.

## Texto final

**02 / O ATELIÊ DE IDEIAS**

O arquivo / *vivo.*

Entre livros, ideias / e gestos que atravessam o tempo.

ROLE PARA EXPLORAR ↘

**03 / ENTRE PÁGINAS**

Uma história / *abre outra.*

Memórias preservadas. / Novos caminhos para descobrir.

CONTINUE ATÉ O ÁLBUM ↘

## Integração

`ArchiveEditorial.jsx` exporta o componente padrão `ArchiveEditorial({ phase, className })`. Importar na aplicação e substituir os dois blocos antigos `hj-world-label` e `hj-drawer-cue` por `<ArchiveEditorial phase={phase} />`.

As opacidades usam os sinais existentes `--j-church-copy` e `--j-drawer-cue`. Não alteram a timeline, o mapa, a capa, o álbum ou os controles. Todos os elementos são transparentes a eventos de ponteiro. O texto permanece em HTML e é acessível apenas na etapa correspondente.

## Verificação

Quatro frames foram lidos estruturalmente, com dimensões e famílias confirmadas. O screenshot desktop foi inspecionado: título e legenda íntegros, sem recorte ou sobreposição; o excesso de espaço da identificação foi corrigido no auto-layout. O navegador final da aplicação deve confirmar a composição junto à nova câmera e ao cenário. Não se atribui a esta etapa uma validação visual do mundo 3D.
