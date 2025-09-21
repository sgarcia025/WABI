import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  TrendingUp,
  ShoppingCart,
  Calculator,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductsManager = ({ currentUser }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const [formData, setFormData] = useState({
    name: '',
    unit_cost: '',
    sale_price: '',
    service: false,
    category: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Get current user's SME
      const userResponse = await axios.get(`${API}/auth/me`);
      const smeId = userResponse.data.sme_id;
      
      const response = await axios.get(`${API}/products?sme_id=${smeId}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar productos');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      unit_cost: '',
      sale_price: '',
      service: false,
      category: ''
    });
    setEditingProduct(null);
  };

  const openDialog = (product = null) => {
    if (product) {
      setFormData({
        name: product.name,
        unit_cost: product.unit_cost.toString(),
        sale_price: product.sale_price.toString(),
        service: product.service,
        category: product.category || ''
      });
      setEditingProduct(product);
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.sale_price) {
      toast.error('Nombre y precio de venta son obligatorios');
      return;
    }

    try {
      const userResponse = await axios.get(`${API}/auth/me`);
      const smeId = userResponse.data.sme_id;
      
      const productData = {
        name: formData.name,
        unit_cost: parseFloat(formData.unit_cost) || 0,
        sale_price: parseFloat(formData.sale_price),
        service: formData.service,
        category: formData.category
      };

      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}?sme_id=${smeId}`, productData);
        toast.success('Producto actualizado');
      } else {
        await axios.post(`${API}/products?sme_id=${smeId}`, productData);
        toast.success('Producto creado');
      }

      setShowDialog(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar producto');
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
      await axios.delete(`${API}/products/${productId}`);
      toast.success('Producto eliminado');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const calculateProfit = (salePrice, unitCost) => {
    const profit = salePrice - unitCost;
    const margin = unitCost > 0 ? (profit / unitCost) * 100 : 0;
    return { profit, margin };
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'products' && !product.service) ||
                         (filterType === 'services' && product.service);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#3A3A3A]">Productos y Servicios</h1>
          <p className="text-gray-600 mt-1">Gestiona tu catálogo y calcula rentabilidad</p>
        </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => openDialog()}
              className="bg-[#25D366] hover:bg-[#075E54]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Coca Cola 600ml"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="service"
                  checked={formData.service}
                  onCheckedChange={(checked) => setFormData({...formData, service: checked})}
                />
                <Label htmlFor="service">Es un servicio</Label>
              </div>

              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bebidas">Bebidas</SelectItem>
                    <SelectItem value="comida">Comida</SelectItem>
                    <SelectItem value="snacks">Snacks</SelectItem>
                    <SelectItem value="servicios">Servicios</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unit_cost">Costo Unitario (Q)</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({...formData, unit_cost: e.target.value})}
                    placeholder="8.50"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="sale_price">Precio Venta (Q) *</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    step="0.01"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({...formData, sale_price: e.target.value})}
                    placeholder="12.00"
                    className="mt-1"
                  />
                </div>
              </div>

              {formData.unit_cost && formData.sale_price && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span>Ganancia:</span>
                      <span className="font-semibold">
                        Q{(parseFloat(formData.sale_price) - parseFloat(formData.unit_cost)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Margen:</span>
                      <span className="font-semibold">
                        {parseFloat(formData.unit_cost) > 0 ? 
                          (((parseFloat(formData.sale_price) - parseFloat(formData.unit_cost)) / parseFloat(formData.unit_cost)) * 100).toFixed(1) + '%'
                          : '∞%'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 bg-[#25D366] hover:bg-[#075E54]"
                >
                  {editingProduct ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="products">Solo Productos</SelectItem>
            <SelectItem value="services">Solo Servicios</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-[#3A3A3A]">{products.length}</p>
              </div>
              <Package className="w-8 h-8 text-[#25D366]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Productos</p>
                <p className="text-2xl font-bold text-[#075E54]">
                  {products.filter(p => !p.service).length}
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-[#075E54]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Servicios</p>
                <p className="text-2xl font-bold text-[#3A3A3A]">
                  {products.filter(p => p.service).length}
                </p>
              </div>
              <Calculator className="w-8 h-8 text-[#3A3A3A]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Precio Promedio</p>
                <p className="text-2xl font-bold text-[#25D366]">
                  Q{products.length > 0 ? 
                    (products.reduce((sum, p) => sum + p.sale_price, 0) / products.length).toFixed(2) : 
                    '0.00'
                  }
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-[#25D366]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const { profit, margin } = calculateProfit(product.sale_price, product.unit_cost);
          
          return (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg truncate">{product.name}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={product.service ? "secondary" : "default"}>
                        {product.service ? 'Servicio' : 'Producto'}
                      </Badge>
                      {product.category && (
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDialog(product)}
                      className="text-[#25D366] hover:text-[#075E54]"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteProduct(product.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Precio de Venta:</span>
                    <span className="font-semibold text-lg text-[#25D366]">
                      Q{product.sale_price.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Costo Unitario:</span>
                    <span className="font-medium">Q{product.unit_cost.toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Ganancia:</span>
                      <span className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Q{profit.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-600">Margen:</span>
                      <div className="flex items-center gap-1">
                        <span className={`font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {margin.toFixed(1)}%
                        </span>
                        {margin > 0 && <TrendingUp className="w-3 h-3 text-green-600" />}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {searchTerm || filterType !== 'all' ? 'No se encontraron productos' : 'No hay productos registrados'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterType !== 'all' ? 
                'Intenta cambiar los filtros de búsqueda' : 
                'Comienza agregando productos y servicios a tu catálogo'
              }
            </p>
            {!searchTerm && filterType === 'all' && (
              <Button 
                onClick={() => openDialog()}
                className="bg-[#25D366] hover:bg-[#075E54]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Producto
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductsManager;