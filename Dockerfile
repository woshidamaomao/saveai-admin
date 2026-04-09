# =============================================================================
# 专用于 admin 管理后台（本目录即项目根，与仓库根目录的 API Dockerfile 无关）
# 构建：在 admin 目录执行 docker compose build / docker build -f Dockerfile .
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=https://api-service.saveai.net/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
