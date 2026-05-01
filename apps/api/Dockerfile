FROM node:20-alpine AS base
RUN npm install -g pnpm@9

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile --ignore-scripts

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate
RUN pnpm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY package.json ./

RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node_modules/.bin/tsx prisma/seed.ts && node dist/server.js"]
