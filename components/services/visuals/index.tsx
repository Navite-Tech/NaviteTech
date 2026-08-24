import type { ComponentType } from 'react';
import { ServiceArt } from './ServiceArt';

/**
 * O visual de cada serviço, por id.
 *
 * É esta tabela — e só ela — que liga um serviço à arte dele. Trocar o visual
 * de um card é trocar uma entrada aqui, ou passar `visuais` para o
 * `ServiceCardStack`; nada na estrutura do card muda (§10.4). É o que
 * `scripts/check-visuais.mjs` verifica, e continua verificando depois da troca
 * das maquetes por arte — o contrato era exatamente este: "trocar por uma
 * captura real depois é trocar um nó JSX, sem mudança estrutural".
 *
 * As quatro maquetes de interface que moravam aqui (WebsiteMock, ProductMock,
 * FlowDiagram, AgentDiagram) saíram na Fase 14. Elas eram 292 nós de DOM
 * desenhando navegadores, gráficos e diagramas dentro de uma coluna de 240px —
 * caprichadas, e ainda assim lidas como placeholder, porque uma miniatura de
 * interface dentro de um card É um placeholder. O que entrou no lugar tem a
 * presença que a referência pede: uma imagem só, ocupando o card inteiro.
 */
export const VISUAIS: Record<string, ComponentType> = Object.fromEntries(
  ['web', 'software', 'automacao', 'ia'].map((id) => {
    const Arte = () => <ServiceArt id={id} ansioso={id === 'web'} />;
    Arte.displayName = `Arte(${id})`;
    return [id, Arte];
  }),
);

export { ServiceArt };
