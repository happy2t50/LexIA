FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY microservices/auth/package*.json ./

# Instalar TODAS las dependencias
RUN npm install

# Copiar código fuente
COPY microservices/auth/. .

# Compilar TypeScript si es necesario
RUN npm run build

# Remover devDependencies
RUN npm prune --production

# Exponer puerto
EXPOSE 3003

# Comando de inicio
CMD ["npm", "start"]
