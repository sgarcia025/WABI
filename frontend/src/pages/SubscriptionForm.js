import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle, Building2, Phone, MapPin, User, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SubscriptionForm = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    celular: '',
    nombre_negocio: '',
    departamento: '',
    municipio: '',
    numero_celular_negocio: '',
    plan: 'free'
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const departamentos = [
    'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'Petén',
    'El Progreso', 'Quiché', 'Escuintla', 'Guatemala', 'Huehuetenango',
    'Izabal', 'Jalapa', 'Jutiapa', 'Quetzaltenango', 'Retalhuleu',
    'Sacatepéquez', 'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez',
    'Totonicapán', 'Zacapa'
  ];

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const required = ['nombre', 'celular', 'nombre_negocio', 'departamento', 'municipio', 'numero_celular_negocio'];
    
    for (let field of required) {
      if (!formData[field]) {
        toast.error(`El campo ${field.replace('_', ' ')} es obligatorio`);
        return false;
      }
    }

    // Validate phone numbers
    const phoneRegex = /^502[0-9]{8}$/;
    if (!phoneRegex.test(formData.celular.replace(/\s+/g, ''))) {
      toast.error('El número de celular debe ser válido (502XXXXXXXX)');
      return false;
    }

    if (!phoneRegex.test(formData.numero_celular_negocio.replace(/\s+/g, ''))) {
      toast.error('El número de WhatsApp del negocio debe ser válido (502XXXXXXXX)');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/subscribe`, formData);
      
      setCredentials({
        phone: formData.celular,
        password: response.data.default_password,
        sme_id: response.data.sme_id
      });
      
      setSuccess(true);
      toast.success('¡Registro exitoso! Tu negocio ya está en WABI');
      
    } catch (error) {
      console.error('Error registrando negocio:', error);
      toast.error(error.response?.data?.detail || 'Error al registrar el negocio');
    }
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-[#25D366]" />
            </div>
            <CardTitle className="text-2xl text-[#3A3A3A]">¡Bienvenido a WABI!</CardTitle>
            <p className="text-gray-600">Tu negocio se ha registrado exitosamente</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>¡Registro completado!</strong> Ya puedes acceder a tu panel administrativo.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-[#3A3A3A]">Credenciales de Acceso:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Teléfono:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded">{credentials?.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Contraseña:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded">{credentials?.password}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-l-4 border-[#25D366] pl-4">
                <h4 className="font-semibold text-[#3A3A3A]">Próximos pasos:</h4>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Accede al panel con tus credenciales</li>
                  <li>• Configura tus productos y servicios</li>
                  <li>• Conecta tu WhatsApp Business</li>
                  <li>• ¡Comienza a recibir pagos y gestionar ventas!</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-[#25D366] hover:bg-[#075E54]"
              >
                Ir al Panel Administrativo
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white"
              >
                Registrar Otro Negocio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#25D366] to-[#075E54] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
              <img 
                src="https://customer-assets.emergentagent.com/job_d4649c95-b6d0-4ce8-8aa0-28116094aaf5/artifacts/xftkkknz_IMG_9911.png"
                alt="WABI"
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Únete a WABI</h1>
          <p className="text-white/90 text-lg">Gestiona tu negocio inteligentemente con WhatsApp + IA</p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-[#3A3A3A]">Registra tu Negocio</CardTitle>
            <p className="text-center text-gray-600">Completa la información para comenzar</p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información Personal */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-[#25D366]" />
                  <h3 className="font-semibold text-[#3A3A3A]">Información Personal</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombre">Nombre Completo *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      placeholder="Juan Carlos Pérez"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="username">Nombre de Usuario</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder="juanperez123"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="celular">Número de Celular *</Label>
                  <Input
                    id="celular"
                    value={formData.celular}
                    onChange={(e) => handleInputChange('celular', e.target.value)}
                    placeholder="50212345678"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Este será tu usuario para iniciar sesión</p>
                </div>
              </div>

              {/* Plan Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-[#25D366]" />
                  <h3 className="font-semibold text-[#3A3A3A]">Selecciona tu Plan</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Free Plan */}
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.plan === 'free' 
                        ? 'border-[#25D366] bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleInputChange('plan', 'free')}
                  >
                    <div className="text-center">
                      <h4 className="font-semibold text-lg">Plan Free</h4>
                      <p className="text-2xl font-bold text-[#25D366] my-2">Q0/mes</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Hasta 100 transacciones/mes</li>
                        <li>• Funciones básicas de IA</li>
                        <li>• Reportes simples</li>
                        <li>• Soporte por email</li>
                      </ul>
                    </div>
                  </div>
                  
                  {/* Pro Plan */}
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all relative ${
                      formData.plan === 'pro' 
                        ? 'border-[#25D366] bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleInputChange('plan', 'pro')}
                  >
                    <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                      Recomendado
                    </div>
                    <div className="text-center">
                      <h4 className="font-semibold text-lg">Plan Pro</h4>
                      <p className="text-2xl font-bold text-purple-600 my-2">Q99/mes</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Transacciones ilimitadas</li>
                        <li>• IA avanzada + Voz</li>
                        <li>• Score crediticio</li>
                        <li>• Reportes avanzados</li>
                        <li>• Soporte prioritario</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información del Negocio */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-[#25D366]" />
                  <h3 className="font-semibold text-[#3A3A3A]">Información del Negocio</h3>
                </div>

                <div>
                  <Label htmlFor="nombre_negocio">Nombre del Negocio *</Label>
                  <Input
                    id="nombre_negocio"
                    value={formData.nombre_negocio}
                    onChange={(e) => handleInputChange('nombre_negocio', e.target.value)}
                    placeholder="Tienda El Buen Precio"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="numero_celular_negocio">WhatsApp del Negocio *</Label>
                  <Input
                    id="numero_celular_negocio"
                    value={formData.numero_celular_negocio}
                    onChange={(e) => handleInputChange('numero_celular_negocio', e.target.value)}
                    placeholder="50244447777"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Número donde recibirás mensajes de clientes</p>
                </div>
              </div>

              {/* Ubicación */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-[#25D366]" />
                  <h3 className="font-semibold text-[#3A3A3A]">Ubicación</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="departamento">Departamento *</Label>
                    <Select onValueChange={(value) => handleInputChange('departamento', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecciona departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="municipio">Municipio *</Label>
                    <Input
                      id="municipio"
                      value={formData.municipio}
                      onChange={(e) => handleInputChange('municipio', e.target.value)}
                      placeholder="Guatemala"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#25D366] hover:bg-[#075E54] text-white py-3 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrar mi Negocio'
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Al registrarte, aceptas nuestros términos y condiciones de uso de WABI
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionForm;