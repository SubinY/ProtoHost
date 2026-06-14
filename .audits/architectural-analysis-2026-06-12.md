# Architectural Analysis Report

**Date**: 2026-06-12  
**Project**: ProtoHost  
**Files Analyzed**: 52  
**Dead Code Files**: 0  
**Duplication Groups**: 8  

---

## Executive Summary

ProtoHost 是一个 **前后端分离** 的单体仓库：Vue 3 SPA 前端 + Spring Boot REST 后端 + MySQL，核心能力是 ZIP 原型上传、版本管理、分组与受控分享预览。整体规模适中（约 52 个源文件），架构清晰，但存在 **Controller 层过重**、**前端工具函数重复**、**类型定义不完整** 等问题。

- **Dead Code**: 0 个完全废弃文件，3 处未使用导入/变量
- **Duplicated Functionality**: 8 组重复逻辑
- **Architectural Anti-Patterns**: 5 个问题
- **Type Issues**: 14 处 `any` 或缺失类型
- **Code Smells**: 12 处

**Estimated Cleanup**: 可删除约 15 行死代码，合并重复逻辑可减少约 120–180 行（约 3–5% 前端代码）

---

## 系统架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     用户浏览器                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │  Frontend (Vue 3 / Vite)          │
         │  - 6 Pages, 6 Components          │
         │  - Pinia (auth only)              │
         │  - Axios → /api/*                 │
         └─────────────────┬─────────────────┘
                           │ HTTP (JWT Bearer)
         ┌─────────────────┴─────────────────┐
         │  Backend (Spring Boot 3)          │
         │  Controller → Service → Mapper    │
         │  JWT Filter + BCrypt              │
         └─────────┬───────────────┬─────────┘
                   │               │
              ┌────┴────┐    ┌─────┴─────┐
              │  MySQL  │    │  File FS  │
              │  4 表   │    │  uploads/ │
              └─────────┘    └───────────┘
```

### 模块边界

| 模块 | 前端 | 后端 | 数据 |
|------|------|------|------|
| 认证 | `pages/Login*`, `stores/auth`, `api/auth` | `AuthController`, `AuthService` | `users` |
| 分组 | `GroupSidebar`, `api/group` | `ProjectGroupController`, `ProjectGroupServiceImpl` | `project_groups` |
| 项目 | `DashboardPage`, `ProjectCard`, `api/project` | `ProjectController`, `ProjectService` | `projects` |
| 版本 | `ProjectUpdateModal`, `ProjectVersionsModal` | `ProjectService.listVersions/download` | `project_versions` |
| 分享预览 | `ViewPage`, `api/share` | `ShareController`（含静态文件服务） | 文件系统 + JWT viewToken |

### 前端路由

| 路径 | 页面 | 鉴权 | 说明 |
|------|------|------|------|
| `/login` | LoginPage | 否 | 登录，JWT 写入 localStorage |
| `/register` | RegisterPage | 否 | 注册，含邮箱验证码 |
| `/forgot-password` | ForgotPasswordPage | 否 | 找回密码 |
| `/` | DashboardPage | 是 | 项目列表 + 分组侧边栏 |
| `/upload` | UploadPage | 是 | ZIP 上传 |
| `/view/:slug` | ViewPage | 否 | 原型 iframe 预览，私密项目需密码 |

路由守卫：`router/index.ts` 通过 `meta.auth` + Pinia `auth.token` 拦截未登录访问。

### API 契约

| Method | Path | 用途 |
|--------|------|------|
| POST | `/api/auth/*` | 注册/登录/验证码/重置密码 |
| GET/POST/PUT/DELETE | `/api/groups/*` | 分组 CRUD + sort |
| GET/POST/DELETE/PUT | `/api/projects/*` | 项目 CRUD/上传/设置/版本 |
| GET/POST | `/api/share/{slug}/*` | 元数据/验证/静态文件 |

---

## Dead Code

### Completely Dead Files (DELETE)

| File | Reason | Confidence |
|------|--------|------------|
| None | 所有源文件均被路由、组件或 Spring 容器引用 | — |

**Total Lines**: 0 行可整文件删除

### Dead Exports / Unused Symbols (REMOVE)

| File | Symbol | Reason | Confidence |
|------|--------|--------|------------|
| `frontend/src/api/http.ts:2` | `useAuthStore` import | 导入后未使用，token 直接读 localStorage | HIGH |
| `frontend/src/components/ProjectCard.vue:122` | `InboxIcon` import | 模板中未引用 | HIGH |
| `frontend/src/components/ProjectUpdateModal.vue:110` | `versionMap` | 声明后从未读写 | HIGH |

### Possibly Dead (VERIFY)

| File | Symbol | Reason | Verification Needed |
|------|--------|--------|---------------------|
| `frontend/src/api/group.ts:9` | `groupApi.sort` | 前端无任何调用；后端 `PUT /api/groups/sort` 已实现 | 确认是否计划做拖拽排序 UI |
| `backend/.../ProjectService.java:36` | `listByUser(Long userId)` | 仅被两参数重载内部调用，无外部直接引用 | 可内联，非必须删除 |
| `backend/.../ProjectService.java:54` | `upload(...)` 7 参数重载 | 仅委托给 11 参数版本 | 可合并签名 |

### Internal Dead Code

- `frontend/src/api/http.ts:2` — 未使用的 `useAuthStore` 导入
- `frontend/src/components/ProjectUpdateModal.vue:110` — 未使用的 `versionMap` 变量

---

## Duplicated Functionality

### CRITICAL: Exact Duplicates

#### Duplication Group 1: `formatSize(bytes)`
**Instances**: 2  
**Files**:
- `frontend/src/components/ProjectCard.vue:164-170`
- `frontend/src/components/ProjectVersionsModal.vue:107-113`

**Analysis**: 完全相同的字节格式化算法（1024 进制，B/KB/MB/GB）  
**Lines Duplicated**: ~7 行 × 2 = 14 行  
**Recommendation**: 提取到 `frontend/src/utils/format.ts`

#### Duplication Group 2: `formatVersion(v)`
**Instances**: 2  
**Files**:
- `frontend/src/components/ProjectCard.vue:147-150`
- `frontend/src/components/ProjectVersionsModal.vue:83-86`

**Analysis**: 相同逻辑：数字开头则加 `v` 前缀  
**Recommendation**: 同上，合并为 `formatVersion()`

---

### HIGH: Similar Logic

#### Duplication Group 3: 验证码倒计时 `sendCode()`
**Instances**: 2  
**Files**:
- `frontend/src/pages/RegisterPage.vue:67-83`
- `frontend/src/pages/ForgotPasswordPage.vue:77-93`

**Analysis**: 60 秒倒计时、`setInterval`、`onUnmounted` 清理逻辑几乎一致，仅 API 调用不同  
**Lines Duplicated**: ~25 行  
**Recommendation**: 提取 composable `useVerificationCode(apiFn)`

#### Duplication Group 4: 认证页品牌头部
**Instances**: 3  
**Files**:
- `frontend/src/pages/LoginPage.vue:4-10`
- `frontend/src/pages/RegisterPage.vue:4-10`
- `frontend/src/pages/ForgotPasswordPage.vue:4-10`

**Analysis**: Logo + 标题 + 副标题结构完全一致  
**Recommendation**: 提取 `AuthLayout` 或 `AuthBrandHeader` 组件

#### Duplication Group 5: Modal 弹窗外壳
**Instances**: 4  
**Files**:
- `ProjectSettingsModal.vue`
- `ProjectMoveModal.vue`
- `ProjectUpdateModal.vue`
- `ProjectVersionsModal.vue`

**Analysis**: 共享 `fixed inset-0 backdrop-blur` + 标题栏 + 关闭按钮 + 底部操作区模式  
**Recommendation**: 抽象 `Modal` / `Dialog` 基础组件

#### Duplication Group 6: `userId(Authentication auth)`
**Instances**: 2  
**Files**:
- `backend/.../ProjectController.java:78-80`
- `backend/.../ProjectGroupController.java:48-50`

**Analysis**: 完全相同：`(Long) auth.getPrincipal()`  
**Recommendation**: 提取 `AuthUtils.currentUserId(Authentication)` 或 `@AuthenticationPrincipal Long userId`

#### Duplication Group 7: 目录递归删除
**Instances**: 1 处定义，多处调用  
**Files**:
- `backend/.../ProjectService.java:236-244` — `deleteDirectory()`
- `backend/.../ProjectService.java:124-134` — `getDirSize()` 同类递归遍历

**Analysis**: 文件树遍历逻辑分散，可与 `ZipUtil` 或独立 `FileUtils` 统一  
**Recommendation**: 提取 `FileSystemUtils`

---

### Type Duplication

#### Type Group: 分享元数据 / 版本记录
**Instances**: 3 处内联类型，无共享定义  
**Files**:
- `frontend/src/types/index.ts` — 仅有 `Project`, `ProjectGroup`
- `frontend/src/pages/ViewPage.vue:68` — 内联 `{ name, version, isPublic, entryFile }`
- `frontend/src/api/project.ts:13` — `http.get<any[]>` 版本列表
- `frontend/src/components/ProjectVersionsModal.vue:80` — `ref<any[]>`

**Recommendation**: 新增 `ProjectVersion`, `ShareMeta` 接口；后端 `listVersions` 应返回 DTO 而非 Entity

---

## Architectural Anti-Patterns

### God Objects / 职责过重

#### `ShareController.java` (~195 行)
**Responsibilities**: 元数据、浏览计数、密码验证、静态文件服务、路径穿越防护、HTML/JS 注入（Axure viewToken）、Content-Type 检测  
**Issue**: Controller 承担全部分享域逻辑，直接依赖 `ProjectMapper`，绕过 Service 层  
**Recommendation**: 拆分为 `ShareService` + `StaticPrototypeService` + `AxureTokenInjector`

#### `ProjectService.java` (~268 行)
**Responsibilities**: 上传、解压、版本记录、分组更新、设置、删除、下载 ZIP、DTO 转换、文件系统操作  
**Issue**: 业务 + 基础设施（文件 IO）耦合  
**Recommendation**: 提取 `FileStorageService`、`VersionService`

---

### Circular Dependencies

**None found** — 前后端均无 A→B→A 循环导入。

---

### Tight Coupling

#### 前端组件直接调用 API
**Issue**: `ProjectCard`, `GroupSidebar`, 各 Modal 均直接 import `projectApi` / `groupApi`，无中间 service 层  
**Impact**: 数据获取逻辑分散在各组件，难以统一缓存、重试和错误处理  
**Recommendation**: 引入 `composables/` 或轻量 service 层封装 API 调用

#### JWT 存 localStorage + 双通道认证
**Files**:
- `frontend/src/api/http.ts:7-8` — Bearer token from localStorage
- `frontend/src/pages/ViewPage.vue:102-119` — viewToken in sessionStorage

**Issue**: 登录 token 存 localStorage，XSS 场景下存在泄露风险；login token 与 view token 存储方式和生命周期不统一

---

### Layer Violations

#### `ShareController` 直接使用 Mapper
- `ShareController` → `ProjectMapper`（跳过 Service）
- 业务异常用 `RuntimeException` 抛出，由 `GlobalExceptionHandler` 兜底

#### 后端 Entity 泄漏到 API
- `ProjectController.listVersions` 返回 `List<ProjectVersion>` 实体，而非 DTO
- 可能暴露 `storagePath` 等内部字段给前端

#### `ProjectGroupServiceImpl` 混用注入风格
- 类继承 `ServiceImpl` 但 `ProjectMapper` 用 `@Autowired` 字段注入，与同项目 `@RequiredArgsConstructor` 风格不一致

---

## Type Issues

### `any` Usage (14 instances)

| File | Line | Context | Severity |
|------|------|---------|----------|
| `frontend/src/api/auth.ts` | 12 | `resetPassword: (data: any)` | HIGH |
| `frontend/src/api/project.ts` | 13 | `http.get<any[]>` versions | HIGH |
| `frontend/src/components/ProjectVersionsModal.vue` | 80 | `ref<any[]>` | HIGH |
| `frontend/src/components/ProjectVersionsModal.vue` | 115 | `download(v: any)` | MEDIUM |
| `frontend/src/components/ProjectUpdateModal.vue` | 116 | `data.find((v: any) => ...)` | MEDIUM |
| `frontend/src/components/ProjectCard.vue` | 207,215 | `vClickOutside` directive | LOW |
| `frontend/src/pages/LoginPage.vue` | 60 | `catch (e: any)` | LOW |
| `frontend/src/pages/UploadPage.vue` | 171 | `catch (e: any)` | LOW |
| `frontend/src/pages/RegisterPage.vue` | 65,78,91 | `timer: any`, catch | LOW |
| `frontend/src/pages/ForgotPasswordPage.vue` | 75,88,114 | `timer: any`, catch | LOW |

**Total `any` usages**: 14  
**Recommendation**: 定义 `ProjectVersion`, `ResetPasswordPayload`, `ApiError`；axios 拦截器应 reject 结构化错误而非 string

### Type Assertions

| File | Line | Assertion | Issue |
|------|------|-----------|-------|
| `frontend/src/pages/ViewPage.vue` | 63 | `route.params.slug as string` | 可接受 |
| `frontend/src/pages/UploadPage.vue` | 23,148 | `as HTMLInputElement` | 正常 DOM 断言 |

### @ts-ignore Comments

**None found**

### Missing Types

- 无 `ProjectVersion` / `ShareMeta` / `AuthResponse` 前端类型（后端 DTO 未同步）
- `http.ts` 响应拦截器返回 `string` 而非 `Error` 对象，导致 catch 块类型混乱

---

## Code Smells

### Long Functions (>50 lines)

| File | Function | Lines | Issue |
|------|----------|-------|-------|
| `backend/.../ShareController.java` | `serveFile()` | ~95 | HTML/JS 注入 + 文件服务 + 权限校验混在一起 |
| `backend/.../ProjectService.java` | `upload()` | ~60 | 新建/更新/替换三条路径在一个方法 |
| `frontend/src/components/ProjectCard.vue` | template+script | 219 | 可拆分 menu / stats / modals |

### Complex Conditionals

| File | Line | Issue |
|------|------|-------|
| `backend/.../ShareController.java` | 78-156 | 多层 if 嵌套：公开/私密 × 文件类型 × 注入逻辑 |
| `frontend/src/pages/ViewPage.vue` | 82-93 | iframe viewToken 注入 try/catch cross-origin |

### Magic Numbers

| File | Line | Magic Value | Should Be |
|------|------|-------------|-----------|
| `frontend/src/components/ProjectCard.vue` | 157-159 | `60000`, `3600000`, `86400000` | `MS_PER_MINUTE` 等常量 |
| `frontend/src/pages/RegisterPage.vue` | 73 | `60` | `VERIFICATION_CODE_COOLDOWN_SEC` |
| `docker-compose.yml` | 26-27 | `604800`, `7200` | 已有 env 命名，可文档化 |

### Error Handling Smells

| Pattern | Files | Issue |
|---------|-------|-------|
| `alert()` | `ProjectSettingsModal`, `ProjectMoveModal`, `ProjectUpdateModal` | 阻塞式原生弹窗 |
| `confirm()` | `ProjectCard`, `GroupSidebar` | 无自定义 UX |
| `console.error(e)` | `GroupSidebar` | 错误吞没，用户无反馈 |
| `throw new RuntimeException(...)` | 全部 Service | 无错误码分类 |

### Commented-Out Code

**None found** — 代码库较干净

### Security Smells

| Item | Location | Risk |
|------|----------|------|
| 默认用户自动创建 | `DefaultUserInitializer.java` | 生产环境需禁用 `APP_DEFAULT_USER_ENABLED` |
| 私密项目 HTML 仅校验 .html | `ShareController.java:79-82` | JS/CSS 资源可能绕过 viewToken（部分已通过 axplayer.js 注入缓解） |
| CORS 硬编码 localhost | `SecurityConfig.java:51` | 部署需扩展 allowedOrigins |

---

## Statistics

**Dead Code**:
- Files: 0
- Exports/Symbols: 3
- Lines: ~15 (estimated)

**Duplication**:
- Groups: 8
- Files affected: 14
- Duplicated lines: ~120–180 (estimated)

**Architectural Issues**:
- God objects: 2
- Circular dependencies: 0
- Layer violations: 3

**Type Issues**:
- `any` usage: 14
- Type assertions: 2 (acceptable)
- @ts-ignore: 0

**Code Smells**:
- Long functions: 3
- Complex conditionals: 2
- Magic numbers: 3 groups

---

## Impact Assessment

### Code Cleanup Potential
- **Dead code removal**: ~15 lines
- **Duplication consolidation**: ~120–180 lines（主要在前端）
- **Total reduction**: ~135–195 lines（约 3–5% 有效代码）

### Maintainability Improvement
- 拆分 `ShareController` 可显著降低 Axure 适配变更的风险
- 统一前后端类型定义（DTO 对齐）可减少接口联调成本
- 提取 composable/utility 后，前端改动范围更可控

### 当前项目风险点

1. **`ShareController` 静态文件 + Axure 注入** — 最复杂后端逻辑，任何 Axure 版本差异都可能需要改此处
2. **`ViewPage` iframe + viewToken** — 跨域与 iframe 内跳转依赖前后端协同注入，调试成本高
3. **大文件上传** — 单文件上限 200MB，需确保 Nginx / Spring 上传配置一致
4. **认证存储** — JWT 在 localStorage，需关注 XSS 防护
5. **`groupApi.sort`** — 后端 `PUT /api/groups/sort` 已实现，前端 UI 未接入，属于半成品能力

### 技术栈与部署

| 层 | 技术 |
|----|------|
| 前端 | Vue 3, Vite 5, TypeScript, Pinia, Vue Router, Tailwind, Axios |
| 后端 | Java 17, Spring Boot 3.2, Spring Security, MyBatis-Plus, JWT |
| 数据库 | MySQL 8（users, project_groups, projects, project_versions） |
| 部署 | Docker Compose（mysql + backend + frontend/nginx） |
| 开发代理 | Vite dev server 将 `/api` 代理至 `localhost:8080` |

---

## 附录：文件清单

### Frontend (22 files)
- Entry: `main.ts`, `App.vue`
- Pages (6): Login, Register, ForgotPassword, Dashboard, Upload, View
- Components (6): ProjectCard, GroupSidebar, 4 Modals
- API (5): http, auth, project, group, share
- State/Router/Types: auth store, router, types/index.ts
- Config: vite.config.ts, tailwind.config.js, postcss.config.js

### Backend (30 files)
- Controllers (4): Auth, Project, ProjectGroup, Share
- Services (6): Auth, Project, ProjectGroup + 3 impl
- Entities (4): User, Project, ProjectGroup, ProjectVersion
- DTOs (4): AuthRequest/Response, ProjectDTO, ProjectGroupDTO
- Mappers (4), Utils (2), Security (1), Config (3), Test (1)
