import type { Metadata } from 'next';
import { Section } from '@/components/chrome/Section';
import { SectionProgress } from '@/components/sections/SectionProgress';
import { ServiceCardStack } from '@/components/services/ServiceCardStack';
import { SERVICES } from '@/lib/content/services';
import { VISUAIS } from '@/components/services/visuals';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Rule } from '@/components/ui/Rule';
import pagina from '@/app/page.module.css';

/**
 * Rota de diagnóstico: a MESMA seção Serviços, com os visuais girados um lugar.
 *
 * Existe para o aceite da Fase 8 — "cada visual trocável alterando uma prop,
 * comprovado por um teste de render". A prova é comparativa: se trocar o mock
 * fosse mudança estrutural, a árvore do card fora do slot mudaria junto, e é
 * exatamente isso que `scripts/check-visuais.mjs` compara entre esta rota e a
 * home.
 *
 * O giro é feito aqui, não no componente: a página passa `visuais`, e nada mais
 * muda. Fora dos buscadores e do sitemap.
 */
export const metadata: Metadata = {
  title: 'Serviços — troca de visual',
  robots: { index: false, follow: false },
};

const GIRADO = Object.fromEntries(
  SERVICES.map((s, i) => [s.id, VISUAIS[SERVICES[(i + 1) % SERVICES.length]!.id]!]),
);

export default function Page() {
  return (
    <main id="conteudo">
      <Section id="servicos" titleId="servicos-titulo">
        <SectionProgress id="servicos" />
        <div className={pagina.servicos}>
          <div className={pagina.servicosText}>
            <Eyebrow className={pagina.servicosEyebrow}>O que construímos</Eyebrow>
            <h2 id="servicos-titulo" className="title">
              O QUE
              <br />
              <span className="u-editorial-accent">CONSTRUÍMOS.</span>
            </h2>
            <Rule className={pagina.rule} />
            <p className={`lead ${pagina.servicosLead}`}>
              Web, software, automação e IA.
              <br />O caminho depende do problema.
            </p>
          </div>

          <ServiceCardStack visuais={GIRADO} />
        </div>
      </Section>
    </main>
  );
}
