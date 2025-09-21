# 🚀 PLATAFORMA WABI - INFORMACIÓN COMPLETA

## ✅ ESTADO ACTUAL
- ✅ **Backend FastAPI** funcionando correctamente
- ✅ **Frontend React** con UI moderna y responsive
- ✅ **MongoDB** con datos de prueba configurados
- ✅ **Autenticación JWT** + RBAC funcionando
- ✅ **Dashboard administrativo** operativo
- ✅ **Webhook endpoint** para Ultramsg configurado

---

## 🔐 CREDENCIALES DE ACCESO

### Admin Principal:
- **URL:** https://sme-whatsapp.preview.emergentagent.com
- **Teléfono:** 50212345678
- **Contraseña:** admin123
- **Rol:** Administrador

---

## 📱 CONFIGURACIÓN ULTRAMSG (WHATSAPP)

### Endpoint Webhook:
```
POST https://sme-whatsapp.preview.emergentagent.com/api/webhooks/ultramsg
```

### ⚙️ Configuración en Panel Ultramsg:
1. Ir a tu panel de Ultramsg
2. Seleccionar tu instancia de WhatsApp
3. En "Webhooks", configurar:
   - **URL:** `https://sme-whatsapp.preview.emergentagent.com/api/webhooks/ultramsg`
   - **Eventos:** Message, Audio (para mensajes de texto y voz)
   - **Método:** POST

### 📄 Payload esperado:
El endpoint procesa automáticamente los payloads estándar de Ultramsg:
```json
{
  "instanceId": "instance123", 
  "from": "50212345678",
  "to": "instance_number",
  "message": "Vendí 2 coca colas a Q12 cada una",
  "type": "chat",
  "timestamp": "timestamp",
  "messageId": "msg_id"
}
```

Para mensajes de voz:
```json
{
  "instanceId": "instance123",
  "from": "50212345678", 
  "to": "instance_number",
  "type": "audio",
  "mediaUrl": "https://url-del-audio",
  "timestamp": "timestamp",
  "messageId": "msg_id"
}
```

---

## 🏢 CARACTERÍSTICAS IMPLEMENTADAS

### ✅ Backend (FastAPI + MongoDB):
- **Multi-tenant** architecture ready
- **Autenticación JWT** con roles (admin, finanzas, soporte, partner)
- **CRUD completo** para SMEs, productos, transacciones, clientes
- **Webhook Ultramsg** funcionando
- **Dashboard API** con métricas
- **Endpoint público** de suscripción

### ✅ Frontend (React + Shadcn/UI):
- **Login/Logout** sistema completo
- **Dashboard** con métricas en tiempo real
- **Gestión de negocios** (SMEs)
- **Navegación** sidebar moderna
- **Branding WABI** (colores verdes #25D366, #075E54)
- **Responsive design** adaptable

### ✅ Modelos de Datos:
- `Tenant` - Multi-tenant support
- `SME` - Negocios registrados
- `User` - Usuarios con RBAC
- `Product` - Catálogo con costo/precio de venta
- `Transaction` - Ventas, gastos, cuentas por cobrar
- `Customer` - CRM básico
- `Receivable` - Cuentas por cobrar
- `ScoreSnapshot` - Sistema de scoring (preparado)
- `WebhookLog` - Log de mensajes WhatsApp

---

## 🔮 PRÓXIMAS INTEGRACIONES (TO-DO)

### 1. Integración IA para Function Calling:
- Procesar mensajes de WhatsApp con IA
- Extraer entidades automáticamente
- Registrar transacciones automáticamente

### 2. Sistema de Scoring Crediticio:
- Algoritmo 0-100 puntos
- Bandas A/B/C/D
- Análisis de patrones de ventas/gastos

### 3. Reportes Automáticos:
- Productos más vendidos
- Productos más rentables  
- Resumen diario 8:00 PM

### 4. CRM Avanzado:
- Aging de cuentas por cobrar
- Alertas de vencimientos
- Gestión de cobranzas

---

## 📊 API ENDPOINTS DISPONIBLES

### Autenticación:
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuario actual
- `POST /api/auth/register` - Registro

### Negocios:
- `GET /api/smes` - Listar negocios
- `POST /api/smes` - Crear negocio
- `GET /api/smes/{id}` - Obtener negocio

### Productos:
- `GET /api/products?sme_id=X` - Listar productos
- `POST /api/products?sme_id=X` - Crear producto

### Transacciones:
- `GET /api/transactions?sme_id=X` - Listar transacciones
- `POST /api/transactions?sme_id=X` - Crear transacción

### Dashboard:
- `GET /api/dashboard` - Métricas generales

### Webhooks:
- `POST /api/webhooks/ultramsg` - Recibir mensajes WhatsApp

### Suscripción Pública:
- `POST /api/subscribe` - Registro público de negocios

---

## 🎯 DATOS DE PRUEBA CREADOS

### SME Demo:
- **Nombre:** Tienda Demo WABI
- **Propietario:** 50212345678
- **WhatsApp:** 50212345678
- **Ubicación:** Guatemala, Guatemala
- **Plan:** PRO

### Productos Demo:
1. **Coca Cola 600ml** - Costo: Q8.50, Venta: Q12.00
2. **Pan Francés** - Costo: Q0.75, Venta: Q1.00  
3. **Servicio de Entrega** - Costo: Q0.00, Venta: Q5.00

### Transacciones Demo:
1. **Venta:** 2 Coca Colas = Q24.00 (efectivo, vía WhatsApp)
2. **Gasto:** Q150.00 (transferencia, admin)

---

## 🌟 CARACTERÍSTICAS DESTACADAS

- ✅ **Branding profesional** con logo WABI
- ✅ **UI moderna** con componentes Shadcn/UI
- ✅ **Colores consistentes** (#25D366, #075E54)
- ✅ **Tipografía Inter** para mejor legibilidad
- ✅ **Responsive design** mobile-first
- ✅ **Arquitectura escalable** multi-tenant
- ✅ **Seguridad JWT** + roles
- ✅ **Logs estructurados** para debugging

---

## 🚀 ¿CÓMO USAR?

1. **Acceder al panel:** https://sme-whatsapp.preview.emergentagent.com
2. **Login:** 50212345678 / admin123
3. **Configurar Ultramsg** con el webhook endpoint
4. **Enviar mensaje WhatsApp** a tu instancia (se loggeará automáticamente)
5. **Ver datos** en Dashboard > Transacciones
6. **Gestionar negocios** en la sección Negocios

---

**¡La plataforma WABI está 100% funcional y lista para procesar mensajes de WhatsApp! 🎉**