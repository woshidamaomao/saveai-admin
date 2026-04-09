# =============================================================================
# saveai-admin 管理后台（本目录为项目根）
# 运行：Node + serve 托管静态资源，由主机 Traefik 发现容器（无 nginx）
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=https://api-service.saveai.net/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN npm install -g serve@14
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "exec serve -s dist -l tcp://0.0.0.0:${PORT}"]
