import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { HomePage } from '@/features/home/HomePage'
import { VehiclesListPage } from '@/features/vehicles/VehiclesListPage'
import { RegisterVehiclePage } from '@/features/vehicles/RegisterVehiclePage'
import { MaintenanceDashboardPage } from '@/features/maintenance/MaintenanceDashboardPage'
import { DocumentsPage } from '@/features/documents/DocumentsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((s) => s.userId)
  const loading = useAuthStore((s) => s.loading)
  if (loading) return null
  if (!userId) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/vehiculos"
        element={
          <RequireAuth>
            <VehiclesListPage />
          </RequireAuth>
        }
      />
      <Route
        path="/vehiculos/registrar"
        element={
          <RequireAuth>
            <RegisterVehiclePage />
          </RequireAuth>
        }
      />
      <Route
        path="/mantenimiento"
        element={
          <RequireAuth>
            <MaintenanceDashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/documentos"
        element={
          <RequireAuth>
            <DocumentsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/perfil"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
    </Routes>
  )
}
