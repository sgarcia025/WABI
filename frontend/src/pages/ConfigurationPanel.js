import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  Settings,
  Key,
  MessageSquare,
  CreditCard,
  Shield,
  TestTube,
  CheckCircle,
  XCircle,
  Save,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ConfigurationPanel = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [ultramsgConfig, setUltramsgConfig] = useState({
    instance_id: '',
    token: '',
    status: 'disconnected'
  });
  
  const [aiConfig, setAiConfig] = useState({
    use_emergent_key: true,
    openai_api_key: '',
    model: 'gpt-4o-mini'
  });
  
  const [creditPolicies, setCreditPolicies] = useState([]);
  
  const [newPolicy, setNewPolicy] = useState({
    band: 'A',
    max_amount: 50000,
    max_tenor_days: 90,
    interest_rate: 2.5,
    approval_probability: 95,
    min_score_required: 80,
    additional_requirements: []
  });

  useEffect(() => {
    fetchConfiguration();
  }, []);

  const fetchConfiguration = async () => {
    try {
      // Fetch current configurations
      const configResponse = await axios.get(`${API}/admin/configuration`);
      const data = configResponse.data;
      
      if (data.ultramsg) {
        setUltramsgConfig(data.ultramsg);
      }
      
      if (data.ai) {
        setAiConfig(data.ai);
      }
      
      // Fetch credit policies
      const policiesResponse = await axios.get(`${API}/admin/credit-policies`);
      setCreditPolicies(policiesResponse.data.policies || []);
      
    } catch (error) {
      console.error('Error fetching configuration:', error);
      toast.error('Error al cargar configuración');
    }
    setLoading(false);
  };

  const saveUltramsgConfig = async () => {
    try {
      setSaving(true);
      
      await axios.put(`${API}/admin/configuration/ultramsg`, {
        instance_id: ultramsgConfig.instance_id,
        token: ultramsgConfig.token
      });
      
      toast.success('Configuración de Ultramsg guardada');
    } catch (error) {
      console.error('Error saving Ultramsg config:', error);
      toast.error('Error al guardar configuración de Ultramsg');
    }
    setSaving(false);
  };

  const saveAiConfig = async () => {
    try {
      setSaving(true);
      
      await axios.put(`${API}/admin/configuration/ai`, {
        use_emergent_key: aiConfig.use_emergent_key,
        openai_api_key: aiConfig.openai_api_key,
        model: aiConfig.model
      });
      
      toast.success('Configuración de IA guardada');
    } catch (error) {
      console.error('Error saving AI config:', error);
      toast.error('Error al guardar configuración de IA');
    }
    setSaving(false);
  };

  const testUltramsgConnection = async () => {
    try {
      setTesting(true);
      
      const response = await axios.post(`${API}/admin/test/ultramsg`, {
        instance_id: ultramsgConfig.instance_id,
        token: ultramsgConfig.token
      });
      
      if (response.data.success) {
        setUltramsgConfig(prev => ({ ...prev, status: 'connected' }));
        toast.success('Conexión con Ultramsg exitosa');
      } else {
        setUltramsgConfig(prev => ({ ...prev, status: 'error' }));
        toast.error('Error en conexión con Ultramsg');
      }
    } catch (error) {
      console.error('Error testing Ultramsg:', error);
      setUltramsgConfig(prev => ({ ...prev, status: 'error' }));
      toast.error('Error al probar conexión con Ultramsg');
    }
    setTesting(false);
  };

  const testAiConnection = async () => {
    try {
      setTesting(true);
      
      const response = await axios.post(`${API}/admin/test/ai`);
      
      if (response.data.success) {
        toast.success('Conexión con IA funcionando correctamente');
      } else {
        toast.error('Error en conexión con IA');
      }
    } catch (error) {
      console.error('Error testing AI:', error);
      toast.error('Error al probar conexión con IA');
    }
    setTesting(false);
  };

  const saveCreditPolicy = async () => {
    try {
      setSaving(true);
      
      await axios.post(`${API}/admin/credit-policies`, newPolicy);
      
      toast.success('Política de crédito guardada');
      fetchConfiguration(); // Refresh policies
      
      // Reset form
      setNewPolicy({
        band: 'A',
        max_amount: 50000,
        max_tenor_days: 90,
        interest_rate: 2.5,
        approval_probability: 95,
        min_score_required: 80,
        additional_requirements: []
      });
    } catch (error) {
      console.error('Error saving credit policy:', error);
      toast.error('Error al guardar política de crédito');
    }
    setSaving(false);
  };

  const deleteCreditPolicy = async (policyId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta política?')) return;
    
    try {
      await axios.delete(`${API}/admin/credit-policies/${policyId}`);
      toast.success('Política eliminada');
      fetchConfiguration();
    } catch (error) {
      console.error('Error deleting policy:', error);
      toast.error('Error al eliminar política');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      connected: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      disconnected: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
      error: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const variant = variants[status] || variants.disconnected;
    const Icon = variant.icon;
    
    return (
      <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status === 'connected' ? 'Conectado' : 
         status === 'error' ? 'Error' : 'Desconectado'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#3A3A3A]">Configuración del Sistema</h1>
          <p className="text-gray-600 mt-1">Gestiona APIs, integraciones y políticas</p>
        </div>
      </div>

      <Tabs defaultValue="ultramsg" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ultramsg">WhatsApp</TabsTrigger>
          <TabsTrigger value="ai">Inteligencia IA</TabsTrigger>
          <TabsTrigger value="credit">Políticas Crédito</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        {/* Ultramsg Configuration */}
        <TabsContent value="ultramsg" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#25D366]" />
                  <CardTitle>Configuración Ultramsg (WhatsApp)</CardTitle>
                </div>
                {getStatusBadge(ultramsgConfig.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="instance_id">Instance ID</Label>
                <Input
                  id="instance_id"
                  value={ultramsgConfig.instance_id}
                  onChange={(e) => setUltramsgConfig(prev => ({ ...prev, instance_id: e.target.value }))}
                  placeholder="instance123456"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Encuentra tu Instance ID en el panel de Ultramsg
                </p>
              </div>

              <div>
                <Label htmlFor="ultramsg_token">Token</Label>
                <Input
                  id="ultramsg_token"
                  type="password"
                  value={ultramsgConfig.token}
                  onChange={(e) => setUltramsgConfig(prev => ({ ...prev, token: e.target.value }))}
                  placeholder="••••••••••••••••••••"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Token de autenticación de tu instancia Ultramsg
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Configuración del Webhook</h4>
                <p className="text-sm text-blue-800 mb-2">
                  Configura este webhook en tu panel de Ultramsg:
                </p>
                <code className="bg-white p-2 rounded text-xs break-all block">
                  {BACKEND_URL}/api/webhooks/ultramsg
                </code>
                <p className="text-xs text-blue-600 mt-2">
                  Eventos: message, audio | Método: POST
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={saveUltramsgConfig}
                  disabled={saving}
                  className="bg-[#25D366] hover:bg-[#075E54]"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={testUltramsgConnection}
                  disabled={testing || !ultramsgConfig.instance_id || !ultramsgConfig.token}
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4 mr-2" />
                      Probar Conexión
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Configuration */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-600" />
                <CardTitle>Configuración de Inteligencia Artificial</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="use_emergent_key"
                  checked={aiConfig.use_emergent_key}
                  onCheckedChange={(checked) => setAiConfig(prev => ({ ...prev, use_emergent_key: checked }))}
                />
                <Label htmlFor="use_emergent_key">Usar Emergent LLM Key (Recomendado)</Label>
              </div>

              {!aiConfig.use_emergent_key && (
                <div>
                  <Label htmlFor="openai_key">OpenAI API Key</Label>
                  <Input
                    id="openai_key"
                    type="password"
                    value={aiConfig.openai_api_key}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, openai_api_key: e.target.value }))}
                    placeholder="sk-••••••••••••••••••••"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tu API Key personal de OpenAI
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="ai_model">Modelo de IA</Label>
                <Input
                  id="ai_model"
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="gpt-4o-mini"
                  className="mt-1"
                />
              </div>

              {aiConfig.use_emergent_key && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Emergent LLM Key Activa</h4>
                  <p className="text-sm text-green-800">
                    Estás usando la clave universal de Emergent que funciona con OpenAI, Anthropic y Google.
                    Los créditos se deducirán automáticamente de tu balance.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={saveAiConfig}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={testAiConnection}
                  disabled={testing}
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-4 h-4 mr-2" />
                      Probar IA
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit Policies */}
        <TabsContent value="credit" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <CardTitle>Políticas de Crédito</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* New Policy Form */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Nueva Política</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Banda</Label>
                      <select
                        value={newPolicy.band}
                        onChange={(e) => setNewPolicy(prev => ({ ...prev, band: e.target.value }))}
                        className="w-full p-2 border rounded-md mt-1"
                      >
                        <option value="A">Banda A (80-100)</option>
                        <option value="B">Banda B (65-79)</option>
                        <option value="C">Banda C (50-64)</option>
                        <option value="D">Banda D (0-49)</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label>Score Mínimo</Label>
                      <Input
                        type="number"
                        value={newPolicy.min_score_required}
                        onChange={(e) => setNewPolicy(prev => ({ ...prev, min_score_required: parseInt(e.target.value) }))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Monto Máximo (Q)</Label>
                      <Input
                        type="number"
                        value={newPolicy.max_amount}
                        onChange={(e) => setNewPolicy(prev => ({ ...prev, max_amount: parseFloat(e.target.value) }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label>Plazo Máximo (días)</Label>
                      <Input
                        type="number"
                        value={newPolicy.max_tenor_days}
                        onChange={(e) => setNewPolicy(prev => ({ ...prev, max_tenor_days: parseInt(e.target.value) }))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tasa de Interés (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newPolicy.interest_rate}
                        onChange={(e) => setNewPolicy(prev => ({ ...prev, interest_rate: parseFloat(e.target.value) }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label>Probabilidad Aprobación (%)</Label>
                      <Input
                        type="number"
                        value={newPolicy.approval_probability}
                        onChange={(e) => setNewPolicy(prev => ({ ...prev, approval_probability: parseInt(e.target.value) }))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={saveCreditPolicy}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? 'Guardando...' : 'Guardar Política'}
                  </Button>
                </div>

                {/* Existing Policies */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Políticas Actuales</h3>
                  
                  {creditPolicies.map((policy) => (
                    <div key={policy.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Badge className={`${
                          policy.band === 'A' ? 'bg-green-100 text-green-800' :
                          policy.band === 'B' ? 'bg-blue-100 text-blue-800' :
                          policy.band === 'C' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Banda {policy.band}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCreditPolicy(policy.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="text-sm space-y-1">
                        <p><strong>Monto:</strong> Q{policy.max_amount.toLocaleString()}</p>
                        <p><strong>Plazo:</strong> {policy.max_tenor_days} días</p>
                        <p><strong>Tasa:</strong> {policy.interest_rate}%</p>
                        <p><strong>Aprobación:</strong> {policy.approval_probability}%</p>
                        <p><strong>Score mín:</strong> {policy.min_score_required}</p>
                      </div>
                    </div>
                  ))}
                  
                  {creditPolicies.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No hay políticas configuradas
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600" />
                <CardTitle>Configuración General</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Información del Sistema</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Versión:</strong> WABI v1.0.0</p>
                    <p><strong>Última actualización:</strong> {new Date().toLocaleDateString()}</p>
                    <p><strong>Base de datos:</strong> MongoDB</p>
                    <p><strong>Stack:</strong> FastAPI + React</p>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Enlaces Importantes</h4>
                  <div className="text-sm space-y-1 text-blue-800">
                    <p><strong>Panel Admin:</strong> {window.location.origin}</p>
                    <p><strong>Formulario Público:</strong> {window.location.origin}/subscribe</p>
                    <p><strong>API Webhook:</strong> {BACKEND_URL}/api/webhooks/ultramsg</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfigurationPanel;