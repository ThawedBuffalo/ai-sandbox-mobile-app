FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json ./
COPY ui/package.json ./ui/package.json
COPY server/package.json ./server/package.json
RUN npm install

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV STATIC_DIR=/app/ui/dist

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/ui/dist ./ui/dist
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
