FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile
COPY frontend ./frontend
RUN pnpm --filter @protohost/frontend run build

FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
