import { useQuery } from '@tanstack/react-query'
import { Check, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { productsApi } from '../api/products'
import { Money } from '../components/Money'
import { ProductCard } from '../components/ProductCard'
import { QuantityInput } from '../components/QuantityInput'
import { ErrorState, LoadingState } from '../components/States'
import { useCart } from '../hooks/useCart'

export function ProductDetailPage() {
  const { productId } = useParams()
  const id = Number(productId)

  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()

  const product = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id),
    enabled: Number.isInteger(id),
  })

  const related = useQuery({
    queryKey: ['product', id, 'related'],
    queryFn: () => productsApi.related(id),
    enabled: Number.isInteger(id),
  })

  if (!Number.isInteger(id)) return <ErrorState message="Produto não encontrado." />
  if (product.isLoading) return <LoadingState />
  if (product.error || !product.data) return <ErrorState message="Produto não encontrado." />

  const item = product.data

  const handleAdd = async () => {
    await addItem.mutateAsync({ productId: item.id, quantity })
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2500)
  }

  return (
    <>
      <nav aria-label="Trilha" className="mb-6 text-sm text-slate-500">
        <Link to="/" className="hover:text-brand-700">
          Início
        </Link>
        <span className="px-2">/</span>
        <Link to="/shop" className="hover:text-brand-700">
          Produtos
        </Link>
        <span className="px-2">/</span>
        <span className="text-slate-700">{item.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {item.image_url && (
            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
          )}
        </div>

        <div>
          <h1 data-testid="product-name" className="text-2xl font-bold text-slate-900">
            {item.name}
          </h1>

          <Money
            value={item.price}
            data-testid="product-price"
            className="mt-3 block text-3xl font-extrabold text-brand-700"
          />

          {item.short_description && (
            <p className="mt-4 text-slate-600">{item.short_description}</p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <QuantityInput value={quantity} onChange={setQuantity} min={1} />

            <button
              type="button"
              onClick={handleAdd}
              disabled={addItem.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              <ShoppingCart size={16} aria-hidden />
              Adicionar no Carrinho
            </button>
          </div>

          {/* role=status: o retorno da ação chega a quem usa leitor de tela. */}
          <p role="status" className="mt-3 h-5 text-sm text-brand-700">
            {added && (
              <span className="inline-flex items-center gap-1">
                <Check size={14} aria-hidden />
                {item.name} adicionado ao carrinho!
              </span>
            )}
            {addItem.isError && (
              <span className="text-red-700">Não foi possível adicionar ao carrinho.</span>
            )}
          </p>

          {item.description && (
            <section className="mt-8 border-t border-slate-200 pt-6">
              <h2 className="mb-2 font-semibold text-slate-900">Descrição do Produto</h2>
              <p data-testid="product-description" className="leading-relaxed text-slate-600">
                {item.description}
              </p>
            </section>
          )}
        </div>
      </div>

      {related.data && related.data.length > 0 && (
        <section data-testid="related-products" className="mt-16">
          <h2 className="mb-6 text-xl font-bold text-slate-900">Recomendações</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
