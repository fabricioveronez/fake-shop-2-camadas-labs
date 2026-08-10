import { X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Money } from '../components/Money'
import { QuantityInput } from '../components/QuantityInput'
import { EmptyState, LoadingState } from '../components/States'
import { useCart } from '../hooks/useCart'

export function CartPage() {
  const { cart, isLoading, updateItem, removeItem } = useCart()

  if (isLoading) return <LoadingState />

  if (cart.items.length === 0) {
    return (
      <>
        <h1 className="mb-8 text-2xl font-bold text-slate-900">Carrinho de Compras</h1>
        <EmptyState
          title="Seu carrinho está vazio."
          description="Escolha alguns produtos para começar."
          action={
            <Link
              to="/shop"
              className="inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Ver produtos
            </Link>
          }
        />
      </>
    )
  }

  return (
    <>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">Carrinho de Compras</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Produtos
                </th>
                <th scope="col" className="px-4 py-3">
                  Preço
                </th>
                <th scope="col" className="px-4 py-3">
                  Quantidade
                </th>
                <th scope="col" className="px-4 py-3">
                  Total
                </th>
                <th scope="col" className="px-4 py-3">
                  Remover
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {cart.items.map((item) => (
                <tr key={item.id} data-testid="cart-row">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {item.product.image_url && (
                        <img
                          src={item.product.image_url}
                          alt=""
                          className="h-12 w-12 rounded-md object-cover"
                        />
                      )}
                      <span className="font-medium text-slate-800">{item.product.name}</span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <Money value={item.unit_price} />
                  </td>

                  <td className="px-4 py-4">
                    <QuantityInput
                      label={`Quantidade de ${item.product.name}`}
                      value={item.quantity}
                      min={0}
                      disabled={updateItem.isPending}
                      onChange={(quantity) => updateItem.mutate({ itemId: item.id, quantity })}
                    />
                  </td>

                  <td className="px-4 py-4 font-semibold text-slate-900">
                    <Money value={item.line_total} />
                  </td>

                  <td className="px-4 py-4">
                    <button
                      type="button"
                      data-testid="remove-item"
                      aria-label={`Remover ${item.product.name} do carrinho`}
                      disabled={removeItem.isPending}
                      onClick={() => removeItem.mutate(item.id)}
                      className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <X size={16} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
            Resumo do Pedido
          </h2>

          <dl className="space-y-3 border-b border-slate-200 pb-4 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>
                <Money value={cart.subtotal} data-testid="summary-subtotal" />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Taxa de Entrega</dt>
              <dd>
                <Money value={cart.shipping} data-testid="summary-shipping" />
              </dd>
            </div>
          </dl>

          <div className="flex justify-between pt-4 text-lg font-bold text-slate-900">
            <span>Total</span>
            <Money value={cart.total} data-testid="summary-total" />
          </div>

          <Link
            to="/checkout"
            className="mt-6 block rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Fechar Pedido
          </Link>
        </aside>
      </div>
    </>
  )
}
