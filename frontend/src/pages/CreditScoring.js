import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown,
  Calculator,
  BarChart3,
  Clock,
  Award,
  AlertCircle,
  RefreshCw,
  DollarSign,
  Calendar,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreditScoring = ({ currentUser }) => {
  const [scoreData, setScoreData] = useState(null);
  const [history, setHistory] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchScoreData();
  }, []);

  const fetchScoreData = async () => {
    try {
      setLoading(true);
      
      // Get current user's SME
      const userResponse = await axios.get(`${API}/auth/me`);
      const smeId = userResponse.data.sme_id;
      
      // Fetch current score
      const scoreResponse = await axios.get(`${API}/scoring/${smeId}`);
      setScoreData(scoreResponse.data);
      
      // Fetch score history
      const historyResponse = await axios.get(`${API}/scoring/${smeId}/history?days=30`);
      setHistory(historyResponse.data.history || []);
      
      // Fetch recommendations
      const recsResponse = await axios.get(`${API}/scoring/${smeId}/recommendations`);
      setRecommendations(recsResponse.data);
      
    } catch (error) {
      console.error('Error fetching score data:', error);
      toast.error('Error al cargar datos de scoring');
    }
    setLoading(false);
  };

  const calculateNewScore = async () => {
    try {
      setCalculating(true);
      
      const userResponse = await axios.get(`${API}/auth/me`);
      const smeId = userResponse.data.sme_id;
      
      const response = await axios.post(`${API}/scoring/calculate/${smeId}`);
      
      if (response.data.success) {
        toast.success('Score crediticio actualizado');
        await fetchScoreData();
      } else {
        toast.error('Error calculando score');
      }
      
    } catch (error) {
      console.error('Error calculating score:', error);
      toast.error('Error calculando score');
    }
    setCalculating(false);
  };

  const getBandColor = (band) => {
    const colors = {
      'A': 'bg-green-500',
      'B': 'bg-blue-500', 
      'C': 'bg-yellow-500',
      'D': 'bg-red-500'
    };
    return colors[band] || 'bg-gray-500';
  };

  const getBandDescription = (band) => {
    const descriptions = {
      'A': 'Excelente - Riesgo muy bajo',
      'B': 'Bueno - Riesgo bajo',
      'C': 'Regular - Riesgo moderado',
      'D': 'Mejorable - Riesgo alto'
    };
    return descriptions[band] || 'Sin clasificar';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 65) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando scoring crediticio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#3A3A3A]">Score Crediticio</h1>
          <p className="text-gray-600 mt-1">Evaluación de riesgo crediticio basada en IA</p>
        </div>
        
        <Button 
          onClick={calculateNewScore}
          disabled={calculating}
          className="bg-[#25D366] hover:bg-[#075E54]"
        >
          {calculating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Calculando...
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4 mr-2" />
              Recalcular Score
            </>
          )}
        </Button>
      </div>

      {scoreData && (
        <>
          {/* Main Score Card */}
          <Card className="relative overflow-hidden">
            <div className={`absolute inset-0 ${getBandColor(scoreData.band)} opacity-5`}></div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Score Crediticio</CardTitle>
                  <p className="text-gray-600">Actualizado: {new Date(scoreData.calculated_at || scoreData.dt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <div className={`text-6xl font-bold ${getScoreColor(scoreData.score)}`}>
                    {scoreData.score}
                  </div>
                  <Badge className={`${getBandColor(scoreData.band)} text-white mt-2`}>
                    Banda {scoreData.band}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Nivel de Riesgo</span>
                    <span className="text-sm text-gray-600">{getBandDescription(scoreData.band)}</span>
                  </div>
                  <Progress value={scoreData.score} className="h-3" />
                </div>

                {scoreData.reasons && scoreData.reasons.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Factores Principales
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {scoreData.reasons.map((reason, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-700">
                          <div className="w-2 h-2 bg-[#25D366] rounded-full mr-2"></div>
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="components" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="components">Componentes</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
              <TabsTrigger value="recommendations">Crédito</TabsTrigger>
            </TabsList>

            {/* Score Components */}
            <TabsContent value="components" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Desglose del Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {scoreData.components && (
                    <div className="space-y-4">
                      {Object.entries(scoreData.components).map(([component, score]) => {
                        const componentNames = {
                          'sales_consistency': 'Consistencia de Ventas',
                          'financial_health': 'Salud Financiera', 
                          'payment_history': 'Historial de Pagos',
                          'business_growth': 'Crecimiento del Negocio',
                          'account_age': 'Antigüedad de Cuenta',
                          'transaction_volume': 'Volumen de Transacciones'
                        };
                        
                        const componentWeights = {
                          'sales_consistency': 25,
                          'financial_health': 25,
                          'payment_history': 20,
                          'business_growth': 15,
                          'account_age': 10,
                          'transaction_volume': 5
                        };
                        
                        return (
                          <div key={component} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{componentNames[component] || component}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  Peso: {componentWeights[component] || 0}%
                                </span>
                                <span className={`font-semibold ${getScoreColor(score)}`}>
                                  {Math.round(score)}
                                </span>
                              </div>
                            </div>
                            <Progress value={score} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Score History */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Evolución del Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="dt" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString()}
                          />
                          <YAxis domain={[0, 100]} />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            formatter={(value) => [value, 'Score']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#25D366" 
                            strokeWidth={3}
                            dot={{ fill: '#25D366' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No hay suficiente historial para mostrar</p>
                      <p className="text-sm text-gray-400">Los datos aparecerán conforme uses la plataforma</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Credit Recommendations */}
            <TabsContent value="recommendations" className="space-y-4">
              {recommendations && recommendations.success ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Recomendaciones de Crédito
                    </CardTitle>
                    <p className="text-gray-600">Basado en tu score actual: {recommendations.current_score} (Banda {recommendations.current_band})</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-600">Monto Máximo de Crédito</p>
                            <p className="text-2xl font-bold text-green-600">
                              Q{recommendations.recommendations.max_credit_amount.toLocaleString()}
                            </p>
                          </div>
                          <DollarSign className="w-8 h-8 text-green-600" />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-600">Plazo Máximo</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {recommendations.recommendations.max_tenor_days} días
                            </p>
                          </div>
                          <Calendar className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-600">Tasa de Interés Sugerida</p>
                            <p className="text-2xl font-bold text-yellow-600">
                              {recommendations.recommendations.suggested_interest_rate}%
                            </p>
                          </div>
                          <Target className="w-8 h-8 text-yellow-600" />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-600">Probabilidad de Aprobación</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {recommendations.recommendations.approval_probability}%
                            </p>
                          </div>
                          <Award className="w-8 h-8 text-purple-600" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">Consejos para Mejorar tu Score:</h4>
                      <ul className="text-sm space-y-1 text-gray-700">
                        <li>• Mantén ventas consistentes día a día</li>
                        <li>• Registra todos tus gastos para mejor control</li>
                        <li>• Cobra puntualmente tus cuentas por cobrar</li>
                        <li>• Diversifica tus productos más rentables</li>
                        <li>• Mantén un flujo de caja positivo</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No hay recomendaciones disponibles</p>
                    <p className="text-sm text-gray-400 mb-4">Calcula tu score primero</p>
                    <Button onClick={calculateNewScore} className="bg-[#25D366] hover:bg-[#075E54]">
                      Calcular Score
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {!scoreData && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay score calculado</h3>
            <p className="text-gray-500 mb-4">Calcula tu primer score crediticio para comenzar</p>
            <Button onClick={calculateNewScore} className="bg-[#25D366] hover:bg-[#075E54]">
              <Calculator className="w-4 h-4 mr-2" />
              Calcular Score Inicial
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreditScoring;