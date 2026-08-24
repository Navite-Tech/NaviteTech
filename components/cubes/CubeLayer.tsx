'use client';

import dynamic from 'next/dynamic';

/**
 * O campo de cubos entra DEPOIS do primeiro pinte, e não no HTML.
 *
 * Medido: os 168 nós custavam 138KB de marcação, e o App Router os serializava
 * uma segunda vez na carga RSC — o documento inteiro tinha 210KB, dos quais
 * cerca de 85% eram o campo. Tudo isso viajava e era analisado antes de a
 * primeira tela poder pintar, para desenhar algo que só aparece uma seção
 * adiante e que é `aria-hidden` do começo ao fim.
 *
 * O código do campo, minificado, custa uma fração disso — e chega por um chunk
 * próprio, fora do carregamento inicial.
 *
 * NÃO há salto: o estado inicial do campo é `ausente`, com os planos em
 * `scale(0)`. Nada dele é visível no hero, então montá-lo um quadro depois é
 * invisível — o que a captura confirma.
 *
 * A COREOGRAFIA VEM JUNTO, dentro do mesmo módulo, e isso é obrigatório: ela
 * consulta `[data-plane]` na montagem. Fora daqui, ela poderia rodar antes de
 * os planos existirem e sair sem escritor nenhum.
 */
const Campo = dynamic(() => import('./CubeFieldClient').then((m) => m.CubeFieldClient), {
  ssr: false,
});

export function CubeLayer() {
  return <Campo />;
}
