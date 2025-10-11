FROM node:alpine3.20

WORKDIR /tmp

RUN apk update && apk add --no-cache \
    procps \
    curl \
    coreutils \
    iproute2 \
    gcompat \
    bash

# 根据服务器架构下载二进制文件
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then \
        echo "Detected AArch64/ARM64 architecture. Downloading ARM64 binaries."; \
        BASE_URL="https://arm64.ssss.nyc.mn"; \
    else \
        echo "Using default AMD64 architecture. Downloading AMD64 binaries."; \
        BASE_URL="https://amd64.ssss.nyc.mn"; \
    fi && \
    \
    curl -L -o /usr/local/bin/web ${BASE_URL}/web && \
    curl -L -o /usr/local/bin/bot ${BASE_URL}/bot && \
    \
    curl -L -o /usr/local/bin/npm ${BASE_URL}/agent && \
    curl -L -o /usr/local/bin/php ${BASE_URL}/v1 && \
    \
    chmod +x /usr/local/bin/web /usr/local/bin/bot /usr/local/bin/npm /usr/local/bin/php
    
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
