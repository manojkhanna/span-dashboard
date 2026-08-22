import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Portfolio from './pages/Portfolio'
import ProjectDashboard from './pages/ProjectDashboard'
import DataUpload from './pages/DataUpload'
import Integrations from './pages/Integrations'

function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portfolio />} />
        <Route path="/project/:id" element={<ProjectDashboard />} />
        <Route path="/upload" element={<DataUpload />} />
        <Route path="/integrations" element={<Integrations />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  )
}

export default App
