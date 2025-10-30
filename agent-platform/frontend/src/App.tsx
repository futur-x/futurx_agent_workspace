import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PrivateRoute } from './components/PrivateRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import Tasks from './pages/Tasks'
import Generate from './pages/Generate'
import History from './pages/History'
import Users from './pages/Users'
import KnowledgeBases from './pages/KnowledgeBases'
import SystemConfig from './pages/SystemConfig'
import Layout from './components/Layout'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="agents" element={<Agents />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="knowledge-bases" element={<KnowledgeBases />} />
            <Route path="generate" element={<Generate />} />
            <Route path="history" element={<History />} />
            <Route path="users" element={<Users />} />
            <Route path="system-config" element={<SystemConfig />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App