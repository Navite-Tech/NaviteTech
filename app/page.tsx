import { Fragment } from 'react';
import { Section } from '@/components/chrome/Section';
import { CubeStage } from '@/components/cubes/CubeStage';
import { SectionProgress } from '@/components/sections/SectionProgress';
import { ServiceCardStack } from '@/components/services/ServiceCardStack';
import { ProblemAnnotations } from '@/components/sections/ProblemAnnotations';
import { ProcessStage } from '@/components/process/ProcessStage';
import { METODO_VARS } from '@/lib/motion/estados';
import { FaqList } from '@/components/sections/FaqList';
import { ContactForm } from '@/components/sections/ContactForm';
import { SymbolStage } from '@/components/symbol/SymbolStage';
import { BitEyes } from '@/components/symbol/BitEyes';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Rule } from '@/components/ui/Rule';
import { PillButton } from '@/components/ui/PillButton';
import { HERO_AMBIENT } from '@/lib/content/ambient';
import { CONTATO_COPY } from '@/lib/content/contato';
import { JOURNEY_ID } from '@/lib/scroll/triggers';
import { faqJsonLd, organizationJsonLd, serializar } from '@/lib/seo/jsonld';
import styles from './page.module.css';

/**
 * Estrutura narrativa das 6 seções.
 *
 * A camada do símbolo é irmã de `<main>`, não filha de nenhuma seção: é o que
 * garante que ela nunca seja remontada nem troque de pai enquanto a página rola.
 *
 * Fase 5: o hero está completo — composição, ambientação e entrada. As demais
 * seções seguem com as alturas de rolagem definitivas e a tipografia real, para
 * que as fronteiras medidas sejam as de verdade; o conteúdo delas entra das
 * fases 6 em diante.
 */
export default function Page() {
  return (
    <>
      {/*
       * Duas camadas persistentes, irmãs de <main> e nunca remontadas: os cubos
       * atrás, o símbolo à frente. O campo precisa disto tanto quanto o símbolo
       * — o §11 pede as MESMAS instâncias do Problema chegando aos clusters do
       * Processo, e um campo preso ao fundo de uma seção sai de cena com ela.
       */}
      {/*
       * Dados estruturados (§15). Renderizados no servidor, dentro do corpo:
       * o `<head>` do App Router é montado pelo metadata, e um script de
       * ld+json não é metadata — é conteúdo que descreve a página. O Google lê
       * nos dois lugares.
       *
       * `Organization` hoje carrega dois campos verdadeiros. Ele cresce sozinho
       * quando `lib/config/site.ts` for preenchido.
       */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializar(faqJsonLd()) }}
      />
      {organizationJsonLd() && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializar(organizationJsonLd()!) }}
        />
      )}

      <CubeStage />
      <SymbolStage />

      {/*
       * `tabIndex={-1}` no alvo do skip-link, e ele NÃO é decorativo.
       *
       * Um `<a href="#conteudo">` sempre ROLA até o alvo, mas só move o FOCO se
       * o alvo for focável — e `<main>` não é. Medido: depois de acionar o
       * skip-link, `document.activeElement` continuava sendo o `<body>`, então
       * a tabulação seguinte recomeçava do header e o link não pulava nada. É o
       * defeito clássico do skip-link, e ele é invisível a olho nu porque a
       * página de fato rola.
       *
       * Negativo, não zero: o alvo recebe foco por programa, nunca entra na
       * ordem de tabulação.
       */}
      <main id="conteudo" tabIndex={-1}>
        <div id={JOURNEY_ID}>
          <Section id="hero" titleId="hero-titulo" ambient={HERO_AMBIENT} ambientDelay={0.95}>
            <SectionProgress id="hero" fim="bottom top" />
            <div className={styles.hero}>
              <div className={styles.heroText}>
                {/*
                 * Uma linha por `<span>` de bloco para a máscara de entrada
                 * (§9.2). O texto acessível continua sendo uma frase só: nada
                 * aqui é aria-hidden e nenhuma palavra é fatiada.
                 *
                 * Os `{' '}` entre as linhas NÃO são enfeite. O JSX descarta o
                 * espaço em branco que contém quebra de linha, então sem eles o
                 * `textContent` do h1 sai "Tecnologia parao que precisafuncionar
                 * melhor." — que é o que um leitor de tela pode anunciar.
                 */}
                <h1 id="hero-titulo" className={`display ${styles.heroTitle}`}>
                  <span className={styles.line} style={{ '--i': 0 } as React.CSSProperties}>
                    <span className={styles.lineInner}>Tecnologia para</span>
                  </span>{' '}
                  <span className={styles.line} style={{ '--i': 1 } as React.CSSProperties}>
                    <span className={styles.lineInner}>o que precisa</span>
                  </span>{' '}
                  <span
                    className={`${styles.line} u-editorial-accent`}
                    style={{ '--i': 2 } as React.CSSProperties}
                  >
                    <span className={styles.lineInner}>funcionar melhor.</span>
                  </span>
                </h1>

                <Rule className={styles.heroRule} />

                <p className={`lead ${styles.heroLead}`}>
                  Produtos digitais, sistemas e automações construídos a partir do problema — não da
                  tecnologia.
                </p>

                <div className={styles.heroCta}>
                  <PillButton href="#contato">Conte o problema</PillButton>
                </div>
              </div>
            </div>
          </Section>

          <Section id="problema" titleId="problema-titulo">
            <SectionProgress id="problema" />
            <div className={styles.shell}>
              <div className={styles.problemaText}>
                {/*
                 * Quatro linhas, como na referência: duas em bone e duas em
                 * sage. A quebra é editorial — a coluna é estreita o bastante
                 * para sustentá-la, mas as linhas ficam explícitas para não
                 * dependerem da métrica da fonte.
                 */}
                <h2 id="problema-titulo" className="title">
                  Antes da
                  <br />
                  tecnologia,
                  <br />
                  <span className="u-editorial-accent">
                    existe algo
                    <br />
                    para entender.
                  </span>
                </h2>
                <Rule className={styles.rule} />
                <p className={`lead ${styles.problemaLead}`}>
                  Observamos o que acontece.
                  <br />
                  Identificamos o que trava.
                  <br />
                  Para <span className="u-editorial-accent">só então agir.</span>
                </p>
                <ProblemAnnotations />
              </div>
            </div>
          </Section>

          <Section id="servicos" titleId="servicos-titulo">
            <SectionProgress id="servicos" />
            <div className={styles.servicos}>
              {/*
               * A coluna esquerda fica presa durante a seção inteira (§10.1) —
               * e isso não custa um observador: a tela toda já está presa por
               * `position: sticky`. As colunas centrais ficam VAZIAS de
               * propósito: é onde a metade esquerda do símbolo vive, e ela mora
               * na camada fixa, não aqui.
               */}
              <div className={styles.servicosText}>
                <Eyebrow className={styles.servicosEyebrow}>O que construímos</Eyebrow>
                <h2 id="servicos-titulo" className="title">
                  O QUE
                  <br />
                  <span className="u-editorial-accent">CONSTRUÍMOS.</span>
                </h2>
                <Rule className={styles.rule} />
                <p className={`lead ${styles.servicosLead}`}>
                  Web, software, automação e IA.
                  <br />O caminho depende do problema.
                </p>

                {/*
                 * UM CTA na seção, e não um por card.
                 *
                 * Os quatro cards existem no DOM ao mesmo tempo — é o que a
                 * pilha presa exige, e o que `check:a11y` verifica ao contar os
                 * quatro simultaneamente legíveis. Um link dentro de cada um
                 * seria, no desktop, quatro paradas de teclado dentro de cards
                 * que estão fora do recorte do trilho: foco invisível, e o
                 * navegador rolando um contêiner `overflow: hidden` para
                 * alcançá-lo, o que desmonta a posição da pilha.
                 *
                 * Aqui ele fica na coluna que está visível a seção inteira, e
                 * aponta para o único destino que existe de verdade.
                 */}
                <a href="#contato" className={styles.servicosCta}>
                  Conte o problema
                  <span className={styles.servicosCtaSeta} aria-hidden="true" />
                </a>
              </div>

              <ServiceCardStack />
            </div>
          </Section>

          <Section id="processo" titleId="processo-titulo">
            <SectionProgress id="processo" />
            <div className={styles.processo} style={METODO_VARS as React.CSSProperties}>
              {/*
               * O bloco de texto tem a GEOMETRIA FINAL desde sempre —
               * centralizado, largura de conteúdo, duas linhas. O que a rolagem
               * move é só o `translate` dele (app/page.module.css), da margem
               * esquerda até o centro.
               *
               * É por isso que não há duas poses declaradas aqui: uma requebra
               * de linha no meio da migração seria um salto, e animar largura
               * seria animar layout. A coluna de 22rem que produzia as três
               * linhas da Fase 15 saiu junto com a composição de duas colunas.
               */}
              <div className={styles.processoText}>
                <h2 id="processo-titulo" className="title">
                  Do problema
                  <br />
                  <span className="u-editorial-accent">ao que funciona.</span>
                </h2>
                <Rule className={styles.processoRule} />
                <p className={`lead ${styles.processoLead}`}>
                  Método Navite: do entendimento profundo à evolução contínua.
                </p>
              </div>
              <ProcessStage />
            </div>
          </Section>

          {/*
           * FAQ em FLUXO, não preso (§8.2). A lista muda de altura conforme as
           * perguntas abrem, e uma tela presa de 100dvh não acomoda isso.
           */}
          <Section id="faq" titleId="faq-titulo" flow>
            <div className={styles.faq}>
              <div className={styles.faqText}>
                <h2 id="faq-titulo" className="title">
                  Antes de começar,
                  <br />
                  <span className="u-editorial-accent">o que costumam perguntar.</span>
                </h2>
              </div>
              <FaqList />
            </div>
          </Section>

          <Section id="contato" titleId="contato-titulo">
            {/*
             * O Contato ganhou um escritor de progresso na Fase 14, e ele tem
             * um consumidor só: o Bit. Os olhos precisam saber QUANDO as duas
             * metades se encaixaram — antes disso não existe vão para eles
             * habitarem. É o mesmo componente que Problema, Serviços e Processo
             * já usam; ele não renderiza nada e só publica `--reveal`.
             */}
            <SectionProgress id="contato" />
            <BitEyes />
            {/*
             * Composição CENTRALIZADA (§9.7), e a coluna é estreita por
             * geometria: o `( )` reconstituído fecha exatamente atrás dela, e a
             * medida é o vão interno entre as duas crescentes. Ver
             * app/page.module.css.
             *
             * Não há canal secundário — nem e-mail, nem telefone, nem
             * WhatsApp — porque não existe nenhum definido, e o §21.3 proíbe
             * inventar. Ele entra sozinho quando `lib/config/site.ts` for
             * preenchido.
             */}
            <div className={styles.contato}>
              <div className={styles.contatoBloco}>
                {/*
                 * A chamada mora na PRIMEIRA faixa do bloco, que tem a altura
                 * do vão da peça; o formulário mora na segunda, abaixo dela.
                 * Ver a conta em app/page.module.css.
                 */}
                <div className={styles.contatoChamada}>
                  <h2 id="contato-titulo" className={styles.contatoTitulo}>
                    {CONTATO_COPY.titulo.map((linha, i) => (
                      <Fragment key={linha}>
                        {i > 0 && <br />}
                        {linha}
                      </Fragment>
                    ))}
                  </h2>
                  <Rule className={styles.contatoRule} />
                  <p className={`lead ${styles.contatoLead}`}>{CONTATO_COPY.lead}</p>
                </div>
                <ContactForm />
              </div>
            </div>
          </Section>
        </div>
      </main>
    </>
  );
}
