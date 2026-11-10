# HookLab application image (API, worker, dispatcher share this build)
FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/dispatcher/package.json apps/dispatcher/
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/shared/package.json packages/shared/
COPY packages/queue/package.json packages/queue/
COPY examples/webhook-consumer/package.json examples/webhook-consumer/
COPY examples/event-producer/package.json examples/event-producer/

RUN npm ci

COPY prisma ./prisma
COPY apps ./apps
COPY packages ./packages

RUN npx prisma generate

ENV NODE_ENV=production
ENV WEBHOOK_ALLOW_LOCALHOST=0

# Default: API (override in compose)
CMD ["npx", "tsx", "apps/api/src/server.ts"]
