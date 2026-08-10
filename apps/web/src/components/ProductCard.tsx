import { Link } from 'react-router-dom'

import type { Product } from '../api/types'
import { Money } from './Money'

export function ProductCard({ product }: { product: Product }) {
  return (
    <article
      data-testid="product-card"
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-brand-300 hover:shadow-md"
    >
      <Link
        to={`/detail/${product.id}`}
        tabIndex={-1}
        aria-hidden
        className="aspect-square overflow-hidden bg-slate-100"
      >
        {product.image_url && (
          <img
            src={product.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          {/* O link envolve o nome: é o rótulo acessível do destino. */}
          <Link
            to={`/detail/${product.id}`}
            data-testid="product-name"
            className="hover:text-brand-700"
          >
            {product.name}
          </Link>
        </h3>

        {product.short_description && (
          <p className="line-clamp-2 text-xs text-slate-500">{product.short_description}</p>
        )}

        <Money
          value={product.price}
          data-testid="product-price"
          className="mt-auto pt-2 text-lg font-bold text-brand-700"
        />
      </div>
    </article>
  )
}
