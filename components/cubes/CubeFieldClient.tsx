'use client';

import { CubeField } from './CubeField';
import { CubeChoreography } from './CubeChoreography';

/**
 * O campo e o escritor dele, no mesmo módulo — ver a nota em `CubeLayer.tsx`.
 *
 * Manter os dois juntos é o que garante a ordem: quando este módulo monta, os
 * planos entram no DOM no mesmo commit em que a coreografia é criada, e o
 * `useEffect` dela roda depois disso.
 */
export function CubeFieldClient() {
  return (
    <>
      <CubeField />
      <CubeChoreography />
    </>
  );
}
