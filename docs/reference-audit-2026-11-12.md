# Referências e ativos prontos — 12/11/2026

## Escopo desta revisão

Foram relidas as notas de 11/11 e consultadas as páginas primárias de Sendoso, Fulfyld e OrderGrid. O Dribbble instalado foi observado no render atual do OrderGrid: duas composições isométricas de recebimento/reposição, com detalhe parcial do render abaixo. Não houve revisão quadro a quadro dos vídeos nem acesso aos arquivos originais de modelagem. Os nove novos anexos não estavam disponíveis como arquivos no diretório temporário indicado nesta sessão; não atribuir a esta nota uma inspeção direta deles.

## Observações e aplicação em Harvard

- **Composição conectada:** OrderGrid usa uma laje única com espessura visível. Racks, recebimento, circulação e interior formam uma cadeia operacional. Em Harvard, uma base contínua deve ligar recebimento, arquivo, leitura e expedição; preservar espaços percorríveis entre as estações.
- **Escala consistente:** caixas têm altura de carga humana, mesas e racks são alcançáveis, e pés apoiam no piso. A proporção entre personagens e mobiliário é mais convincente que aumentar o número de peças.
- **Volumes pequenos reconhecíveis:** montantes e travessas das estantes, aros e rodas dos carrinhos, molduras e peças da cabine, caixas com fitas e etiquetas. A silhueta precisa continuar identificável no enquadramento completo.
- **Materiais por função:** caixas kraft, piso claro, racks metálicos, vidro e roupa são separados por reflexo, cor e acabamento. Grandes superfícies neutras tornam legíveis os detalhes. Evitar granulação forte ou contraste em toda a superfície; usar relevo fino e brilho localizado.
- **Luz e cor:** paredes navy escuras e piso branco criam contraste local; o roxo funciona como acento de marca. A tradução em Harvard pode usar papel marfim, madeira clara, metal navy e um acento crimson, preservando faces em sombra legíveis.
- **Coreografia:** a direção documentada do Sendoso usa atividades simultâneas no mesmo quadro. Cada livro/caixa precisa ter origem, transportador, pausa de contato e destino; a ação deve explicar a estação.
- **Painéis e arquitetura:** placas podem ter espessura, bordas, molduras e encaixes reais. O texto deve servir à cena; não encobrir as ações principais.

As páginas confirmam autoria e natureza do trabalho, mas não demonstram qual software, rig ou técnica foi usado. Tags como Cinema4D/Blender não são comprovação do processo de um shot específico.

### Fontes primárias

- Vedant Hegde, [Sendoso](https://dribbble.com/shots/27323649-3D-Animation-For-Sendoso-com): animação para o rodapé do site; página apresenta conceito e personagens.
- Vedant Hegde, [Fulfyld](https://dribbble.com/shots/22429058-3D-Animation-for-Fulfyld-com): animação de marca.
- Vedant Hegde, [OrderGrid](https://dribbble.com/shots/24684568-3D-Illustrations-for-OrderGrid-com): conjunto de oito ilustrações.

## Modelos prontos com licença confirmada

Estes são candidatos pesquisados, ainda não incorporados por esta revisão. A página oficial de cada modelo e a [licença Poly Haven](https://polyhaven.com/license) identificam CC0. Usar mapas 1K/2K nas miniaturas; não carregar os pacotes 4K completos sem avaliar o tamanho. Os números de triângulos são os informados pelo catálogo, não medições da versão a importar.

| Uso | Modelo e fonte oficial | Autor | Forma / orçamento | Aplicação |
| --- | --- | --- | --- | --- |
| Cadeira leve | [Painted Wooden Chair 01](https://polyhaven.com/a/painted_wooden_chair_01) | Kuutti Siitonen | glTF; 724 tri; 1 m de altura; CC0 | Cadeiras de leitura reais com encosto e travessas; recoloração deve preservar madeira/pintura e manter escala. |
| Mesa | [Small Wooden Table 01](https://polyhaven.com/a/small_wooden_table_01) | Ulan Cabanilla | glTF; ~3 mil tri; 0,9 m de largura; CC0 | Mesas laterais e de apoio com pés torneados, travessas e acabamento de madeira. |
| Luminária articulada | [Desk Lamp Arm 01](https://polyhaven.com/a/desk_lamp_arm_01) | Kuutti Siitonen; rig por Yann Kervran | glTF; ~26 mil tri; 0,9 m; CC0 | Uma ou duas peças em área focal; articulada com molas e fixação de mesa. Avaliar versão simplificada antes de repetir. |
| Enciclopédias | [Book Encyclopedia Set 01](https://polyhaven.com/a/book_encyclopedia_set_01) | John Malcolm | glTF; ~67 mil tri para o conjunto; 0,6 m de largura; CC0 | Conjunto de couro e papel com lombadas douradas para uma estante ou mesa focal. Não repetir dezenas de conjuntos completos. |
| Livros variados | [Decorative Book Set 01](https://polyhaven.com/a/decorative_book_set_01) | James Ray Cock; capas comunitárias | Blend/FBX/USD exibidos; 87 capas originais CC0 | Bom conjunto para extrair poucas geometrias e capas variadas; o pacote completo 4K exibido tem ~671 MB e não é um ativo web pronto para carga direta. |
| Alternativa econômica | [Furniture Kit](https://kenney.nl/assets/furniture-kit) | Kenney | 140 arquivos; CC0 | Mobiliário simples, útil para peças secundárias; acabamento estilizado e pouca geometria não substituem os modelos focais detalhados. |

IDs para a API pública do Poly Haven: `painted_wooden_chair_01`, `small_wooden_table_01`, `desk_lamp_arm_01`, `book_encyclopedia_set_01`, `decorative_book_set_01`. Os endpoints oficiais `https://api.polyhaven.com/files/<id>` listam os arquivos e mapas; consultar antes de montar URLs de download.

## Ferramentas locais encontradas

- **Blender 5.2.2 está instalado**, confirmado pela leitura do `Info.plist`: `/Applications/3D Design/Blender.app/Contents/MacOS/Blender`. Bundle `org.blenderfoundation.blender`. O alias em `/Applications/atalho de Blender` aponta para essa pasta.
- `blender` não está no PATH; usar o caminho absoluto acima. O aplicativo não foi iniciado nem recebeu alterações nesta revisão.
- `spline` não está no PATH e `/Applications/Spline.app` não existe. Isso não verifica eventual conta web Spline nem outro local de instalação.

## Incorporação posterior autorizada nesta sessão

Após a pesquisa, foram baixados os glTF oficiais 1K de **Desk Lamp Arm 01** e
**Painted Wooden Chair 01**, com todos os MD5 de origem conferidos. Os arquivos
foram empacotados em GLB preservando geometrias, materiais, UVs e bytes das
texturas. Pasta: `public/assets/collection-models/`, com créditos e manifestos.
O novo `src/ArchiveCollectionModels.jsx` exporta `ReadyDeskLamp`, `ReadyBookSet`
e `ReadyReadingChair`; os livros reutilizam o glTF 2K já baixado pelo agente de
modelos em `public/assets/ready-models/encyclopedias/`.

As verificações de sintaxe JSX, estrutura GLB, carregamento de geometria com
Three.js e presença de UVs passaram. Luminária: 24.102 triângulos, ~2,87 MB;
cadeira: 724 triângulos, ~492 KB. O processo Blender instalado caiu ao iniciar
em background (código 139), antes da importação; não foi usado na conversão e
não há render dele para certificar aparência. A revisão visual integrada fica
com a raiz. Nenhuma publicação foi realizada por este agente.
