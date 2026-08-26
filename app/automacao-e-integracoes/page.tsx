import { metadataDePagina } from '@/lib/seo/metadata';
import { paginaPorPath } from '@/lib/content/servicos-pages';
import { ServiceLanding } from '@/components/pages/ServiceLanding';

const pagina = paginaPorPath('/automacao-e-integracoes');

export const metadata = metadataDePagina({
  path: pagina.path,
  title: pagina.title,
  description: pagina.description,
});

export default function Page() {
  return <ServiceLanding pagina={pagina} />;
}
