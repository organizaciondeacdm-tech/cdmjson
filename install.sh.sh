#!/bin/bash

echo "🚀 Instalando backend ACDM..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

# Verificar MongoDB
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB no está instalado. Instálelo manualmente"
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Crear directorios necesarios
echo "📁 Creando directorios..."
mkdir -p logs
mkdir -p backups
mkdir -p uploads

# Configurar variables de entorno
if [ ! -f .env ]; then
    echo "🔧 Creando archivo .env..."
    cp .env.example .env
    echo "⚠️  Configure las variables en .env antes de continuar"
fi

# Inicializar base de datos
echo "🗄️  Inicializando base de datos..."
npm run seed

echo "✅ Instalación completada"
echo "🚀 Para iniciar el servidor: npm start"
echo "📝 Para desarrollo: npm run dev"