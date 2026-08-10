import { Menu, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { useCart } from '../hooks/useCart'

const NAV_LINKS = [
  { to: '/', label: 'Início' },
  { to: '/shop', label: 'Produtos' },
  { to: '/contact', label: 'Contato' },
]

function Header() {
  const { cart } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-extrabold tracking-tight text-brand-700">
          Fake<span className="text-slate-900">Shop</span>
        </Link>

        <nav aria-label="Principal" className="ml-6 hidden gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-brand-700'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <Link
          to="/cart"
          className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <ShoppingCart size={18} aria-hidden />
          <span className="hidden sm:inline">Carrinho</span>
          {/* aria-live: quem usa leitor de tela ouve o carrinho mudar. */}
          <span
            data-testid="cart-badge"
            aria-live="polite"
            aria-label={`${cart.item_count} item(ns) no carrinho`}
            className="grid min-w-6 place-items-center rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-bold text-white"
          >
            {cart.item_count}
          </span>
        </Link>

        <button
          type="button"
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
        >
          <Menu size={20} aria-hidden />
        </button>
      </div>

      {menuOpen && (
        <nav aria-label="Principal (móvel)" className="border-t border-slate-200 md:hidden">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <strong className="text-slate-700">FakeShop</strong> — loja de demonstração.
        </p>
        <p>Equipamentos para criadores de conteúdo.</p>
      </div>
    </footer>
  )
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
