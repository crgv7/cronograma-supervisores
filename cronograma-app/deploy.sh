#!/bin/bash

# Script de Deploy para GitHub Pages
# Cronograma de Supervisores - Aplicación React

echo "🚀 Iniciando deploy a GitHub Pages..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Ejecuta este script desde el directorio cronograma-app"
    exit 1
fi

# Verificar que git está inicializado
if [ ! -d ".git" ]; then
    echo "📁 Inicializando repositorio Git..."
    git init
fi

# Verificar que el repositorio remoto está configurado
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "⚠️  Configurando repositorio remoto..."
    echo "Por favor, configura tu repositorio GitHub:"
    echo "git remote add origin https://github.com/TU-USUARIO/cronograma-supervisores.git"
    echo ""
    read -p "Presiona Enter cuando hayas configurado el remote..."
fi

# Verificar que package.json tiene la URL correcta
echo "🔧 Verificando configuración..."
if grep -q "https://tu-usuario.github.io/cronograma-supervisores" package.json; then
    echo "⚠️  IMPORTANTE: Actualiza la URL en package.json:"
    echo "   Cambia 'https://tu-usuario.github.io/cronograma-supervisores'"
    echo "   por 'https://TU-USUARIO.github.io/cronograma-supervisores'"
    echo ""
    read -p "Presiona Enter cuando hayas actualizado package.json..."
fi

# Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Construir y deploy
echo "🔨 Construyendo aplicación..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build exitoso!"
    echo "🚀 Subiendo a GitHub Pages..."
    npm run deploy
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 ¡Deploy exitoso!"
        echo "📍 Tu aplicación estará disponible en:"
        echo "   https://TU-USUARIO.github.io/cronograma-supervisores"
        echo ""
        echo "⏰ Nota: Puede tomar 5-10 minutos para que GitHub procese el deploy"
        echo ""
        echo "📋 Próximos pasos:"
        echo "1. Ve a tu repositorio en GitHub"
        echo "2. Settings → Pages → Source → gh-pages branch"
        echo "3. Espera a que aparezca 'Your site is ready'"
    else
        echo "❌ Error en el deploy. Verifica tu configuración de GitHub."
    fi
else
    echo "❌ Error en el build. Revisa los errores anteriores."
fi
