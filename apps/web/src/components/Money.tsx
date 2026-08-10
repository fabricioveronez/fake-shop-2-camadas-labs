import { formatMoney } from '../lib/format'

interface MoneyProps {
  value: string | number
  className?: string
  'data-testid'?: string
}

export function Money({ value, className, ...rest }: MoneyProps) {
  return (
    <span className={className} {...rest}>
      {formatMoney(value)}
    </span>
  )
}
