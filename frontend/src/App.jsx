import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Instances from './pages/Instances';
import Departaments from './pages/Departaments';
import CRM from './pages/CRM';
import Users from './pages/Users';
import { WhatsappProvider } from './contexts/WhatsappContext';

function App() {
  const [user, setUser] = useState(null);

  return (
    <WhatsappProvider>
      <Router>
        <div className="min-h-screen font-sans">
          {!user ? (
            <Login onLogin={(email) => setUser(email)} />
          ) : (
            <Routes>
              <Route path="/" element={<Dashboard user={user} onLogout={() => setUser(null)} />} />
              <Route path="/instances" element={<Instances user={user} onLogout={() => setUser(null)} />} />
              <Route path="/departaments" element={<Departaments user={user} onLogout={() => setUser(null)} />} />
              <Route path="/crm" element={<CRM user={user} onLogout={() => setUser(null)} />} />
              <Route path="/users" element={<Users user={user} onLogout={() => setUser(null)} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </div>
      </Router>
    </WhatsappProvider>
  );
}

export default App;
