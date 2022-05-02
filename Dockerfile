FROM node:16 as builder

ARG NPM_TOKEN

WORKDIR /build

COPY .npmrc .npmrc 
COPY package*.json ./
COPY nest-cli.json ./
RUN npm install
COPY apps ./apps
COPY tsconfig* ./
COPY configurations ./configurations
RUN npm run build
RUN rm -f .npmrc

FROM gcr.io/distroless/nodejs:16

WORKDIR /app

COPY --from=builder /build .
EXPOSE 3000

CMD ["./dist/apps/fleet-node-v1/main.js"]