import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Portfolio from './pages/Portfolio'
import ProjectDashboard from './pages/ProjectDashboard'
import DataUpload from './pages/DataUpload'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portfolio />} />
        <Route path="/project/:id" element={<ProjectDashboard />} />
        <Route path="/upload" element={<DataUpload />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
