FROM node:22-alpine
WORKDIR /app
COPY server/package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY server/engine.cjs server/server.cjs ./
ENV NODE_ENV=production
EXPOSE 10000
CMD ["node", "server.cjs"]
