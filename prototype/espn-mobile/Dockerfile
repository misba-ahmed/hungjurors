FROM mcr.microsoft.com/playwright:v1.56.1-noble
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
USER pwuser
ENV NODE_ENV=production
CMD ["node","server.mjs"]
