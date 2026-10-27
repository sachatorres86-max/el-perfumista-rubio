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
          <Route path="reportes" element={<Reports />} />
          <Route path="configuracion" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
