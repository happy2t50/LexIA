FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo TypeScript para build)
RUN npm install

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Remover devDependencies para reducir tamaño
RUN npm prune --production

# Exponer puerto
EXPOSE 3010

# Comando de inicio
CMD ["npm", "start"]
