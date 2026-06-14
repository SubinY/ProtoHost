FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile
COPY server ./server
RUN pnpm --filter @protohost/server run build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile --filter @protohost/server...
ENV NODE_ENV=production
COPY --from=build /app/server/dist ./server/dist
COPY server/drizzle.config.ts ./server/
COPY server/src/db ./server/src/db
VOLUME /app/uploads
WORKDIR /app/server
ENV UPLOAD_BASE_PATH=/app/uploads
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec drizzle-kit push && node dist/index.js"]
