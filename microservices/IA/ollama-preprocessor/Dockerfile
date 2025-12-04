FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Build TypeScript
RUN npm run build

# Exponer puerto
EXPOSE 3005

CMD ["npm", "start"]
