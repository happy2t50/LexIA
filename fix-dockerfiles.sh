#!/bin/bash

# Script para corregir todos los Dockerfiles

echo "Actualizando Dockerfiles..."

# Auth
cat > ./microservices/auth/Dockerfile <<'EOF'
FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar TODAS las dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Compilar TypeScript si es necesario
RUN npm run build || true

# Remover devDependencies
RUN npm prune --production

# Exponer puerto
EXPOSE 3003

# Comando de inicio
CMD ["npm", "start"]
EOF

# OLAP Cube
cat > ./microservices/IA/olap-cube/Dockerfile <<'EOF'
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
EXPOSE 3001

# Comando de inicio
CMD ["npm", "start"]
EOF

# Clustering
cat > ./microservices/IA/clustering-ml/Dockerfile <<'EOF'
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
EOF

# NLP
cat > ./microservices/IA/nlp/Dockerfile <<'EOF'
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
EXPOSE 3004

# Comando de inicio
CMD ["npm", "start"]
EOF

# RAG - ya lo actualizamos manualmente antes

echo "✅ Todos los Dockerfiles actualizados!"
