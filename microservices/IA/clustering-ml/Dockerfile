FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar TODAS las dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Remover devDependencies
RUN npm prune --production

# Exponer puerto
EXPOSE 3002

# Comando de inicio
CMD ["npm", "start"]
