import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import GalleryPage from './pages/GalleryPage'

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="*" element={<Navigate to="/gallery" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
