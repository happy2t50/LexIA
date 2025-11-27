FROM node:18-slim

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias (sin --only=production para tener @xenova/transformers)
RUN npm install

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Pre-descargar modelo de embeddings (opcional, para acelerar primer inicio)
# RUN node -e "const { pipeline } = require('@xenova/transformers'); pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2').then(() => console.log('Model cached'));"

# Exponer puerto
EXPOSE 3009

# Comando de inicio
CMD ["npm", "start"]
