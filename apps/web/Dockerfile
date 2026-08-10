# Estágio usado pelo docker-compose: dev server do Vite, com HMR.
# O código vem por bind mount; da imagem sai só o node_modules.
FROM node:22-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=6 \
    CMD wget --quiet --spider http://127.0.0.1:5173/ || exit 1

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# Estágios de produção. O compose não os usa — este projeto roda sempre em
# desenvolvimento. Ficam aqui como o caminho de deploy, caso passe a existir.
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# nginx-unprivileged roda como não-root na 8080, sem precisar de capabilities.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1:8080/index.html || exit 1
