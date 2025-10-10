FROM node:20

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    procps \
    curl \
    coreutils \
    iproute2 \
    gcompat \
    bash \
    && rm -rf /var/lib/apt/lists/*

# 根据架构下载，这里使用 RUN 命令自动判断架构并下载
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "arm64" ]; then \
        echo "Detected ARM64 architecture. Downloading ARM64 binaries."; \
        BASE_URL="https://arm64.ssss.nyc.mn"; \
    else \
        echo "Using default AMD64 architecture. Downloading AMD64 binaries."; \
        BASE_URL="https://amd64.ssss.nyc.mn"; \
    fi && \
    \
    # 1. 下载 Xray (web)
    curl -L -o /usr/local/bin/web ${BASE_URL}/web && \
    # 2. 下载 Cloudflare Tunnel (bot)
    curl -L -o /usr/local/bin/bot ${BASE_URL}/bot && \
    \
    # 3. 下载 Nezha Agent v1 (npm)
    curl -L -o /usr/local/bin/npm ${BASE_URL}/agent && \
    # 4. 下载 Nezha Agent v0 (php)
    curl -L -o /usr/local/bin/php ${BASE_URL}/v1 && \
    \
    # 授权所有二进制文件
    chmod +x /usr/local/bin/web /usr/local/bin/bot /usr/local/bin/npm /usr/local/bin/php
    

# 复制依赖和安装
COPY package*.json ./
RUN npm install --omit=dev

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 3000

# 运行主应用
CMD ["node", "index.js"]
