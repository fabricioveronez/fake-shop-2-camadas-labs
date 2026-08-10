import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { productsApi } from '../api/products'
import { ProductCard } from '../components/ProductCard'
import { ErrorState, LoadingState } from '../components/States'

export function HomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.list,
  })

  return (
    <>
      <section className="mb-12 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-14 text-white sm:px-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-200">
          Equipamentos para criadores
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
          Tudo o que você precisa para gravar, transmitir e editar
        </h1>
        <p className="mt-4 max-w-xl text-brand-100">
          Câmeras, microfones, notebooks e acessórios selecionados para quem produz conteúdo.
        </p>
        <Link
          to="/shop"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
        >
          Ver todos os produtos
          <ArrowRight size={16} aria-hidden />
        </Link>
      </section>

      <section aria-labelledby="destaques">
        <h2 id="destaques" className="mb-6 text-xl font-bold text-slate-900">
          Nossos produtos
        </h2>

        {isLoading && <LoadingState />}
        {error && <ErrorState message="Não foi possível carregar os produtos." />}

        {data && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
