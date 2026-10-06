FROM node:22-slim AS build
WORKDIR /app
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
ARG VITE_API_BASE_URL
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
# The API origin is the only other origin the app talks to (XHR, barcode images, uploaded photos).
ENV API_ORIGIN=${VITE_API_BASE_URL}
# Only API_ORIGIN is substituted; nginx's own $uri variables stay untouched.
ENV NGINX_ENVSUBST_FILTER=API_ORIGIN
EXPOSE 80
