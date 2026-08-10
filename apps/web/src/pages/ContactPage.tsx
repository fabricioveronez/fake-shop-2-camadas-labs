import { Mail, MapPin, Phone } from 'lucide-react'

/**
 * Página estática.
 *
 * Não há formulário de contato: no monolito o form apontava para um
 * `contact.php` que nunca existiu, e um endpoint de e-mail sem infraestrutura
 * de envio seria só superfície de spam.
 */
export function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Contato</h1>
      <p className="mb-8 text-slate-600">
        Esta é uma loja de demonstração — os dados abaixo são fictícios.
      </p>

      <ul className="space-y-4">
        {[
          { Icon: MapPin, label: 'Endereço', value: 'Rua das Laranjeiras, 100 — São Paulo, SP' },
          { Icon: Mail, label: 'E-mail', value: 'contato@fakeshop.example' },
          { Icon: Phone, label: 'Telefone', value: '(11) 99999-8888' },
        ].map(({ Icon, label, value }) => (
          <li
            key={label}
            className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
              <Icon size={18} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{label}</p>
              <p className="text-sm text-slate-600">{value}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
