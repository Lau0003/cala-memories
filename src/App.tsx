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
import ComingSoon from './pages/admin/ComingSoon'
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
              <Route path="ordenes" element={<ComingSoon section="ordenes" />} />
              <Route path="tareas" element={<ComingSoon section="tareas" />} />
              <Route path="cotizador" element={<ComingSoon section="cotizador" />} />
              <Route path="inventario" element={<ComingSoon section="inventario" />} />
              <Route path="lanzamientos" element={<ComingSoon section="lanzamientos" />} />
              <Route path="contenido" element={<ComingSoon section="contenido" />} />
            </Route>
          </Routes>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}
