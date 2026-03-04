FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorios necesarios
RUN mkdir -p logs backups uploads

# Exponer puerto
EXPOSE 5000

# Comando de inicio
CMD ["node", "server.js"]