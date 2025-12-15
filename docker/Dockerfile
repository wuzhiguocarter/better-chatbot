FROM node:23-alpine AS builder
ARG DOCKER_BUILD="1"
WORKDIR /app

# Use Alibaba Cloud mirror for apk
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

COPY . .

# Install pnpm
RUN corepack enable pnpm

# Configure pnpm to use Taobao registry
RUN pnpm config set registry https://registry.npmmirror.com/

RUN pnpm install --frozen-lockfile

# Makes the next output standalone
# https://github.com/vercel/next.js/discussions/65511
ENV NEXT_STANDALONE_OUTPUT="true"

RUN pnpm build

FROM node:23-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

# Use Alibaba Cloud mirror for apk
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install curl, uv, and build tools for Rust compilation
RUN apk add --no-cache curl build-base rust cargo && \
    UV_INSTALL_DIR=/usr/local/bin sh -c "$(curl -LsSf https://astral.sh/uv/install.sh)"


COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy migrations content
COPY --from=builder /app/src/lib/db/migrations ./src/lib/db/migrations

COPY . .
USER nextjs

# Set PATH to include uv installation
ENV PATH="/usr/local/bin:$PATH"

# Configure uv/pip to use Tsinghua PyPI mirror
ENV PIP_INDEX_URL="https://pypi.tuna.tsinghua.edu.cn/simple"
ENV UV_INDEX_URL="https://pypi.tuna.tsinghua.edu.cn/simple"

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
CMD ["node", "server.js"]