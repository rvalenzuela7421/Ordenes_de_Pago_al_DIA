# 🏢 Sistema COP - Seguros Bolívar

**Centro de Órdenes de Pago - Prototipo Funcional**

Una aplicación web moderna para automatizar el flujo del Centro de Órdenes de Pago (COP) de Seguros Bolívar.

## 🎨 **Identidad Visual**

Aplicación diseñada con la identidad corporativa oficial de **Seguros Bolívar**:

- **🟢 Verde Principal**: `#008457` (18% de la paleta)
- **🟡 Amarillo Institucional**: `#FFD046` (4% de la paleta)  
- **⚪ Blanco**: `#FFFFFF` (60% de la paleta)
- **Grises**: Neutros oficiales (18% restante)

## 🚀 **Stack Tecnológico**

- **Frontend**: Next.js 14 (App Router)
- **Framework**: React 18 + TypeScript
- **Estilos**: TailwindCSS con colores corporativos
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Autenticación**: Supabase Auth (Email/Password + Google OAuth)

## 📋 **Funcionalidades Implementadas**

### 🔐 **Autenticación**
- ✅ Login con email/contraseña
- ✅ Registro con validaciones estrictas
- ✅ Integración Google OAuth (preparada)
- ✅ Modo Demo para pruebas
- ✅ Validación de contraseñas robusta

### 🏠 **Dashboard**
- ✅ Sidebar responsivo con navegación
- ✅ Avatar de usuario estilo Gmail
- ✅ Estadísticas de órdenes de pago
- ✅ Tabla de órdenes recientes
- ✅ Acciones rápidas

### 👥 **Gestión de Perfiles**
- ✅ Roles diferenciados: AdminCOP, ConsultaCOP, OperacionCOP, OperacionTRIB
- ✅ Permisos por rol
- ✅ Protección de rutas

## 🎭 **Modo Demo**

La aplicación incluye un **modo demo completamente funcional**:
- Simulación de autenticación
- Datos de prueba realistas
- Interfaz completamente navegable
- Sin necesidad de configurar base de datos

## 🛠️ **Instalación y Uso**

### Prerrequisitos
- Node.js 18+ 
- npm o yarn

### Instalación
```bash
# Clonar repositorio
git clone [URL_DEL_REPO]
cd "OPs al DIA"

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

### Configuración para Producción

Para usar con datos reales, configurar variables de entorno en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

## 📁 **Estructura del Proyecto**

```
📦 Sistema COP
├── 🎨 app/                 # Páginas y layouts (App Router)
│   ├── auth/              # Autenticación (login/register)
│   └── dashboard/         # Dashboard principal
├── 🧩 components/         # Componentes reutilizables
├── 📚 lib/               # Utilidades y configuraciones
├── 🎪 styles/            # Estilos globales (Tailwind + Seguros Bolívar)
└── 📋 docs/              # Documentación técnica
```

## 🔧 **Configuración de Colores**

Los colores institucionales están definidos en `tailwind.config.ts`:

```typescript
bolivar: {
  // Verde institucional
  green: '#008457',           // Principal
  'green-dark': '#006d47',    // Hover/Activo
  'green-light': '#99B24F',   // Complementario
  
  // Amarillo institucional  
  yellow: '#FFD046',          // Acento principal
  'yellow-dark': '#F6C343',   // Hover
  
  // Neutros oficiales
  gray: '#B4B5B7',           // Gris suave
  white: '#FFFFFF',          // Blanco dominante
  black: '#000000',          // Textos principales
}
```

## 🎯 **Próximas Funcionalidades**

- [ ] **Recuperación de contraseña** con OTP (SMS/Email)
- [ ] **Gestión completa de órdenes** (CRUD)
- [ ] **Reglas automáticas** de aprobación
- [ ] **Integración completa** con Supabase
- [ ] **Reportes y analytics**
- [ ] **Notificaciones en tiempo real**

## 📄 **Licencia**

Desarrollado para **Seguros Bolívar** - Uso interno corporativo.

---

**🎨 Diseñado con los colores y estándares oficiales de Seguros Bolívar**

*Prototipo funcional - Sistema COP v1.0*