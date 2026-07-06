FROM node:22-alpine

RUN apk add --no-cache git && corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY server.js ./
COPY public ./public

RUN mkdir -p /data

EXPOSE 4000
CMD ["node", "server.js"]
