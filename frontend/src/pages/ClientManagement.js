import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Users, 
  Building2,
  CreditCard,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  Plus,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import EditClientDialog from './EditClientDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientManagement = ({ currentUser }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [editingClient, setEditingClient] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentClient, setPaymentClient] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    reference: '',
    period_month: new Date().toISOString().slice(0, 7) // YYYY-MM format
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/admin/clients`);
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Error al cargar clientes');
    }
    setLoading(false);
  };

  const toggleClientStatus = async (clientId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      await axios.put(`${API}/admin/clients/${clientId}/status`, {
        status: newStatus
      });
      
      toast.success(`Cliente ${newStatus === 'active' ? 'activado' : 'desactivado'}`);
      fetchClients();
    } catch (error) {
      console.error('Error updating client status:', error);
      toast.error('Error al actualizar estado del cliente');
    }
  };

  const deleteClient = async (clientId, clientName) => {
    if (!window.confirm(`¿Estás seguro de eliminar el cliente "${clientName}" y todos sus datos asociados? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      await axios.delete(`${API}/smes/${clientId}`);
      toast.success('Cliente eliminado exitosamente');
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Error al eliminar cliente');
    }
  };

  const openPaymentDialog = (client) => {
    setPaymentClient(client);
    setPaymentForm({
      amount: client.plan === 'pro' ? '99' : '0',
      payment_method: 'cash',
      reference: '',
      period_month: new Date().toISOString().slice(0, 7)
    });
    setShowPaymentDialog(true);
  };

  const closePaymentDialog = () => {
    setPaymentClient(null);
    setShowPaymentDialog(false);
    setPaymentForm({
      amount: '',
      payment_method: 'cash',
      reference: '',
      period_month: new Date().toISOString().slice(0, 7)
    });
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    try {
      await axios.post(`${API}/payments/record`, {
        sme_id: paymentClient.id,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference: paymentForm.reference,
        period_month: paymentForm.period_month
      });
      
      toast.success('Pago registrado exitosamente');
      fetchClients();
      closePaymentDialog();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Error al registrar pago');
    }
  };

  const openEditDialog = (client) => {
    setEditingClient(client);
    setShowEditDialog(true);
  };

  const closeEditDialog = () => {
    setEditingClient(null);
    setShowEditDialog(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      suspended: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPlanColor = (plan) => {
    return plan === 'pro' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.nombre_negocio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.owner_phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesPlan = planFilter === 'all' || client.plan === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#3A3A3A]">Gestión de Clientes</h1>
          <p className="text-gray-600 mt-1">Administra negocios y suscripciones</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por negocio o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="suspended">Suspendidos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los planes</SelectItem>
            <SelectItem value="free">Plan Free</SelectItem>
            <SelectItem value="pro">Plan Pro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-[#3A3A3A]">{clients.length}</p>
              </div>
              <Users className="w-8 h-8 text-[#25D366]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {clients.filter(c => c.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Plan Pro</p>
                <p className="text-2xl font-bold text-purple-600">
                  {clients.filter(c => c.plan === 'pro').length}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ingresos Mensuales</p>
                <p className="text-2xl font-bold text-[#25D366]">
                  Q{(clients.filter(c => c.plan === 'pro').length * 99).toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-[#25D366]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredClients.map((client) => (
              <div key={client.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{client.nombre_negocio}</h3>
                      <Badge className={getStatusColor(client.status)}>
                        {client.status === 'active' ? 'Activo' : 
                         client.status === 'inactive' ? 'Inactivo' : 'Suspendido'}
                      </Badge>
                      <Badge className={getPlanColor(client.plan)}>
                        Plan {client.plan.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Propietario:</span> {client.owner_phone}
                      </div>
                      <div>
                        <span className="font-medium">WhatsApp:</span> {client.numero_celular_negocio}
                      </div>
                      <div>
                        <span className="font-medium">Ubicación:</span> {client.municipio}, {client.departamento}
                      </div>
                      <div>
                        <span className="font-medium">Registrado:</span> {new Date(client.created_at).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Último pago:</span> 
                        {client.last_payment ? new Date(client.last_payment).toLocaleDateString() : 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Próximo pago:</span> 
                        {client.next_payment_due ? new Date(client.next_payment_due).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {/* TODO: View client details */}}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(client)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteClient(client.id, client.nombre_negocio)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={client.status === 'active'}
                        onCheckedChange={() => toggleClientStatus(client.id, client.status)}
                      />
                      <span className="text-xs text-gray-500">
                        {client.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Status */}
                {client.next_payment_due && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Próximo pago: {new Date(client.next_payment_due).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {new Date(client.next_payment_due) < new Date() && (
                        <Badge className="bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Vencido
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm || statusFilter !== 'all' || planFilter !== 'all' ? 
                  'No se encontraron clientes' : 
                  'No hay clientes registrados'
                }
              </h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || planFilter !== 'all' ? 
                  'Intenta cambiar los filtros de búsqueda' : 
                  'Los clientes aparecerán aquí cuando se registren'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Client Dialog */}
      <EditClientDialog
        client={editingClient}
        isOpen={showEditDialog}
        onClose={closeEditDialog}
        onClientUpdated={fetchClients}
      />
    </div>
  );
};

export default ClientManagement;