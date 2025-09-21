import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Package, 
  Plus,
  Edit,
  Trash2,
  Search,
  DollarSign,
  Tag,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductManagement = ({ currentUser }) => {
  const [products, setProducts] = useState([]);
  const [smes, setSmes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSme, setSelectedSme] = useState('all');
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [productForm, setProductForm] = useState({
    sme_id: '',
    name: '',
    unit_cost: 0,
    sale_price: 0,
    service: false,
    category: ''
  });

  const categories = [
    'Alimentos', 'Bebidas', 'Ropa', 'Accesorios', 'Electrónicos', 
    'Hogar', 'Servicios', 'Salud', 'Educación', 'Otros'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch SMEs for the selector
      const smesResponse = await axios.get(`${API}/admin/clients`);
      setSmes(smesResponse.data.clients || []);
      
      // Fetch all products
      const productsResponse = await axios.get(`${API}/products`);
      setProducts(productsResponse.data || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    }
    setLoading(false);
  };

  const openProductDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        sme_id: product.sme_id,
        name: product.name,
        unit_cost: product.unit_cost || 0,
        sale_price: product.sale_price,
        service: product.service || false,
        category: product.category || ''
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        sme_id: selectedSme !== 'all' ? selectedSme : '',
        name: '',
        unit_cost: 0,
        sale_price: 0,
        service: false,
        category: ''
      });
    }
    setShowProductDialog(true);
  };

  const closeProductDialog = () => {
    setShowProductDialog(false);
    setEditingProduct(null);
    setProductForm({
      sme_id: '',
      name: '',
      unit_cost: 0,
      sale_price: 0,
      service: false,
      category: ''
    });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    
    if (!productForm.sme_id) {
      toast.error('Debe seleccionar una empresa');
      return;
    }

    try {
      if (editingProduct) {
        // Update existing product
        await axios.put(`${API}/products/${editingProduct.id}?sme_id=${productForm.sme_id}`, {
          name: productForm.name,
          unit_cost: parseFloat(productForm.unit_cost),
          sale_price: parseFloat(productForm.sale_price),
          service: productForm.service,
          category: productForm.category
        });
        toast.success('Producto actualizado exitosamente');
      } else {
        // Create new product
        await axios.post(`${API}/products?sme_id=${productForm.sme_id}`, {
          name: productForm.name,
          unit_cost: parseFloat(productForm.unit_cost),
          sale_price: parseFloat(productForm.sale_price),
          service: productForm.service,
          category: productForm.category
        });
        toast.success('Producto creado exitosamente');
      }
      
      fetchData();
      closeProductDialog();
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
      fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar producto');
    }
  };

  const getSmeNameById = (smeId) => {
    const sme = smes.find(s => s.id === smeId);
    return sme ? sme.nombre_negocio : 'Empresa no encontrada';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSme = selectedSme === 'all' || product.sme_id === selectedSme;
    return matchesSearch && matchesSme;
  });

  const calculateProfit = (salePrice, unitCost) => {
    return salePrice - (unitCost || 0);
  };

  const calculateMargin = (salePrice, unitCost) => {
    if (salePrice === 0) return 0;
    return ((salePrice - (unitCost || 0)) / salePrice * 100);
  };

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
          <h1 className="text-3xl font-bold text-[#3A3A3A]">Gestión de Productos</h1>
          <p className="text-gray-600 mt-1">Administra productos y servicios por empresa</p>
        </div>
        <Button 
          onClick={() => openProductDialog()}
          className="bg-[#25D366] hover:bg-[#075E54]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedSme} onValueChange={setSelectedSme}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las empresas</SelectItem>
            {smes.map((sme) => (
              <SelectItem key={sme.id} value={sme.id}>
                {sme.nombre_negocio}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold text-[#3A3A3A]">{filteredProducts.length}</p>
              </div>
              <Package className="w-8 h-8 text-[#25D366]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Servicios</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredProducts.filter(p => p.service).length}
                </p>
              </div>
              <Tag className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Precio Promedio</p>
                <p className="text-2xl font-bold text-purple-600">
                  Q{filteredProducts.length > 0 ? 
                    (filteredProducts.reduce((sum, p) => sum + p.sale_price, 0) / filteredProducts.length).toFixed(0) : 
                    0}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Empresas</p>
                <p className="text-2xl font-bold text-orange-600">
                  {new Set(filteredProducts.map(p => p.sme_id)).size}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      {product.service && (
                        <Badge className="bg-blue-100 text-blue-800">Servicio</Badge>
                      )}
                      {product.category && (
                        <Badge variant="outline">{product.category}</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Empresa:</span> {getSmeNameById(product.sme_id)}
                      </div>
                      <div>
                        <span className="font-medium">Precio venta:</span> Q{product.sale_price.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium">Costo:</span> Q{(product.unit_cost || 0).toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium">Ganancia:</span> Q{calculateProfit(product.sale_price, product.unit_cost).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          Margen: <span className="font-medium text-green-600">
                            {calculateMargin(product.sale_price, product.unit_cost).toFixed(1)}%
                          </span>
                        </span>
                        <span className="text-gray-600">
                          Creado: {new Date(product.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openProductDialog(product)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteProduct(product.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm || selectedSme !== 'all' ? 
                  'No se encontraron productos' : 
                  'No hay productos registrados'
                }
              </h3>
              <p className="text-gray-500">
                {searchTerm || selectedSme !== 'all' ? 
                  'Intenta cambiar los filtros de búsqueda' : 
                  'Los productos aparecerán aquí cuando se agreguen'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={closeProductDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleProductSubmit} className="space-y-4">
            <div>
              <Label htmlFor="sme_id">Empresa *</Label>
              <Select value={productForm.sme_id} onValueChange={(value) => setProductForm(prev => ({ ...prev, sme_id: value }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent>
                  {smes.map((sme) => (
                    <SelectItem key={sme.id} value={sme.id}>
                      {sme.nombre_negocio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                  id="name"
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select value={productForm.category} onValueChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit_cost">Costo Unitario (Q)</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.unit_cost}
                  onChange={(e) => setProductForm(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              
              <div>
                <Label htmlFor="sale_price">Precio de Venta (Q) *</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.sale_price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, sale_price: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="service"
                checked={productForm.service}
                onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, service: checked }))}
              />
              <Label htmlFor="service">Es un servicio</Label>
            </div>

            {/* Profit Calculation Display */}
            {productForm.sale_price > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Análisis de Rentabilidad</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Ganancia:</span>
                    <span className="ml-2 font-medium text-green-600">
                      Q{(productForm.sale_price - productForm.unit_cost).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Margen:</span>
                    <span className="ml-2 font-medium text-blue-600">
                      {((productForm.sale_price - productForm.unit_cost) / productForm.sale_price * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">ROI:</span>
                    <span className="ml-2 font-medium text-purple-600">
                      {productForm.unit_cost > 0 ? ((productForm.sale_price - productForm.unit_cost) / productForm.unit_cost * 100).toFixed(1) : '∞'}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeProductDialog}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#25D366] hover:bg-[#075E54]"
              >
                {editingProduct ? 'Actualizar' : 'Crear'} Producto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;