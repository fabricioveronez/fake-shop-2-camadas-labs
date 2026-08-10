import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { ordersApi } from '../api/orders'
import { Money } from '../components/Money'
import { LoadingState } from '../components/States'
import { useCart } from '../hooks/useCart'
import { ApiError } from '../lib/http'

/** Luhn — mesma verificação que a API faz, aqui só para retorno imediato. */
function luhnOk(digits: string): boolean {
  let total = 0
  ;[...digits].reverse().forEach((char, index) => {
    let digit = Number(char)
    if (index % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    total += digit
  })
  return total % 10 === 0
}

/**
 * Espelha o `CheckoutIn` do Pydantic. A validação aqui existe para o usuário
 * saber do erro sem esperar o round-trip; a autoridade continua sendo a API.
 */
const schema = z.object({
  first_name: z.string().min(1, 'Informe o nome').max(50),
  last_name: z.string().min(1, 'Informe o sobrenome').max(50),
  email: z.string().email('E-mail inválido'),
  mobile: z.string().min(8, 'Telefone muito curto').max(20),

  address1: z.string().min(1, 'Informe o endereço').max(255),
  address2: z.string().max(255).optional(),
  city: z.string().min(1, 'Informe a cidade').max(100),
  state: z.string().min(1, 'Informe o estado').max(100),
  country: z.string().max(100).default('Brasil'),
  zip: z.string().min(1, 'Informe o CEP').max(20),

  card_name: z.string().min(1, 'Informe o nome no cartão').max(100),
  card_number: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ''))
    .refine((value) => /^\d{12,19}$/.test(value), 'Número de cartão inválido')
    .refine(luhnOk, 'Número de cartão inválido'),
  expiry_date: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Use o formato MM/AA')
    .refine((value) => {
      const [month, year] = value.split('/').map(Number)
      const now = new Date()
      return 2000 + year > now.getFullYear() ||
        (2000 + year === now.getFullYear() && month >= now.getMonth() + 1)
    }, 'Cartão vencido'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV inválido'),
})

type CheckoutForm = z.input<typeof schema>

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string
  name: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      {/* htmlFor + id de verdade: clicar no rótulo foca o campo. */}
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none'

export function CheckoutPage() {
  const navigate = useNavigate()
  const { cart, isLoading } = useCart()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'Brasil' },
  })

  // Checkout sem carrinho não faz sentido — volta para a loja, como o
  // monolito fazia com um flash.
  const isEmpty = !isLoading && cart.items.length === 0
  useEffect(() => {
    if (isEmpty) navigate('/shop', { replace: true })
  }, [isEmpty, navigate])

  if (isLoading) return <LoadingState />
  if (isEmpty) return null

  const onSubmit = handleSubmit(async (values) => {
    const parsed = schema.parse(values)
    try {
      const order = await ordersApi.checkout({
        customer: {
          first_name: parsed.first_name,
          last_name: parsed.last_name,
          email: parsed.email,
          mobile: parsed.mobile,
        },
        shipping_address: {
          address1: parsed.address1,
          address2: parsed.address2 || null,
          city: parsed.city,
          state: parsed.state,
          country: parsed.country,
          zip_code: parsed.zip,
        },
        payment: {
          card_name: parsed.card_name,
          card_number: parsed.card_number,
          expiry_date: parsed.expiry_date,
          cvv: parsed.cvv,
        },
      })
      navigate(`/order-confirmation/${order.order_uuid}`, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'PAYMENT_DECLINED') {
        setError('card_number', { message: error.message })
        return
      }
      setError('root', {
        message: 'Não foi possível concluir o pedido. Tente novamente.',
      })
    }
  })

  return (
    <>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">Checkout</h1>

      <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <fieldset className="rounded-xl border border-slate-200 bg-white p-6">
            <legend className="px-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              Dados de Entrega
            </legend>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nome" name="first_name" error={errors.first_name?.message}>
                <input id="first_name" className={inputClass} {...register('first_name')} />
              </Field>
              <Field label="Sobrenome" name="last_name" error={errors.last_name?.message}>
                <input id="last_name" className={inputClass} {...register('last_name')} />
              </Field>
              <Field label="E-mail" name="email" error={errors.email?.message}>
                <input id="email" type="email" className={inputClass} {...register('email')} />
              </Field>
              <Field label="Celular" name="mobile" error={errors.mobile?.message}>
                <input id="mobile" className={inputClass} {...register('mobile')} />
              </Field>
              <Field label="Endereço 1" name="address1" error={errors.address1?.message}>
                <input id="address1" className={inputClass} {...register('address1')} />
              </Field>
              <Field label="Endereço 2" name="address2" error={errors.address2?.message}>
                <input id="address2" className={inputClass} {...register('address2')} />
              </Field>
              <Field label="País" name="country" error={errors.country?.message}>
                <select id="country" className={inputClass} {...register('country')}>
                  <option value="Brasil">Brasil</option>
                </select>
              </Field>
              <Field label="Cidade" name="city" error={errors.city?.message}>
                <input id="city" className={inputClass} {...register('city')} />
              </Field>
              <Field label="Estado" name="state" error={errors.state?.message}>
                <input id="state" className={inputClass} {...register('state')} />
              </Field>
              <Field label="CEP" name="zip" error={errors.zip?.message}>
                <input id="zip" className={inputClass} {...register('zip')} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-slate-200 bg-white p-6">
            <legend className="px-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              Pagamento
            </legend>

            <p className="mt-2 text-xs text-slate-500">
              Loja de demonstração: nenhuma cobrança é feita, e os dados do cartão não são
              armazenados.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Nome no Cartão" name="card_name" error={errors.card_name?.message}>
                  <input id="card_name" className={inputClass} {...register('card_name')} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Número do Cartão"
                  name="card_number"
                  error={errors.card_number?.message}
                >
                  <input
                    id="card_number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    className={inputClass}
                    {...register('card_number')}
                  />
                </Field>
              </div>
              <Field
                label="Data de Validade"
                name="expiry_date"
                error={errors.expiry_date?.message}
              >
                <input
                  id="expiry_date"
                  placeholder="MM/AA"
                  autoComplete="cc-exp"
                  className={inputClass}
                  {...register('expiry_date')}
                />
              </Field>
              <Field label="CVV" name="cvv" error={errors.cvv?.message}>
                <input
                  id="cvv"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  className={inputClass}
                  {...register('cvv')}
                />
              </Field>
            </div>
          </fieldset>
        </div>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
            Resumo do Pedido
          </h2>

          <dl className="space-y-3 border-b border-slate-200 pb-4 text-sm">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4">
                <dt className="text-slate-600">
                  {item.product.name} <span className="text-slate-400">×{item.quantity}</span>
                </dt>
                <dd className="shrink-0">
                  <Money value={item.line_total} />
                </dd>
              </div>
            ))}
            <div className="flex justify-between pt-2">
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

          {errors.root && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {errors.root.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Processando…' : 'Efetuar o Pagamento'}
          </button>
        </aside>
      </form>
    </>
  )
}
