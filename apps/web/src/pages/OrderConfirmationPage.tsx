import { useQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { ordersApi } from '../api/orders'
import { Money } from '../components/Money'
import { EmptyState, LoadingState } from '../components/States'
import { formatDate } from '../lib/format'

export function OrderConfirmationPage() {
  const { orderUuid } = useParams()

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', orderUuid],
    queryFn: () => ordersApi.get(orderUuid as string),
    enabled: Boolean(orderUuid),
    retry: false,
  })

  if (isLoading) return <LoadingState />

  if (error || !data) {
    return (
      <EmptyState
        title="Pedido não encontrado"
        description="O link pode estar incorreto ou o pedido não existe mais."
        action={
          <Link
            to="/shop"
            className="inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Voltar para a loja
          </Link>
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-8 text-center">
        <CheckCircle2 className="mx-auto text-brand-600" size={40} aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Pedido Confirmado</h1>
        <p className="mt-2 text-slate-600">
          Obrigado pela compra! Seu número de pedido é{' '}
          <strong data-testid="order-number" className="text-brand-800">
            {data.order_number}
          </strong>
          .
        </p>
      </div>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-900">Resumo do Pedido</h2>

        <ul className="divide-y divide-slate-100">
          {data.items.map((item) => (
            <li
              key={`${item.product_id}-${item.quantity}`}
              data-testid="order-item"
              className="flex justify-between gap-4 py-3 text-sm"
            >
              <span className="text-slate-700">
                {item.product_name}
                <span className="text-slate-400"> — Quantidade: {item.quantity}</span>
              </span>
              <Money value={item.line_total} className="shrink-0 font-medium" />
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>
              <Money value={data.subtotal} data-testid="summary-subtotal" />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Taxa de Entrega</dt>
            <dd>
              <Money value={data.shipping} data-testid="summary-shipping" />
            </dd>
          </div>
          <div className="flex justify-between pt-2 text-base font-bold text-slate-900">
            <dt>Total</dt>
            <dd>
              <Money value={data.total} data-testid="summary-total" />
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 grid gap-6 rounded-xl border border-slate-200 bg-white p-6 text-sm sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold text-slate-900">Entrega</h2>
          <address className="not-italic leading-relaxed text-slate-600">
            {data.customer_name}
            <br />
            {data.address1}
            {data.address2 && (
              <>
                <br />
                {data.address2}
              </>
            )}
            <br />
            {data.city} — {data.state}
            <br />
            CEP {data.zip_code}
          </address>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-900">Pagamento</h2>
          <p className="leading-relaxed text-slate-600">
            {/* Só bandeira e últimos quatro existem: o resto nunca foi gravado. */}
            <span className="capitalize">{data.payment.brand}</span> •••• {data.payment.last4}
            <br />
            {data.paid_at && <span className="text-slate-500">{formatDate(data.paid_at)}</span>}
          </p>
        </div>
      </section>

      <Link
        to="/"
        className="mt-8 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Voltar à Página Inicial
      </Link>
    </div>
  )
}
