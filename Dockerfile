# ===== Stage 1: Build React/Vite =====
FROM node:22-alpine AS build

WORKDIR /app

ARG HTTP_PROXY
ARG HTTPS_PROXY
ENV http_proxy=$HTTP_PROXY
ENV https_proxy=$HTTPS_PROXY

COPY package*.json ./

# Increase npm fetch timeout & retries to prevent network timeout errors
RUN npm config set fetch-retry-maxtimeout 600000 \
 && npm config set fetch-retry-mintimeout 10000 \
 && npm config set fetch-retries 5 \
 && npm ci

COPY . .

RUN npm run build


# ===== Stage 2: Nginx =====
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]