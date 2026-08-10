import { Minus, Plus } from 'lucide-react'

interface QuantityInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  label?: string
}

/**
 * Stepper de quantidade.
 *
 * Os botões funcionam de verdade — no monolito eles existiam no HTML mas
 * nunca ganhavam handler, porque o `main.js` estourava antes de registrá-los.
 */
export function QuantityInput({
  value,
  onChange,
  min = 0,
  max = 999,
  disabled = false,
  label = 'Quantidade',
}: QuantityInputProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next))

  return (
    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
      <button
        type="button"
        data-testid="quantity-minus"
        aria-label="Diminuir quantidade"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className="grid h-10 w-10 place-items-center rounded-l-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={16} aria-hidden />
      </button>

      <input
        type="number"
        name="quantity"
        data-testid="quantity-input"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => {
          const parsed = Number(event.target.value)
          onChange(Number.isNaN(parsed) ? min : clamp(parsed))
        }}
        className="h-10 w-14 border-x border-slate-300 text-center text-sm font-medium [appearance:textfield] focus:outline-none disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        data-testid="quantity-plus"
        aria-label="Aumentar quantidade"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
        className="grid h-10 w-10 place-items-center rounded-r-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={16} aria-hidden />
      </button>
    </div>
  )
}
