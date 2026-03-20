FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .
RUN npx tsc

EXPOSE 4000

CMD ["node", "dist/index.js"]
