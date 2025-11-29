# Dockerfile para Microservicio de Transacciones - LexIA 2.0

FROM node:20-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY src ./src

# Compilar TypeScript
RUN npm run build

# Exponer puerto
EXPOSE 3005

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3005

# Comando de inicio
CMD ["npm", "start"]
