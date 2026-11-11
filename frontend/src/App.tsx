import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PublicLayout } from './components/PublicLayout'
import { PageLoader } from './components/ui'
import { Home } from './pages/Home'

const Catalog = lazy(() => import('./pages/Catalog').then((module) => ({ default: module.Catalog })))
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetail').then((module) => ({ default: module.ProductDetailPage })),
)
const Contact = lazy(() => import('./pages/Contact').then((module) => ({ default: module.Contact })))
const ClientLogin = lazy(() =>
  import('./pages/ClientAuth').then((module) => ({ default: module.ClientLogin })),
)
const ClientRegister = lazy(() =>
  import('./pages/ClientAuth').then((module) => ({ default: module.ClientRegister })),
)
const Cart = lazy(() => import('./pages/Cart').then((module) => ({ default: module.Cart })))
const SharedCart = lazy(() =>
  import('./pages/SharedCart').then((module) => ({ default: module.SharedCart })),
)
const NotFound = lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })))

const AdminLayout = lazy(() =>
  import('./pages/admin/AdminLayout').then((module) => ({ default: module.AdminLayout })),
)
const Login = lazy(() => import('./pages/admin/Login').then((module) => ({ default: module.Login })))
const Dashboard = lazy(() =>
  import('./pages/admin/Dashboard').then((module) => ({ default: module.Dashboard })),
)
const Products = lazy(() =>
  import('./pages/admin/Products').then((module) => ({ default: module.Products })),
)
const ProductForm = lazy(() =>
  import('./pages/admin/ProductForm').then((module) => ({ default: module.ProductForm })),
)
const Supplies = lazy(() =>
  import('./pages/admin/Supplies').then((module) => ({ default: module.Supplies })),
)
const Inventory = lazy(() =>
  import('./pages/admin/Inventory').then((module) => ({ default: module.Inventory })),
)
const Categories = lazy(() =>
  import('./pages/admin/Categories').then((module) => ({ default: module.Categories })),
)
const Reports = lazy(() =>
  import('./pages/admin/Reports').then((module) => ({ default: module.Reports })),
)
const Quotes = lazy(() =>
  import('./pages/admin/Quotes').then((module) => ({ default: module.Quotes })),
)
const Users = lazy(() =>
  import('./pages/admin/Users').then((module) => ({ default: module.Users })),
)
const Settings = lazy(() =>
  import('./pages/admin/Settings').then((module) => ({ default: module.Settings })),
)

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="catalogo" element={<Catalog />} />
          <Route path="producto/:slug" element={<ProductDetailPage />} />
          <Route path="contacto" element={<Contact />} />
          <Route path="cuenta/ingresar" element={<ClientLogin />} />
          <Route path="cuenta/registro" element={<ClientRegister />} />
          <Route path="carrito" element={<Cart />} />
          <Route path="cotizacion/:token" element={<SharedCart />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="productos" element={<Products />} />
          <Route path="productos/nuevo" element={<ProductForm />} />
          <Route path="productos/:id" element={<ProductForm />} />
          <Route path="insumos" element={<Supplies />} />
          <Route path="inventario" element={<Inventory />} />
          <Route path="categorias" element={<Categories />} />
          <Route path="cotizaciones" element={<Quotes />} />
          <Route path="reportes" element={<Reports />} />
          <Route path="usuarios" element={<Users />} />
          <Route path="configuracion" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
