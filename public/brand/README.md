# Assets de marca — status e procedência

## Estes arquivos NÃO são o master oficial da marca

`symbol.svg` e `wordmark.svg` são **vetores canônicos de implementação**:
reconstruídos a partir dos PNGs aprovados em `references/`, precisos o bastante
para o site e validados contra a origem, mas **não** substituem um master
vetorial oficial caso ele venha a existir.

Se um master (SVG/AI/EPS/PDF) for produzido, ele **substitui** estes arquivos.
Nenhum componente precisa mudar: os consumidores referenciam apenas estes
caminhos e as métricas do `*-geometry.json`.

## Procedência

| Arquivo        | Origem                                                              | Método                          |
| -------------- | ------------------------------------------------------------------- | ------------------------------- |
| `symbol.svg`   | `references/logoNavite.png` (1254×1254)                             | `node tools/build-symbol.cjs`   |
| `wordmark.svg` | `references/navite-symbol-to-use-in-Header-official.png` (1944×809) | `node tools/build-wordmark.cjs` |

Pipeline (`tools/trace.cjs`): máscara por limiar → contorno por marching squares
com interpolação sub-pixel → reamostragem por comprimento de arco → detecção de
cantos por virada acumulada → ajuste por segmento (reta / arco de círculo /
cadeia de Béziers de Schneider).

## Fidelidade medida

|                | erro médio | erro máximo |
| -------------- | ---------- | ----------- |
| `symbol.svg`   | 0,14 px    | 0,62 px     |
| `wordmark.svg` | 0,56 px    | 0,94 px     |

Erros em pixels do PNG de origem, medidos **analiticamente** contra o contorno
traçado — sem passar por rasterização, que introduz ~1px de ruído (arredondamento
sub-pixel de posicionamento em CSS + limiar de máscara).

Validação visual e por rasterização: `node tools/validate-symbol.cjs`
(IoU da silhueta 95,95%).

## Uma decisão que vale conhecer: o símbolo foi simetrizado

`logoNavite.png` é assimétrico **consigo mesmo**: os dois lobos divergem
progressivamente rumo às pontas, até **7,7 px** (1,9% do raio externo). Os
círculos externos ajustados aos dois lados ficam a ~40 px de distância um do
outro.

Como o desenho pretendido é evidentemente simétrico, `symbol.svg` é construído a
partir da **média dos dois lobos** (alinhados por rotação de 180° e reamostrados
por comprimento de arco, segmento a segmento) e instancia essa crescente
canônica duas vezes:

```xml
<use href="#navite-crescent"/>
<use href="#navite-crescent" transform="rotate(180 500 500)"/>
```

Isso reparte o erro em vez de herdar o defeito de um dos lados, e — decisivo
para este site — torna **separar e reunir as metades matematicamente exato**,
que é a interação central da experiência.

Consequência a registrar: nenhuma reconstrução exatamente simétrica pode ficar
abaixo de ~3,9 px de desvio contra o PNG bruto. O critério de aceite é medido
contra a referência **simetrizada**, não contra o bruto.

## Geometria do símbolo, medida

- borda externa: arco de círculo limpo (|erro| médio ~0,6 px)
- borda interna: quase circular no corpo, mas **fecha mais rápido perto da
  ponta** do que um lune de dois círculos permitiria (o modelo paramétrico erra
  18 px em φ=243°) — por isso é representada por Béziers, não por um arco
- ponta: **cúspide real** — espessura 19 → 10 → 5,5 → 1,6 → 0 px
- outro terminal: **corte reto**, ~93 px de espessura (ajusta uma reta com
  0,015 px de erro)
- extensão de cada crescente ≈ 152°, com vãos de ≈ 28°

## Métricas do wordmark, medidas

Todas preservadas na reconstrução (ver `wordmark-geometry.json`):

- altura de caixa TECH / NAVITE = **0,52**
- vão vertical entre as palavras = **0,73** da altura de caixa do NAVITE
- largura / altura de caixa do NAVITE = **8,75**
- TECH **não é centralizado** sob NAVITE: fica 40,6 px (no PNG) à direita do
  centro óptico. É intencional na arte e foi mantido.
- o **A não tem travessão** — é um Λ. Nenhuma das 10 letras tem contraforma
  fechada, o que é por que o traçado encontra exatamente 10 contornos.

## Cor

`wordmark.svg` usa `currentColor` para NAVITE e `var(--brass)` para TECH, então
herda os tokens do design system. Ver `styles/tokens.css`.

## Regerar

```bash
node tools/build-symbol.cjs
node tools/build-wordmark.cjs
node tools/validate-symbol.cjs   # precisa de uma captura; ver o próprio script
```

## Relevo: luz e ponto de vista, medidos no `hero-reference.png`

O relevo sintético (`components/symbol/`) não é estilização — os parâmetros
saíram de medição, e três suposições iniciais estavam erradas:

| parâmetro                | valor                                                     | como foi obtido                                                                                                         |
| ------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| direção da luz           | `(0,99, −0,14)` — quase lateral, 8,2° acima da horizontal | ajuste de plano `L = c0 + c1·x + c2·y` por mínimos quadrados sobre 35.263 pixels de material, descartando 5 px de borda |
| deslocamento da extrusão | `(−16,2, +10,8)` unidades de viewBox                      | largura da banda escura: ~9 px na horizontal e ~6 px na vertical numa crescente de 277×516                              |
| rampa da face            | 230 → 192 de luminância                                   | luminância média por faixa de posição ao longo do eixo de luz (`tools/fit-light-ramp.cjs`)                              |

Três correções que a primeira versão trazia:

1. **O componente horizontal da luz estava invertido.** A referência clareia para
   a direita nas duas metades; a reconstrução escurecia. Passou despercebido
   porque `tools/compare-relief.cjs` só media o perfil **vertical** — direção de
   luz é vetor, e agora a ferramenta mede os dois eixos e falha se o sinal da
   inclinação divergir.
2. **A extrusão não é o oposto da luz.** São vetores independentes: luz é de onde
   vem a iluminação, extrusão é paralaxe entre a face da frente e a de trás.
3. **Não existe "rebote do chão".** O que parecia rebote no perfil vertical era o
   gradiente horizontal vazando: embaixo o arco está mais à direita, logo mais
   claro. Ao longo do eixo correto a rampa é monótona.

O gradiente tem **direção global** mas **ancoragem por metade**. Direção global
porque as duas metades são iluminadas do mesmo lado (desvio médio 11,0 entre elas
na mesma orientação, contra 24,0 espelhadas). Ancoragem por metade por dois
motivos: cada crescente percorre sozinha ~68 níveis de luminância na referência,
que um eixo único não conseguiria dar às duas; e sob luz distante transladar um
objeto não muda o sombreamento dele — com eixo global a metade mudaria de brilho
ao atravessar a tela durante o scroll.

A parede de extrusão é a **região varrida** pelo contorno ao deslizar por
`EXTRUDE_OFFSET` — a soma de Minkowski com esse segmento — pré-calculada em tempo
de build por `tools/build-extrude.cjs` e emitida em `lib/symbol/extrude.ts`. Uma
única cópia deslocada se descola da face onde o arco é mais fino que o
deslocamento, e a cúspide aparecia **bifurcada**, o que descaracteriza um dos dois
terminais que definem a crescente.

A primeira solução varria em 16 cópias `<use>`. Visualmente idêntica, mas medida
como o custo inteiro do relevo: qualquer mudança de escala obriga o navegador a
rasterizar tudo de novo, e o p95 do tempo de quadro ia de 25ms (linha de base)
para 42ms durante as transições. Com o path único, ~35ms — e a cúspide continua
íntegra.

## Divergência conhecida: o hero engorda o arco

Preenchimento medido (área de material / área da caixa) de uma crescente:

| fonte                      | preenchimento |
| -------------------------- | ------------- |
| `logoNavite.png` (oficial) | 21,9% e 22,1% |
| `hero-reference.png`       | 27,1% e 28,7% |
| vetor + extrusão           | 23,2%         |

O render do hero é um frame conceitual e tem o arco ~25% mais gordo que a marca
oficial. Pela hierarquia de decisão aprovada, **o logo oficial vence a
geometria**; o hero vale como referência de **material e luz**. Por isso
`tools/compare-relief.cjs` reporta a área mas **não** a usa como critério.

O `hero-reference.png` também mostra as duas metades **ligeiramente desencaixadas**
(a direita 36 px mais baixa e 6 px mais à direita). É pose de composição 3D, não
o lockup da marca — `logoNavite.png` é exatamente simétrico.
