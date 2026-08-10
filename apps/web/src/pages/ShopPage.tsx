import { useQuery } from '@tanstack/react-query'

import { productsApi } from '../api/products'
import { ProductCard } from '../components/ProductCard'
import { ErrorState, LoadingState } from '../components/States'

export function ShopPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.list,
  })

  return (
    <section aria-labelledby="lista-de-produtos">
      <h1 id="lista-de-produtos" className="mb-1 text-2xl font-bold text-slate-900">
        Produtos
      </h1>
      <p className="mb-8 text-sm text-slate-500">
        {data ? `${data.total} produto(s) disponíveis` : ' '}
      </p>

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
  )
}
