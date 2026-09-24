# Imagem de execução do InfoHub (API + interface, tudo em um único processo).
# Usada pelo Coolify (e por qualquer ambiente Docker) para montar o servidor.
FROM node:20-alpine

WORKDIR /app

# Copia primeiro só os manifestos para aproveitar o cache do Docker
# quando o código muda mas as dependências continuam as mesmas.
COPY package*.json ./
RUN npm install --omit=dev

# Copia o restante do backend (rotas, modelos, interface em public/, etc.).
COPY . .

# Pasta onde ficam os arquivos entregues pelos alunos (RNF-04).
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
EXPOSE 3000

# Verificação de saúde usada pelo Coolify/Docker para saber se o app está de pé.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]
