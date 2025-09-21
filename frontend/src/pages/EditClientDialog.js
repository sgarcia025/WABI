import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Save, 
  RefreshCw,
  Building2,
  Settings,
  CreditCard,
  Key
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EditClientDialog = ({ client, isOpen, onClose, onClientUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre_negocio: '',
    owner_phone: '',
    departamento: '',
    municipio: '',
    numero_celular_negocio: '',
    plan: 'free',
    status: 'active',
    ultramsg_instance_id: '',
    ultramsg_token: '',
    openai_api_key: '',
    use_emergent_key: true
  });

  const departamentos = [
    'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'Petén',
    'El Progreso', 'Quiché', 'Escuintla', 'Guatemala', 'Huehuetenango',
    'Izabal', 'Jalapa', 'Jutiapa', 'Quetzaltenango', 'Retalhuleu',
    'Sacatepéquez', 'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez',
    'Totonicapán', 'Zacapa'
  ];

  useEffect(() => {
    if (client && isOpen) {
      setFormData({
        nombre_negocio: client.nombre_negocio || '',
        owner_phone: client.owner_phone || '',
        departamento: client.departamento || '',
        municipio: client.municipio || '',
        numero_celular_negocio: client.numero_celular_negocio || '',
        plan: client.plan || 'free',
        status: client.status || 'active',
        ultramsg_instance_id: client.ultramsg_instance_id || '',
        ultramsg_token: client.ultramsg_token || '',
        openai_api_key: client.openai_api_key || '',
        use_emergent_key: client.use_emergent_key !== false
      });
    }
  }, [client, isOpen]);

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`${API}/admin/clients/${client.id}`, formData);
      toast.success('Cliente actualizado exitosamente');
      onClientUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Error al actualizar cliente');
    }
    
    setLoading(false);
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Editar Cliente: {client.nombre_negocio}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Información Básica</TabsTrigger>
              <TabsTrigger value="config">Configuración</TabsTrigger>
              <TabsTrigger value="apis">APIs</TabsTrigger>
            </TabsList>

            {/* Basic Information */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información del Negocio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nombre_negocio">Nombre del Negocio</Label>
                      <Input
                        id="nombre_negocio"
                        value={formData.nombre_negocio}
                        onChange={(e) => handleInputChange('nombre_negocio', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="owner_phone">Teléfono del Propietario</Label>
                      <Input
                        id="owner_phone"
                        value={formData.owner_phone}
                        onChange={(e) => handleInputChange('owner_phone', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="numero_celular_negocio">WhatsApp del Negocio</Label>
                    <Input
                      id="numero_celular_negocio"
                      value={formData.numero_celular_negocio}
                      onChange={(e) => handleInputChange('numero_celular_negocio', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="departamento">Departamento</Label>
                      <select
                        value={formData.departamento}
                        onChange={(e) => handleInputChange('departamento', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md mt-1"
                      >
                        <option value="">Selecciona departamento</option>
                        {departamentos.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="municipio">Municipio</Label>
                      <Input
                        id="municipio"
                        value={formData.municipio}
                        onChange={(e) => handleInputChange('municipio', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Configuration */}
            <TabsContent value="config" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuración de Cuenta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="plan">Plan de Suscripción</Label>
                      <select
                        value={formData.plan}
                        onChange={(e) => handleInputChange('plan', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md mt-1"
                      >
                        <option value="free">Plan Free</option>
                        <option value="pro">Plan Pro</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="status">Estado de la Cuenta</Label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md mt-1"
                      >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                        <option value="suspended">Suspendido</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* APIs Configuration */}
            <TabsContent value="apis" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Configuración de APIs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Ultramsg Config */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Ultramsg (WhatsApp)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ultramsg_instance_id">Instance ID</Label>
                        <Input
                          id="ultramsg_instance_id"
                          value={formData.ultramsg_instance_id}
                          onChange={(e) => handleInputChange('ultramsg_instance_id', e.target.value)}
                          placeholder="instance123456"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="ultramsg_token">Token</Label>
                        <Input
                          id="ultramsg_token"
                          type="password"
                          value={formData.ultramsg_token}
                          onChange={(e) => handleInputChange('ultramsg_token', e.target.value)}
                          placeholder="••••••••••••••••"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* AI Config */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Inteligencia Artificial</h4>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="use_emergent_key"
                        checked={formData.use_emergent_key}
                        onCheckedChange={(checked) => handleInputChange('use_emergent_key', checked)}
                      />
                      <Label htmlFor="use_emergent_key">Usar Emergent LLM Key</Label>
                    </div>

                    {!formData.use_emergent_key && (
                      <div>
                        <Label htmlFor="openai_api_key">OpenAI API Key</Label>
                        <Input
                          id="openai_api_key"
                          type="password"
                          value={formData.openai_api_key}
                          onChange={(e) => handleInputChange('openai_api_key', e.target.value)}
                          placeholder="sk-••••••••••••••••"
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#25D366] hover:bg-[#075E54]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientDialog;