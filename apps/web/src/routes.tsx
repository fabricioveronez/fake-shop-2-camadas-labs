import { Route, Routes } from 'react-router-dom'

import { Layout } from './components/Layout'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { ContactPage } from './pages/ContactPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrderConfirmationPage } from './pages/OrderConfirmationPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ShopPage } from './pages/ShopPage'

/**
 * As URLs públicas do monolito são preservadas (`/shop`, `/detail/:id`,
 * `/cart`, `/checkout`, `/contact`), então links e favoritos continuam
 * valendo.
 *
 * A exceção é a confirmação: `/order_confirmation/<numero>` vira
 * `/order-confirmation/<uuid>`, porque um número de 6 dígitos é varrível e a
 * página mostra nome, e-mail e endereço do comprador.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="detail/:productId" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order-confirmation/:orderUuid" element={<OrderConfirmationPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
