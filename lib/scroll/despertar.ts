/**
 * Quando a coreografia deve subir.
 *
 * REGRA: no primeiro gesto de rolagem, ou quando o hero terminar de entrar — o
 * que vier primeiro.
 *
 * POR QUÊ, medido. A entrada do hero (§9.2) é animação de CSS, e o primeiro
 * quadro dela só pinta quando a thread principal deixa. Num aparelho de gama
 * média sob 4G lento, o `<p>` do lead — que é o maior elemento com conteúdo da
 * primeira tela, e portanto o LCP — aparecia 1,7s DEPOIS do primeiro pinte:
 * 1,8s de FCP contra 3,5s de LCP. O intervalo é a hidratação, o GSAP e oito
 * gatilhos de rolagem sendo criados, tudo disputando a mesma thread com uma
 * animação de 340ms.
 *
 * Nada disso é urgente. A página está inteira e correta sem a coreografia: o
 * símbolo já está na pose do hero por CSS, as seções já têm a altura certa, o
 * texto todo já está no HTML. O que ela acrescenta só passa a importar quando
 * alguém rola — e é exatamente aí que ela sobe.
 *
 * O teto existe para o caso de ninguém rolar: sem ele, uma aba aberta e
 * esquecida ficaria sem coreografia para sempre, e o primeiro gesto pegaria a
 * peça parada enquanto o GSAP carrega.
 *
 * NÃO é `requestIdleCallback`. Foi a primeira tentativa desta fase e mediu
 * pior: sob simulação, o ocioso chega tarde e os oito componentes acordam
 * juntos num bloco só — o TBT subiu de 300ms para 650-910ms. Um teto fixo
 * espalha o mesmo trabalho no tempo em que a thread já está livre.
 */
const TETO_MS = 900;

export function despertar(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    let feito = false;
    const acordar = () => {
      if (feito) return;
      feito = true;
      window.removeEventListener('scroll', acordar);
      window.removeEventListener('wheel', acordar);
      window.removeEventListener('touchstart', acordar);
      clearTimeout(timer);
      resolve();
    };

    /*
     * A página pode carregar já rolada — recarregar no meio do documento,
     * voltar por âncora, restaurar posição. Aí não há gesto a esperar: a
     * coreografia é necessária no primeiro quadro.
     */
    if (window.scrollY > 0) {
      resolve();
      return;
    }

    const timer = setTimeout(acordar, TETO_MS);
    window.addEventListener('scroll', acordar, { passive: true, once: true });
    window.addEventListener('wheel', acordar, { passive: true, once: true });
    window.addEventListener('touchstart', acordar, { passive: true, once: true });
  });
}
