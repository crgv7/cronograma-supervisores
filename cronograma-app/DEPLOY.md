# 🚀 Deploy a GitHub Pages

## Requisitos Previos

1. **Cuenta GitHub**: Necesitas una cuenta en [github.com](https://github.com)
2. **Git instalado**: Para subir código a GitHub
3. **Node.js**: Para ejecutar npm

## Pasos para Deploy

### 1. Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com) e inicia sesión
2. Click en "New repository" (botón verde)
3. Nombre del repo: `cronograma-supervisores`
4. Marca "Public" (GitHub Pages requiere repos públicos para cuentas gratuitas)
5. Click "Create repository"

### 2. Configurar el Proyecto Local

```bash
# 1. Ir al directorio del proyecto
cd cronograma-app

# 2. Inicializar git (si no está inicializado)
git init

# 3. Agregar el repositorio remoto (reemplaza TU-USUARIO)
git remote add origin https://github.com/TU-USUARIO/cronograma-supervisores.git

# 4. Actualizar package.json con tu usuario
# Edita la línea "homepage" en package.json:
# "homepage": "https://TU-USUARIO.github.io/cronograma-supervisores"
```

### 3. Deploy Automático

```bash
# 1. Instalar dependencias (si no están instaladas)
npm install

# 2. Deploy directo (esto construye y sube automáticamente)
npm run deploy
```

### 4. Activar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Click en "Settings" (pestaña del repositorio)
3. Scroll hasta "Pages" en el menú lateral
4. En "Source", selecciona "Deploy from a branch"
5. Selecciona "gh-pages branch"
6. Click "Save"

### 5. Acceder a la Aplicación

Después de 5-10 minutos, tu app estará disponible en:
```
https://TU-USUARIO.github.io/cronograma-supervisores
```

## Comandos Útiles

```bash
# Deploy (construye y sube)
npm run deploy

# Solo construir (sin deploy)
npm run build

# Probar localmente
npm start
```

## Actualizaciones Futuras

Para actualizar la aplicación:

1. Haz cambios en el código
2. Ejecuta `npm run deploy`
3. Los cambios aparecerán en GitHub Pages en unos minutos

## Solución de Problemas

### Error: "gh-pages branch not found"
- Asegúrate de haber ejecutado `npm run deploy` al menos una vez
- Verifica que el repositorio sea público

### Error: "Permission denied"
- Asegúrate de estar logueado en Git: `git config --global user.name` y `git config --global user.email`
- O usa token personal en lugar de contraseña

### La página no carga
- Espera 10-15 minutos después del deploy
- Verifica que el `homepage` en package.json coincida con tu URL

## Estructura del Deploy

```
GitHub Pages URL: https://TU-USUARIO.github.io/cronograma-supervisores
                    ├── index.html (página principal)
                    ├── static/
                    │   ├── css/ (estilos)
                    │   └── js/ (JavaScript)
                    └── manifest.json
```
