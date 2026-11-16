import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { isConfigured } from './lib/supabase'
import { AuthProvider } from './lib/auth'
import { SettingsProvider } from './lib/settings'
import TiendaLayout from './layouts/TiendaLayout'
import AdminLayout from './layouts/AdminLayout'
import Home from './pages/tienda/Home'
import ProductPage from './pages/tienda/ProductPage'
import Policies from './pages/tienda/Policies'
import NotFound from './pages/tienda/NotFound'
import Login from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import Products from './pages/admin/Products'
import ProductForm from './pages/admin/ProductForm'
import Categories from './pages/admin/Categories'
import Settings from './pages/admin/Settings'
import Orders from './pages/admin/Orders'
import OrderForm from './pages/admin/OrderForm'
import OrderDetail from './pages/admin/OrderDetail'
import Tasks from './pages/admin/Tasks'
import Quoter from './pages/admin/Quoter'
import Inventory from './pages/admin/Inventory'
import Launches from './pages/admin/Launches'
import Content from './pages/admin/Content'
import SetupNotice from './components/SetupNotice'

export default function App() {
  if (!isConfigured) return <SetupNotice />

  return (
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <Routes>
            <Route element={<TiendaLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/producto/:slug" element={<ProductPage />} />
              <Route path="/politicas" element={<Policies />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="productos" element={<Products />} />
              <Route path="productos/nuevo" element={<ProductForm />} />
              <Route path="productos/:id" element={<ProductForm />} />
              <Route path="categorias" element={<Categories />} />
              <Route path="ajustes" element={<Settings />} />
              <Route path="ordenes" element={<Orders />} />
              <Route path="ordenes/nueva" element={<OrderForm />} />
              <Route path="ordenes/:id" element={<OrderDetail />} />
              <Route path="ordenes/:id/editar" element={<OrderForm />} />
              <Route path="tareas" element={<Tasks />} />
              <Route path="cotizador" element={<Quoter />} />
              <Route path="inventario" element={<Inventory />} />
              <Route path="lanzamientos" element={<Launches />} />
              <Route path="contenido" element={<Content />} />
            </Route>
          </Routes>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}
