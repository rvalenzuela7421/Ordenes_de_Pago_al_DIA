# 🔐 Validaciones Estrictas de Contraseña - COP

## ✅ **Nuevas Reglas Implementadas**

### **Criterios Obligatorios:**
1. ✅ **Longitud**: Entre 6 y 12 caracteres
2. ✅ **Mayúscula**: Al menos una letra mayúscula (A-Z)
3. ✅ **Número**: Al menos un número (0-9)
4. ✅ **Caracter especial**: Al menos uno de: `!@#$%^&*(),.?":{}|<>`
5. ✅ **Sin secuencias**: No números secuenciales (123, 456, 789, etc.)

---

## 🎯 **Ejemplos de Contraseñas**

### **✅ Válidas:**
- `Pass123!` ✅ (8 chars, mayús, número, especial, sin secuencias)
- `Mi#Pass9` ✅ (8 chars, mayús, número, especial, sin secuencias)
- `Cop*2024` ✅ (8 chars, mayús, número, especial, sin secuencias)
- `Segur@8` ✅ (7 chars, mayús, número, especial, sin secuencias)

### **❌ Inválidas:**
- `password` ❌ (sin mayús, sin número, sin especial)
- `Pass123` ❌ (sin caracter especial, números secuenciales)
- `PASSWORD!` ❌ (sin número)
- `pass123!` ❌ (sin mayúscula, números secuenciales)
- `MiPasswordMuyLarga123!` ❌ (más de 12 caracteres)
- `P1!` ❌ (menos de 6 caracteres)

---

## 🖥️ **Dónde Aplican las Validaciones**

### **✅ Implementado en:**
- 📝 **Registro de usuarios** (`/auth/register`)
- 🔄 **Cambio de contraseña** (`/auth/update-password`) 
- 👤 **Perfil de usuario** (`/dashboard/profile`)

### **📋 Login Normal:**
- Solo requiere 6+ caracteres (no aplican validaciones estrictas)
- Las validaciones estrictas son solo para **crear/cambiar** contraseñas

---

## 🎨 **Características Visuales**

### **Indicador de Fortaleza:**
- 🔴 **Débil** - Menos de 3 criterios cumplidos
- 🟡 **Media** - 3-4 criterios cumplidos  
- 🟢 **Fuerte** - 5+ criterios cumplidos

### **Validación en Tiempo Real:**
- ✅ Puntos verdes para criterios cumplidos
- ⚪ Puntos grises para criterios pendientes
- 🔴 Lista de errores específicos
- 📊 Barra de progreso visual

---

## ⚡ **Comportamiento del Sistema**

### **Botones Habilitados/Deshabilitados:**
- **Registro**: Solo se habilita con contraseña válida + confirmación
- **Cambio**: Solo se habilita con contraseña actual + nueva válida + confirmación
- **Actualización**: Solo se habilita si cumple todos los criterios

### **Mensajes de Error:**
- Específicos por cada criterio no cumplido
- Se muestran en tiempo real mientras se escribe
- Priorizan el primer error encontrado

---

## 🔧 **Para Desarrolladores**

### **Función Principal:**
```typescript
validatePassword(password: string): {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}
```

### **Archivos Modificados:**
- `lib/utils.ts` - Función de validación
- `components/AuthForm.tsx` - Registro con validación visual
- `app/auth/update-password/page.tsx` - Cambio de contraseña
- `app/dashboard/profile/page.tsx` - Perfil de usuario

---

**🛡️ Estas validaciones garantizan contraseñas seguras en todo el sistema COP**
