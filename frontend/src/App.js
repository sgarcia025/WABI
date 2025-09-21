import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Separator } from "./components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { 
  MenuIcon, 
  LogOut, 
  Building2, 
  Users, 
  Package, 
  Receipt, 
  CreditCard,
  BarChart3,
  Settings,
  Phone,
  ShoppingCart,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { useToast } from "./hooks/use-toast";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
    setLoading(false);
  };

  const login = async (phone, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { phone, password });
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      await fetchCurrentUser();
      toast.success('Sesión iniciada correctamente');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.response?.data?.detail || 'Error al iniciar sesión' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const LoginForm = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(phone, password);
    if (!result.success) {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-[#25D366] rounded-full flex items-center justify-center">
              <img 
                src="https://customer-assets.emergentagent.com/job_d4649c95-b6d0-4ce8-8aa0-28116094aaf5/artifacts/xftkkknz_IMG_9911.png"
                alt="WABI Logo"
                className="w-16 h-16 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#3A3A3A]">WABI Platform</h1>
              <p className="text-gray-600">Ingresa a tu panel administrativo</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="50212345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-[#25D366] hover:bg-[#075E54] text-white"
                disabled={loading}
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Dashboard Components
const Sidebar = ({ currentSection, setCurrentSection }) => {
  const { user, logout } = useAuth();
  
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'smes', name: 'Negocios', icon: Building2 },
    { id: 'products', name: 'Productos', icon: Package },
    { id: 'transactions', name: 'Transacciones', icon: Receipt },
    { id: 'customers', name: 'Clientes', icon: Users },
    { id: 'webhooks', name: 'WhatsApp', icon: Phone },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center">
            <img 
              src="https://customer-assets.emergentagent.com/job_d4649c95-b6d0-4ce8-8aa0-28116094aaf5/artifacts/xftkkknz_IMG_9911.png"
              alt="WABI"
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <h2 className="font-bold text-[#3A3A3A]">WABI</h2>
            <p className="text-sm text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setCurrentSection(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentSection === item.id
                    ? 'bg-[#25D366] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar>
            <AvatarFallback className="bg-[#25D366] text-white">
              {user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium text-sm">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
        </div>
        <Button
          onClick={logout}
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Salir
        </Button>
      </div>
    </div>
  );
};

const DashboardOverview = () => {
  const [dashboardData, setDashboardData] = useState({
    total_smes: 0,
    total_products: 0,
    total_transactions: 0,
    recent_transactions: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Error al cargar datos del dashboard');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#3A3A3A]">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Negocios Activos</p>
                <p className="text-3xl font-bold text-[#25D366]">{dashboardData.total_smes}</p>
              </div>
              <Building2 className="w-8 h-8 text-[#25D366]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Productos Registrados</p>
                <p className="text-3xl font-bold text-[#075E54]">{dashboardData.total_products}</p>
              </div>
              <Package className="w-8 h-8 text-[#075E54]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transacciones</p>
                <p className="text-3xl font-bold text-[#3A3A3A]">{dashboardData.total_transactions}</p>
              </div>
              <Receipt className="w-8 h-8 text-[#3A3A3A]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardData.recent_transactions.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.recent_transactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{transaction.type}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={transaction.type === 'sale' ? 'default' : 'secondary'}>
                    Q{transaction.amount.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay transacciones recientes</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const SMEsSection = () => {
  const [smes, setSMEs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSMEs();
  }, []);

  const fetchSMEs = async () => {
    try {
      const response = await axios.get(`${API}/smes`);
      setSMEs(response.data);
    } catch (error) {
      toast.error('Error al cargar negocios');
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Cargando negocios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#3A3A3A]">Negocios</h1>
        <Button className="bg-[#25D366] hover:bg-[#075E54]">
          <Building2 className="w-4 h-4 mr-2" />
          Nuevo Negocio
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {smes.map((sme) => (
          <Card key={sme.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{sme.nombre_negocio}</span>
                <Badge variant={sme.plan === 'pro' ? 'default' : 'secondary'}>
                  {sme.plan.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Propietario:</span> {sme.owner_phone}</p>
                <p><span className="font-medium">Ubicación:</span> {sme.municipio}, {sme.departamento}</p>
                <p><span className="font-medium">WhatsApp:</span> {sme.numero_celular_negocio}</p>
                <p><span className="font-medium">Registrado:</span> {new Date(sme.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {smes.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay negocios registrados</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const MainContent = ({ currentSection }) => {
  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'smes':
        return <SMEsSection />;
      case 'products':
        return <div className="p-6"><h1 className="text-2xl font-bold">Productos</h1><p>Próximamente...</p></div>;
      case 'transactions':
        return <div className="p-6"><h1 className="text-2xl font-bold">Transacciones</h1><p>Próximamente...</p></div>;
      case 'customers':
        return <div className="p-6"><h1 className="text-2xl font-bold">Clientes</h1><p>Próximamente...</p></div>;
      case 'webhooks':
        return <div className="p-6"><h1 className="text-2xl font-bold">WhatsApp</h1><p>Integración próximamente...</p></div>;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex-1 bg-[#F2F4F7] overflow-auto">
      <div className="p-6">
        {renderSection()}
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const [currentSection, setCurrentSection] = useState('dashboard');

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar currentSection={currentSection} setCurrentSection={setCurrentSection} />
      <MainContent currentSection={currentSection} />
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="*" 
              element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              } 
            />
          </Routes>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;