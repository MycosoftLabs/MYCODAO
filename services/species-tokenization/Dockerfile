FROM node:24-bookworm-slim
WORKDIR /service
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
COPY scripts ./scripts
RUN mkdir -p /data && chown node:node /data /service
USER node
ENV TOKENIZATION_HOST=0.0.0.0 TOKENIZATION_DATABASE_PATH=/data/species.sqlite
EXPOSE 8095
CMD ["npm","start"]
