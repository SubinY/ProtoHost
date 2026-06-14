# ProtoHost

轻量的 HTML 原型托管与分享平台。

ProtoHost 面向 Axure 等工具导出的 ZIP 静态原型，提供上传托管、项目管理、版本留存和受控分享能力，帮助团队更方便地发布、查看和流转原型。

## 适用场景

- 产品、设计团队集中托管 Axure / HTML 原型
- 向客户、业务方或测试同学分发可访问的预览链接
- 为同一原型维护多个发布版本
- 对私密原型增加密码访问控制

## 为什么使用 ProtoHost

- 开箱即用：上传 ZIP 后即可在线预览
- 便于管理：支持项目分组、版本记录与历史下载
- 易于分享：支持公开链接和密码访问
- 面向团队：降低原型分发、回收与复查成本

## 快速开始

- 想快速体验：查看 [Docker Compose](#docker-compose)
- 想参与开发：查看 [本地开发](#本地开发)
- 想了解能力边界：继续阅读功能说明、接口与数据结构

## 核心特性

- 上传 ZIP 原型包并在线托管
- 支持项目分组与筛选
- 支持项目版本管理与历史包下载
- 支持公开链接与密码访问
- 支持在线预览与浏览次数统计
- 提供注册、登录、邮箱验证码与找回密码能力

## 技术栈

### 后端 (`server/`)

- Node.js 20+
- Koa 2
- Drizzle ORM
- PostgreSQL 16
- Zod
- jose (JWT)
- Nodemailer

### 前端 (`frontend/`)

- Vue 3
- Vite 5
- TypeScript
- Vue Router
- Pinia
- Tailwind CSS
- Axios
- lucide-vue-next

### 部署

- Docker Compose（postgres + server + frontend/nginx）
- pnpm workspace（根目录统一依赖）

## 项目结构

```text
ProtoHost/
├─ server/                         # Koa API 后端
│  ├─ src/modules/                 # auth、groups、projects、share
│  ├─ src/db/schema/               # Drizzle 表定义
│  └─ tests/                       # 冒烟与注入逻辑测试
├─ frontend/                       # Vue 3 前端
│  ├─ src/api/                     # 接口请求封装
│  ├─ src/components/              # UI 组件
│  ├─ src/pages/                   # 页面
│  ├─ src/router/                  # 路由
│  ├─ src/stores/                  # Pinia 状态管理
│  └─ src/types/                   # 类型定义
├─ docker-compose.yml              # postgres + server + frontend
├─ package.json                    # pnpm workspace 根脚本
└─ README.md
```

## 功能说明

### 1. 原型上传与托管

登录用户可以上传 ZIP 文件创建项目，并设置：

- 项目名称
- 版本号
- 描述
- 所属分组
- 公开或私密访问
- 私密项目访问密码

上传后的 ZIP 会被解压并以静态资源形式提供访问，适合直接托管 Axure 导出的 HTML 原型包。

### 2. 项目与分组管理

系统支持：

- 查看当前用户的全部项目
- 按分组筛选项目
- 新建、编辑、删除项目分组
- 调整项目所属分组
- 修改项目访问设置
- 删除项目

### 3. 版本管理

每个项目支持维护多个版本记录，包含：

- 版本号
- 更新说明
- 文件存储路径
- 文件大小
- 创建时间

用户可以查看历史版本，并下载指定版本文件。

### 4. 分享与访问控制

项目分享分为两种模式：

- 公开访问：可直接打开分享链接
- 私密访问：输入访问密码后获取浏览令牌

对于私密项目，系统通过 `viewToken` 控制 HTML 入口页访问，并在部分场景下注入到内部资源请求中，尽量保证原型内嵌页面与脚本跳转能够正常访问。

## 主要页面

前端当前包含以下核心页面：

- `/login`：登录
- `/register`：注册
- `/forgot-password`：找回密码
- `/`：项目首页 / 控制台
- `/upload`：上传原型
- `/view/:slug`：分享预览页

## 接口概览

### 认证接口

- `POST /api/auth/send-register-code`
- `POST /api/auth/send-reset-code`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/reset-password`

### 分组接口

- `GET /api/groups`
- `POST /api/groups`
- `PUT /api/groups/{id}`
- `DELETE /api/groups/{id}`
- `PUT /api/groups/sort`

### 项目接口

- `GET /api/projects`
- `POST /api/projects/upload`
- `DELETE /api/projects/{id}`
- `PUT /api/projects/{id}/group`
- `PUT /api/projects/{id}/settings`
- `GET /api/projects/{id}/versions`
- `GET /api/projects/versions/{versionId}/download`

### 分享接口

- `GET /api/share/{slug}/meta`
- `POST /api/share/{slug}/verify`
- `GET /api/share/{slug}/files/**`

## 数据结构

核心表（PostgreSQL）：

- `users`：用户
- `project_groups`：项目分组
- `projects`：项目
- `project_versions`：项目版本

其中：

- `projects.share_slug` 用于生成外部访问链接
- `projects.entry_file` 表示原型入口文件，默认 `index.html`
- `projects.storage_path` 与 `project_versions.storage_path` 用于定位上传文件存储目录

## Docker Compose

适合快速体验或本地完整联调。

### 1. 准备环境变量

复制 `.env.example` 为 `.env`，并至少配置：

- `PG_PASSWORD`
- `JWT_SECRET`

如需邮箱验证码功能，还需配置 `MAIL_*` 变量。

### 2. 启动服务

```bash
docker compose up --build
```

启动后包含：

- `postgres`：PostgreSQL 16（宿主机 `5434` → 容器 `5432`）
- `server`：Koa API（`3000`）
- `frontend`：Nginx 静态站点 + API 反代

默认通过 `http://localhost:8080` 访问（由 `HTTP_PORT` 控制）。

健康检查：`http://localhost:3000/api/health` 或 `http://localhost:8080/api/health`。

## 本地开发

### 环境要求

- Node.js 20+
- pnpm 9+
- Docker（用于本地 PostgreSQL，或自备 PG 实例）

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动数据库

推荐只起 PostgreSQL（前后端在本地跑，避免 3000 端口冲突）：

```bash
pnpm infra:up
```

等价于 `docker compose -f docker-compose.infra.yml up -d`。容器带 `restart: unless-stopped`，Docker Desktop 开机后会自动拉起，相当于「常驻 PG」。

全栈 Docker 演示仍用 `docker compose up --build`（会占用 3000 / 8080）。

### 3. 配置后端

复制 `server/.env.example` 为 `server/.env`，确认 `DATABASE_URL` 指向 `localhost:5434`（与 compose 端口映射一致）。

同步 schema：

```bash
pnpm db:push
```

### 4. 启动开发服务

```bash
pnpm dev
```

- 前端：`http://localhost:5173`（Vite，API 代理到 `localhost:3000`）
- 后端：`http://localhost:3000`

默认种子用户（`DEFAULT_USER_ENABLED=true` 时）：`root@protohost.local` / `root123456`。

### 常用脚本

| 命令 | 说明 |
|------|------|
| `pnpm infra:up` | 仅启动 PostgreSQL（本地开发用） |
| `pnpm infra:down` | 停止 PostgreSQL 容器（保留数据卷） |
| `pnpm dev` | 并行启动 frontend + server |
| `pnpm build` | 构建前后端 |
| `pnpm test` | 运行 server 测试 |
| `pnpm smoke` | API 冒烟测试 |
| `pnpm db:push` | Drizzle push schema |
| `pnpm seed` | 创建默认用户 |

## 配置说明

根目录 `.env` 供 Docker Compose 使用；本地开发主要编辑 `server/.env`：

```env
DATABASE_URL=postgres://protohost:change_me@localhost:5434/protohost
JWT_SECRET=replace_with_base64_secret_at_least_32_chars_long
JWT_EXPIRATION=604800
JWT_VIEW_EXPIRATION=7200
UPLOAD_BASE_PATH=./uploads
PORT=3000
CORS_ORIGINS=http://localhost:5173,http://localhost:8080
```

关键项说明：

- `JWT_SECRET`：登录令牌与浏览令牌签名密钥（至少 32 字符）
- `JWT_EXPIRATION`：登录态有效期（秒）
- `JWT_VIEW_EXPIRATION`：私密原型浏览令牌有效期（秒）
- `UPLOAD_BASE_PATH`：ZIP 解压后的文件存储目录

## 安全说明

提交代码前请注意：

- 不要提交 `.env`、`server/.env`
- 不要提交真实邮箱凭证、数据库密码、JWT 密钥
- 生产环境建议设置 `DEFAULT_USER_ENABLED=false`

## 适合的使用方式

这个仓库适合：

- 本地开发与调试
- Docker 部署与演示
- 作为 Axure / HTML 原型分享系统的基础项目进行二次开发

## 可扩展方向

如果继续演进，这个项目很适合扩展：

- 管理员后台
- 分享链接过期时间控制
- CDN / 对象存储接入
- 项目成员协作
- 更细粒度的权限系统
- 上传与访问审计日志
- 在线版本对比能力
