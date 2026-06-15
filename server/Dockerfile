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
VOLUME /app/data
WORKDIR /app/server
ENV UPLOAD_BASE_PATH=/app/uploads
ENV JSON_STORE_PATH=/app/data
ENV STORAGE_DRIVER=postgres
EXPOSE 3000
CMD ["sh", "-c", "if [ \"$STORAGE_DRIVER\" = \"postgres\" ]; then pnpm exec drizzle-kit push; fi && node dist/index.js"]
