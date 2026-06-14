# ProtoHost 后端重构方案：Spring Boot → Node.js (`server/`)

**日期**: 2026-06-12（修订）  
**目标读者**: Node.js 全栈开发者  
**约束**: 前端 Vue 3 SPA 保持独立；API 契约兼容；**不做数据库数据迁移**  
**新后端目录**: 仓库根目录 **`server/`**（与现有 `backend/` Java 并存，开发完成后再切换）  
**参考**: [architectural-analysis-2026-06-12.md](./architectural-analysis-2026-06-12.md)

---

## 1. 执行摘要

| 维度 | 现状 (`backend/`) | 目标 (`server/`) |
|------|-------------------|------------------|
| 运行时 | Java 17 + Spring Boot 3.2 | **Node.js 20+** |
| Web 框架 | Spring MVC | **Koa 2** |
| ORM | MyBatis-Plus | **Drizzle ORM** |
| 数据库 | MySQL 8（无生产数据） | **PostgreSQL 16**（**全新建表，不迁数据**） |
| 校验 | 手写 | **Zod** |
| 认证 | Spring Security + JWT | `jose` + Koa 中间件 |
| 部署 | docker-compose mysql + jar | docker-compose postgres + node |

**策略**:

- 在 **`server/`** 从零实现 Node 后端，**`backend/` 暂保留作对照**（尤其 Share 注入逻辑）。
- 数据库：**直接换 PG**，用 Drizzle migrate 建表；**无需 pgloader / 数据导出**（当前库无内容）。
- Share 静态服务：**绝大多数是普通 js/css/html/图片，直接读盘流式返回**；仅 Axure 相关的少数文件走 Java 同款注入逻辑，**原样搬到 `axure-injector.ts`**。
- **根目录 pnpm workspace**：`frontend` + `server` 多包管理；Java `backend/` **不纳入** workspace。
- **Docker 双轨**：旧栈文件 **原样保留**；新栈用 **独立 compose / Dockerfile / nginx 配置**。

**推荐选型**: Koa + Drizzle + PG + Zod（非 Next.js）。原因见 §3。

---

## 2. pnpm Monorepo（根目录多包管理）

### 2.1 目标布局

```
ProtoHost/
├── package.json              # workspace 根：聚合脚本
├── pnpm-workspace.yaml
├── pnpm-lock.yaml            # 唯一锁文件（在根目录）
├── .npmrc                    # 可选： shamefully-hoist=false 等
├── frontend/                 # @protohost/frontend
│   └── package.json
├── server/                   # @protohost/server
│   └── package.json
├── backend/                  # Java — 不在 pnpm workspace 内
├── docker-compose.yml        # ★ 旧栈：mysql + Java backend + frontend（不改动）
├── docker-compose.server.yml # ★ 新栈：postgres + server + frontend
├── .env.example              # 旧栈环境变量（MYSQL_* 等）
└── .env.server.example       # 新栈环境变量（PG_*、DATABASE_URL 等）
```

### 2.2 `pnpm-workspace.yaml`

```yaml
packages:
  - 'frontend'
  - 'server'
```

`backend/`（Maven/Java）**不要**写进 workspace。

### 2.3 根 `package.json`（示例）

```json
{
  "name": "protohost",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel --filter @protohost/frontend --filter @protohost/server dev",
    "dev:web": "pnpm --filter @protohost/frontend dev",
    "dev:server": "pnpm --filter @protohost/server dev",
    "build": "pnpm --filter @protohost/frontend build && pnpm --filter @protohost/server build",
    "db:push": "pnpm --filter @protohost/server db:push",
    "db:migrate": "pnpm --filter @protohost/server db:migrate",
    "seed": "pnpm --filter @protohost/server seed",
    "test": "pnpm --filter @protohost/server test"
  },
  "packageManager": "pnpm@9.15.0"
}
```

### 2.4 子包命名

| 目录 | `package.json` name | 说明 |
|------|---------------------|------|
| `frontend/` | `@protohost/frontend` | 现有 Vue 应用，改 name 即可 |
| `server/` | `@protohost/server` | 新 Koa 后端 |

### 2.5 常用命令（均在根目录执行）

```bash
pnpm install                    # 安装全部 workspace 依赖
pnpm dev                        # 并行：frontend :5173 + server :3000
pnpm dev:server                 # 仅 API
pnpm --filter @protohost/server add zod   # 给 server 加依赖

# 旧前端若仍有 package-lock.json，迁移后删除，统一用根 pnpm-lock.yaml
```

### 2.6 与 Java `backend/` 的关系

- Java 构建仍用 `mvn` / `backend/Dockerfile`，与 pnpm 无关。
- 开发时可同时跑：旧栈 `docker compose up` **或** 新栈本地 `pnpm dev` + `docker compose -f docker-compose.server.yml up postgres -d`。

### 2.7 后期可选：`packages/shared`

若要把 Zod schema / 类型共享给 frontend，可增加 `packages/shared`，workspace 追加一行即可；**Phase 0 不必做**。

---

## 3. 仓库与 Docker 文件对照（双轨）

### 3.1 旧栈（保持不变，勿改）

| 文件 | 用途 |
|------|------|
| `docker-compose.yml` | mysql + `backend` (Java :8080) + `frontend` |
| `backend/Dockerfile` | Maven 多阶段 → JRE jar |
| `frontend/Dockerfile` | npm ci + vite build + nginx |
| `frontend/nginx.conf` | `proxy_pass http://backend:8080` |

启动：

```bash
cp .env.example .env
docker compose up -d --build
```

### 3.2 新栈（新增文件）

| 文件 | 用途 |
|------|------|
| `docker-compose.server.yml` | postgres + `server` (:3000) + `frontend` |
| `server/Dockerfile` | pnpm workspace 构建 `@protohost/server` |
| `frontend/Dockerfile.server` | pnpm workspace 构建 `@protohost/frontend` |
| `frontend/nginx.server.conf` | `proxy_pass http://server:3000` |
| `.env.server.example` | `PG_PASSWORD`、`JWT_SECRET` 等新栈变量 |

启动：

```bash
cp .env.server.example .env.server
docker compose -f docker-compose.server.yml --env-file .env.server up -d --build
```

### 3.3 为何 Docker build context 用仓库根目录

monorepo 下 `pnpm-lock.yaml`、`pnpm-workspace.yaml`、根 `package.json` 在根目录，**server / frontend 的 Dockerfile 均应以 `context: .`（repo root）构建**，通过 `dockerfile:` 指定子路径。

```yaml
# docker-compose.server.yml 片段
services:
  server:
    build:
      context: .
      dockerfile: server/Dockerfile
  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile.server
```

### 3.4 切换完成后的默认 compose

新栈验证通过后，可将 `docker-compose.server.yml` 提升为默认（例如改名为 `docker-compose.yml` 并归档旧文件到 `docker-compose.legacy.yml`）——**属 Phase 5 收尾，开发期不要动旧 `docker-compose.yml`**。

---

## 4. Koa vs Next.js（结论不变）

前端已分离，核心是 REST + 大文件上传 + Share 静态服务。Koa 对大文件、流式 ZIP、`serveFile` 分支逻辑更直接。Next.js API Routes 不适合塞进 Share 注入，故不选。

```
Vue SPA  ──►  Nginx  ──►  server/ (Koa)
                            ├── Drizzle → PostgreSQL（空库建表）
                            └── uploads/ 卷
```

---

## 5. Share / Axure：实现策略（修订）

### 5.1 Java 现状

逻辑全在 `ShareController.serveFile()`，**没有**独立 `axure-injector` 类。Node 侧拆到 `server/src/modules/share/axure-injector.ts` 仅为可读性，**算法与字符串应与 Java 一致**。

### 5.2 两条路径（大部分 vs 少数）

```
GET /api/share/{slug}/files/**

  ├─ 公开项目 ──────────────────────────► fs.createReadStream + mime（普通静态资源）
  │
  └─ 私密项目
       ├─ .html / .htm 且无有效 viewToken ──► 403
       ├─ .html / .htm 有 viewToken ───────► readFile → injectHtml() → 返回 body
       ├─ axplayer.js ────────────────────► readFile → injectAxplayerJs() → 返回 body
       ├─ doc.js ───────────────────────────► readFile → injectDocJs() → 返回 body
       └─ 其他（.css .js .png .woff …）──────► 直接流式返回（与 Java 一致）
```

**要点**: 除 Axure 的 HTML 劫持脚本 + `axplayer.js` / `doc.js` 六处 `replace` 外，**全是普通静态资源**，实现就是 `detectContentType` + `createReadStream`，不要过度设计。

### 5.3 从 Java 照抄的三块（`axure-injector.ts`）

| 函数 | 来源 | 行为 |
|------|------|------|
| `injectHtml(html, viewToken)` | `ShareController` 99–114 行 | `</head>` 前插入劫持 XHR/fetch/location/iframe 的 script |
| `injectAxplayerJs(js, viewToken)` | 120–133 行 | 3 处 `mainFrame.contentWindow.location.href = ...` replace |
| `injectDocJs(js, viewToken)` | 138–151 行 | 3 处 `targetLocation.href` / `window.location.href` replace |

辅助函数（与 Java 对齐）：

| 函数 | 来源 |
|------|------|
| `readTextFile(path)` | `readHtml()`：UTF-8 strict，失败 fallback GBK（`iconv-lite`） |
| `detectContentType(path)` | `detectContentType()` 扩展名表 |
| `resolveSafePath(baseDir, subPath)` | canonical path + `startsWith` 防穿越 |

JWT viewToken：`jose` 实现与 `JwtUtil` 一致 — `subject=slug`，`claim type=view`，过期 `JWT_VIEW_EXPIRATION`（默认 7200s）。

### 5.4 开发顺序建议

1. 先实现 **普通静态分支**（公开 + 私密非 Axure 文件）— 覆盖 90%+ 请求  
2. 把 Java 注入代码 **复制改语法** 进 `axure-injector.ts`  
3. 用同一 Axure ZIP 在 ViewPage 手测：密码 → 首屏 → 页内跳转  

可选：对 `injectHtml` 输出做 snapshot test；**不强制** golden test 全流程，以 Java 源码为唯一真相来源即可。

---

## 6. 除技术栈外必须替换的组件

### 6.1 安全与认证

| Java | Node (`server/`) |
|------|------------------|
| `JwtFilter` + `JwtUtil` | `lib/jwt.ts` + `middleware/auth.ts` |
| `BCryptPasswordEncoder` | `bcrypt` cost=10 |
| `SecurityConfig` CORS | `@koa/cors` + `CORS_ORIGINS` 环境变量 |
| iframe 预览 | 不设 `X-Frame-Options: DENY` |

### 6.2 邮件与验证码

| Java | Node |
|------|------|
| `EmailServiceImpl` | Nodemailer |
| `VerificationCodeServiceImpl` | 内存 Map + TTL（单机够用；多实例后期加 Redis） |

### 6.3 文件与 ZIP

| Java | Node |
|------|------|
| `ZipUtil` | `adm-zip` 或 `yauzl`（保留 entry 检测：index.html / start.html） |
| `MultipartFile` | `@koa/multer`，200MB |
| `FileSystemResource` | `fs.createReadStream` + `mime-types` |
| `getDirSize` / `deleteDirectory` | `lib/fs-utils.ts` |

### 6.4 基础设施

| Java | Node |
|------|------|
| `schema.sql` | Drizzle schema + `drizzle-kit push` / migrate |
| `DefaultUserInitializer` | `scripts/seed-default-user.ts` 或启动钩子 |
| `GlobalExceptionHandler` | `middleware/error-handler.ts` |
| `application.yml` | `.env` + `config/env.ts`（Zod） |
| `pom.xml` | `server/package.json` + pnpm |

### 6.5 部署与网络（仅新文件）

| 新文件 | 说明 |
|--------|------|
| `docker-compose.server.yml` | 新栈 compose |
| `server/Dockerfile` | Node 镜像 |
| `frontend/Dockerfile.server` | 前端镜像（pnpm + nginx.server.conf） |
| `frontend/nginx.server.conf` | upstream → `server:3000` |
| `.env.server.example` | 新栈环境变量模板 |
| `frontend/vite.config.ts` | dev proxy → `localhost:3000`（开发期改） |

**不修改**：`docker-compose.yml`、`frontend/Dockerfile`、`frontend/nginx.conf`、`backend/Dockerfile`。

### 6.6 前端改动（最小）

| 项 | 是否改 |
|----|--------|
| `/api/*` 路径与 JSON 字段 | 否 |
| dev proxy / nginx upstream | **是**（指向 server 端口） |
| `listVersions` DTO | 可选，后端顺手去掉 `storagePath` |

---

## 7. 数据库：全新 PostgreSQL（无数据迁移）

**当前无生产数据 → 不做 MySQL→PG 数据迁移，直接替换。**

### 7.1 建表方式

1. 按现有 `backend/src/main/resources/schema.sql` 字段语义写 Drizzle schema（4 表）  
2. `pnpm drizzle-kit generate` + `migrate`，或开发期 `drizzle-kit push`  
3. 无需 pgloader、CSV、双写  

### 7.2 类型对照（建表参考）

| MySQL (`schema.sql`) | PostgreSQL (Drizzle) |
|----------------------|----------------------|
| `BIGINT AUTO_INCREMENT` | `bigint` `generatedAlwaysAsIdentity()` |
| `BOOLEAN` | `boolean` |
| `DATETIME` | `timestamp with time zone` |
| `ON UPDATE CURRENT_TIMESTAMP` | 应用层更新 `updatedAt` |

### 7.3 Drizzle Schema 草案

```typescript
// server/src/db/schema/users.ts
export const users = pgTable('users', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
// project_groups, projects, project_versions — 与 schema.sql 字段一一对应
```

### 7.4 Zod

- 请求体 / query：`modules/*/*.schemas.ts`  
- 环境变量：`config/env.ts`  
- 可选：`drizzle-zod` 生成 insert schema  

---

## 8. API 契约（必须保持兼容）

### Auth `POST /api/auth/*`

| 路径 | 说明 |
|------|------|
| `/send-register-code?email=` | 发注册验证码 |
| `/send-reset-code?email=` | 发重置验证码 |
| `/register` | `{ email, password, code }` → `{ token, email }` |
| `/login` | `{ email, password }` → `{ token, email }` |
| `/reset-password` | `{ email, password, code }` |

### Groups `/api/groups/*`

CRUD + `PUT /api/groups/sort`

### Projects `/api/projects/*`

| 方法 | 路径 |
|------|------|
| GET | `/api/projects?groupId=` |
| POST | `/api/projects/upload`（multipart，字段同 `ProjectController`） |
| DELETE | `/api/projects/{id}` |
| PUT | `/api/projects/{id}/group?groupId=` |
| PUT | `/api/projects/{id}/settings` |
| GET | `/api/projects/{id}/versions` |
| GET | `/api/projects/versions/{versionId}/download` |

### Share `/api/share/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/{slug}/meta` | 浏览计数 + 元数据 |
| POST | `/{slug}/verify` | 密码校验 → `viewToken` |
| GET | `/{slug}/files/**` | 见 §4 |

---

## 9. `server/` 目录结构

```
server/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── .env.example
├── Dockerfile
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── config/
│   │   └── env.ts                 # Zod 校验环境变量
│   ├── db/
│   │   ├── index.ts
│   │   ├── schema/                # users, project_groups, projects, project_versions
│   │   └── migrations/
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── error-handler.ts
│   │   ├── request-logger.ts
│   │   └── cors.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schemas.ts
│   │   │   └── verification.service.ts
│   │   ├── groups/
│   │   │   ├── group.routes.ts
│   │   │   ├── group.service.ts
│   │   │   └── group.schemas.ts
│   │   ├── projects/
│   │   │   ├── project.routes.ts
│   │   │   ├── project.service.ts
│   │   │   ├── version.service.ts
│   │   │   ├── upload.service.ts
│   │   │   └── project.schemas.ts
│   │   └── share/
│   │       ├── share.routes.ts      # meta / verify / files/**
│   │       ├── share.service.ts     # 查项目、浏览计数、鉴权分支
│   │       ├── static-file.ts       # 普通资源：stream + content-type
│   │       └── axure-injector.ts    # ★ 从 Java 照抄的 3 个 inject 函数
│   ├── lib/
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── mailer.ts
│   │   ├── zip.ts
│   │   └── fs-utils.ts
│   └── types/
│       └── koa.d.ts
├── scripts/
│   └── seed-default-user.ts
└── tests/
    ├── auth.test.ts
    └── axure-injector.test.ts       # 可选：inject 输出 snapshot
```

### 分层

```
Routes (Zod) → Service (db.transaction) → Drizzle / lib
Share 特例：share.routes → share.service → static-file | axure-injector
```

### 关键决策

1. **Axure 注入只搬 Java，不重构** — 升级 Axure 时再改 replace 字符串  
2. **普通静态走 stream** — 不要对全部 js 读入内存  
3. **上传失败** — transaction 回滚 + 删目录  
4. **版本列表** — 返回 DTO，不含 `storagePath`  
5. **默认端口** — `3000`（与 Java `8080` 区分，减少并行开发冲突）

---

## 10. 依赖清单（`server/package.json` 参考）

```json
{
  "dependencies": {
    "koa": "^2.15",
    "@koa/cors": "^5.0",
    "@koa/router": "^13.0",
    "@koa/multer": "^3.0",
    "drizzle-orm": "^0.38",
    "postgres": "^3.4",
    "zod": "^3.24",
    "jose": "^5.9",
    "bcrypt": "^5.1",
    "nodemailer": "^6.9",
    "adm-zip": "^0.5",
    "mime-types": "^2.1",
    "iconv-lite": "^0.6",
    "dotenv": "^16.4"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30",
    "typescript": "^5.7",
    "tsx": "^4.19",
    "vitest": "^2.1",
    "@types/koa": "^2.15"
  }
}
```

---

## 11. Docker 新栈文件草案

### 11.1 `docker-compose.server.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: protohost
      POSTGRES_PASSWORD: ${PG_PASSWORD}
      POSTGRES_DB: protohost
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U protohost -d protohost"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  server:
    build:
      context: .
      dockerfile: server/Dockerfile
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://protohost:${PG_PASSWORD}@postgres:5432/protohost
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRATION: ${JWT_EXPIRATION:-604800}
      JWT_VIEW_EXPIRATION: ${JWT_VIEW_EXPIRATION:-7200}
      UPLOAD_BASE_PATH: /app/uploads
      PORT: 3000
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost,http://localhost:5173}
      DEFAULT_USER_ENABLED: ${DEFAULT_USER_ENABLED:-true}
      DEFAULT_USER_EMAIL: ${DEFAULT_USER_EMAIL:-root@protohost.local}
      DEFAULT_USER_PASSWORD: ${DEFAULT_USER_PASSWORD:-root123456}
      MAIL_HOST: ${MAIL_HOST:-}
      MAIL_PORT: ${MAIL_PORT:-587}
      MAIL_USERNAME: ${MAIL_USERNAME:-}
      MAIL_PASSWORD: ${MAIL_PASSWORD:-}
    volumes:
      - uploads_server:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile.server
    restart: unless-stopped
    ports:
      - "${HTTP_PORT:-8080}:80"
    depends_on:
      - server

volumes:
  postgres_data:
  uploads_server:
```

说明：新栈 `uploads_server` 卷名与旧栈 `uploads` 区分，避免并行试验时混用。HTTP 默认 **8080** 以免与旧栈占 80 端口冲突（旧栈 `docker compose up` 仍用 80）。

### 11.2 `server/Dockerfile`（monorepo 构建）

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile --filter @protohost/server...
COPY server ./server
RUN pnpm --filter @protohost/server build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable pnpm
ENV NODE_ENV=production
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile --filter @protohost/server... --prod
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/drizzle ./server/drizzle
VOLUME /app/uploads
WORKDIR /app/server
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

迁移启动时可在 compose 加 `command` 跑 migrate，或镜像内 `docker-entrypoint.sh` 先 `drizzle-kit migrate` 再启动。

### 11.3 `frontend/Dockerfile.server`

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile --filter @protohost/frontend...
COPY frontend ./frontend
RUN pnpm --filter @protohost/frontend build

FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.server.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 11.4 `frontend/nginx.server.conf`

与现有 `nginx.conf` 结构相同，仅 upstream 不同：

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    client_max_body_size 210m;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://server:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 11.5 `.env.server.example`

```bash
# PostgreSQL
PG_PASSWORD=change_me

# Security（与旧栈 JWT_SECRET 可共用同一值）
JWT_SECRET=replace_with_base64_secret
JWT_EXPIRATION=604800
JWT_VIEW_EXPIRATION=7200

# Default user
DEFAULT_USER_ENABLED=true
DEFAULT_USER_EMAIL=root@protohost.local
DEFAULT_USER_PASSWORD=root123456

# Mail（可选）
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=

# 新栈对外端口（避免与旧栈 80 冲突）
HTTP_PORT=8080
CORS_ORIGINS=http://localhost:8080,http://localhost:5173
```

开发期推荐：**postgres 用 compose 起，应用用根目录 `pnpm dev`**，不必每次 build 镜像。

---

## 12. 开发阶段计划

### Phase 0 — Monorepo + 脚手架（1 天）

- [ ] 根目录 `package.json`、`pnpm-workspace.yaml`，`pnpm install`  
- [ ] `frontend/package.json` → name `@protohost/frontend`；删除 `frontend/package-lock.json`（若有）  
- [ ] `server/` 初始化：`@protohost/server`、Koa、`GET /health`  
- [ ] `config/env.ts`（Zod）+ `.env.server.example`  
- [ ] 新增 **`docker-compose.server.yml`**（仅 postgres 服务可先用来本地开发）  
- [ ] 本地 postgres：`docker compose -f docker-compose.server.yml --env-file .env.server up postgres -d`  

### Phase 1 — 数据层（1 天）

- [ ] Drizzle 四表 schema  
- [ ] migrate / push 建表  
- [ ] `seed-default-user.ts`  

### Phase 2 — Auth + Groups（2–3 天）

- [ ] Auth 五路由 + 邮件验证码 + JWT 中间件  
- [ ] Groups CRUD + sort  
- [ ] `middleware/error-handler.ts`  

### Phase 3 — Projects（3–4 天）

- [ ] 上传 / ZIP 解压 / 版本记录  
- [ ] 设置 / 移动 / 删除 / 版本下载  

### Phase 4 — Share（2–3 天）

- [ ] `static-file.ts`：普通资源流式 + path 安全 + content-type  
- [ ] `axure-injector.ts`：从 `ShareController.java` 照抄三块注入  
- [ ] meta / verify  
- [ ] ViewPage 手测 Axure 私密分享  

### Phase 5 — Docker 新栈 + 联调（1–2 天）

- [ ] 完成 `server/Dockerfile`、`frontend/Dockerfile.server`、`nginx.server.conf`  
- [ ] `docker compose -f docker-compose.server.yml --env-file .env.server up --build` 全链路冒烟  
- [ ] `frontend/vite.config.ts` proxy → `localhost:3000`  
- [ ] **勿改** 旧 `docker-compose.yml` / `frontend/Dockerfile` / `nginx.conf`  
- [ ] 验收通过后：可选将 `docker-compose.server.yml` 提升为默认，旧文件改名为 `docker-compose.legacy.yml`；归档 `backend/`  

**预估**: 约 **2 周**（单人），含 Phase 0 monorepo 半天。

---

## 13. 风险登记（修订）

| 风险 | 等级 | 缓解 |
|------|------|------|
| Axure replace 字符串与 Java 不一致 | 🟠 中 | 对照 `ShareController.java` 复制；ViewPage 手测 |
| Axure 版本升级导致 replace 失效 | 🟠 中 | 与 Java 相同债务；集中维护 `axure-injector.ts` |
| 200MB 上传内存 | 🟠 中 | multer 落盘；流式解压 |
| 验证码内存 Map 多实例 | 🟡 低 | 后期 Redis |
| ~~PG 数据迁移~~ | — | **不适用**（空库替换） |

| pnpm workspace 与 Docker 路径不一致 | 🟡 低 | build `context: .`；CI 与文档统一 |

---

## 14. 与架构审计的衔接（迁移时顺带）

- Share 拆文件：`share.service` + `static-file` + `axure-injector`（不再 God Controller）  
- `listVersions` DTO 去 `storagePath`  
- 结构化错误替代 `RuntimeException`  
- CORS 环境变量化  
- 生产 `DEFAULT_USER_ENABLED=false`  

前端重复逻辑、类型补全：后端 `server/` 稳定后单独 PR。

---

## 15. 环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 | — |
| `JWT_SECRET` | HS256 密钥 | — |
| `JWT_EXPIRATION` | 登录 token 秒 | `604800` |
| `JWT_VIEW_EXPIRATION` | viewToken 秒 | `7200` |
| `UPLOAD_BASE_PATH` | 上传根目录 | `./uploads` |
| `PORT` | 监听端口 | `3000` |
| `CORS_ORIGINS` | 逗号分隔 | `http://localhost:5173` |
| `DEFAULT_USER_*` | 种子用户 | 见 `.env.example` |
| `MAIL_*` | SMTP | 可选 |

---

## 16. 本地开发快速开始（Phase 0 完成后）

```bash
# 根目录 — 新栈
cp .env.server.example .env.server
# 编辑 PG_PASSWORD、JWT_SECRET

# 仅 Postgres（新 compose 文件）
docker compose -f docker-compose.server.yml --env-file .env.server up postgres -d

# pnpm workspace
corepack enable
pnpm install
pnpm db:push          # server 包脚本
pnpm seed
pnpm dev              # frontend :5173 + server :3000 并行

# 旧 Java 栈（需要时，与上并行注意端口）
cp .env.example .env
docker compose up -d  # mysql + java :8080 + frontend :80
```

| 场景 | 命令 |
|------|------|
| 新栈本地开发 | `pnpm dev` + compose 只起 postgres |
| 新栈 Docker 全量 | `docker compose -f docker-compose.server.yml --env-file .env.server up --build` |
| 旧栈 Docker | `docker compose up`（默认文件，不变） |

---

**相关产物**: 交互式架构图见 `backend-architecture-artifact.html`（图中 `backend/`  mentally 替换为 `server/`）。

**Java 对照源文件**:

- `backend/src/main/java/com/protohost/controller/ShareController.java` — Share + 注入  
- `backend/src/main/java/com/protohost/util/JwtUtil.java` — viewToken  
- `backend/src/main/resources/schema.sql` — 表结构语义  
