# ----------------------------------------
# 1) Base Image
# ----------------------------------------
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ----------------------------------------
# 2) Dependencies (deps)
# ----------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# ----------------------------------------
# 3) Builder
# ----------------------------------------
FROM base AS builder
WORKDIR /app
# Install pnpm so the build command is available
RUN npm install -g pnpm
# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
# Copy source code
COPY . .
# Build the Next.js app
RUN pnpm build

# ----------------------------------------
# 4) Production Runner
# ----------------------------------------
    FROM base AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
    # Install pnpm in runner stage (if needed by any command)
    RUN npm install -g pnpm
    # Copy package manifest and installed node_modules from builder stage
    COPY --from=builder /app/package.json ./
    COPY --from=builder /app/node_modules ./node_modules
    # Copy build output and public assets
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/.next ./.next
    USER nextjs
    EXPOSE 3000
    ENV PORT=3000
    ENV HOSTNAME=0.0.0.0
    CMD ["pnpm", "start"]
    