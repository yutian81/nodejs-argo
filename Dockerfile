# 使用 node:20 基础镜像 (基于 Debian，更稳定，但体积更大)
FROM node:20

# 建立工作目录
WORKDIR /app

# 安装必要的系统依赖
# Debian/Ubuntu 使用 apt-get
# procps 包含 pkill
# curl, coreutils, iproute2, gcompat (对于静态编译的二进制文件兼容性更好)
RUN apt-get update && apt-get install -y --no-install-recommends \
    procps \
    curl \
    coreutils \
    iproute2 \
    gcompat \
    bash \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖和安装
COPY package*.json ./
RUN npm install --omit=dev

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 3000

# 运行主应用
CMD ["node", "index.js"]
