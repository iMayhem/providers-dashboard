FROM node:22-alpine AS providers-builder
RUN apk add --no-cache git && corepack enable
WORKDIR /providers
RUN git clone https://github.com/iMayhem/providers.git . && git checkout 59b85b801c171733c573b8d8750b97485304e6f4
RUN pnpm install --no-frozen-lockfile 2>&1 | tail -3
RUN pnpm run build 2>&1 | tail -3

FROM node:22-alpine
RUN apk add --no-cache git && corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=providers-builder /providers/lib /app/node_modules/@movie-web/providers/lib
COPY --from=providers-builder /providers/package.json /app/node_modules/@movie-web/providers/package.json
COPY server.js ./
COPY public ./public
RUN mkdir -p /data
EXPOSE 4000
CMD ["node", "server.js"]
