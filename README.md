<div align="center">

# nodejs-argo隧道代理

[![npm version](https://img.shields.io/npm/v/nodejs-argo.svg)](https://www.npmjs.com/package/nodejs-argo)
[![npm downloads](https://img.shields.io/npm/dm/nodejs-argo.svg)](https://www.npmjs.com/package/nodejs-argo)
[![License](https://img.shields.io/npm/l/nodejs-argo.svg)](https://github.com/eooce/nodejs-argo/blob/main/LICENSE)

nodejs-argo是一个强大的Argo隧道部署工具，专为PaaS平台和游戏玩具平台设计。它支持多种代理协议（VLESS、VMess、Trojan等），并集成了哪吒探针功能。

</div>

## 说明 （部署前请仔细阅读）

* 本项目是针对node环境的paas平台和游戏玩具而生，采用Argo隧道部署节点，集成哪吒探针v0或v1可选。
* node玩具平台只需上传index.js和package.json即可，paas平台需要docker部署的才上传Dockerfile。
* 不填写ARGO_DOMAIN和ARGO_AUTH两个变量即启用临时隧道，反之则使用固定隧道。
* 哪吒v0/v1可选,当哪吒端口为{443,8443,2096,2087,2083,2053}其中之一时，自动开启tls。

## 📋 环境变量

| 变量名 | 是否必须 | 默认值 | 说明 |
|--------|----------|--------|------|
| UPLOAD_URL | 否 | - | 订阅上传地址 |
| PROJECT_URL | 否 | https://www.google.com | 项目分配的域名 |
| AUTO_ACCESS | 否 | false | 是否开启自动访问保活 |
| PORT | 否 | 3000 | HTTP服务监听端口 |
| ARGO_PORT | 否 | 8001 | Argo隧道端口 |
| UUID | 否 | 89c13786-25aa-4520-b2e7-12cd60fb5202 | 用户UUID |
| NEZHA_SERVER | 否 | - | 哪吒面板域名 |
| NEZHA_PORT | 否 | - | 哪吒端口 |
| NEZHA_KEY | 否 | - | 哪吒密钥 |
| ARGO_DOMAIN | 否 | - | Argo固定隧道域名 |
| ARGO_AUTH | 否 | - | Argo固定隧道密钥 |
| CFIP | 否 | www.visa.com.tw | 节点优选域名或IP |
| CFPORT | 否 | 443 | 节点端口 |
| NAME | 否 | Vls | 节点名称前缀 |
| FILE_PATH | 否 | ./tmp | 运行目录 |
| SUB_PATH | 否 | sub | 订阅路径 |

## 🌐 订阅地址

- 标准端口：`https://your-domain.com/sub`
- 非标端口：`http://your-domain.com:port/sub`

---

## 🚀 进阶使用

### 安装

```bash
# 全局安装（推荐）
npm install -g nodejs-argo

# 或者使用yarn
yarn global add nodejs-argo

# 或者使用pnpm
pnpm add -g nodejs-argo
```

### 抱脸 dockerfile
```
FROM node:slim

# 设置环境变量（可在此处赋予默认值）
ENV UUID="default_uuid" \
    NEZHA_SERVER="default_server" \
    NEZHA_PORT="default_port" \
    NEZHA_KEY="default_key" \
    ARGO_DOMAIN="default_domain" \
    ARGO_AUTH="default_auth"

WORKDIR /app
COPY . .
EXPOSE 3000
RUN apt update -y && \
    chmod +x index.js && \
    npm install
CMD ["node", "index.js"]
```

### 基本使用

```bash
# 直接运行（使用默认配置）
nodejs-argo

# 使用npx运行
npx nodejs-argo

# 设置环境变量运行
 PORT=3000 npx nodejs-argo
```

### 环境变量配置

可使用 `.env` 文件来配置环境变量运行


或者直接在命令行中设置：

```bash
export UPLOAD_URL="https://your-merge-sub-domain.com"
export PROJECT_URL="https://your-project-domain.com"
export PORT=3000
export UUID="your-uuid-here"
export NEZHA_SERVER="nz.your-domain.com:8008"
export NEZHA_KEY="your-nezha-key"
```

## 📦 作为npm模块使用

```javascript
// CommonJS
const nodejsArgo = require('nodejs-argo');

// ES6 Modules
import nodejsArgo from 'nodejs-argo';

// 启动服务
nodejsArgo.start();
```

## 🔧 后台运行

### 使用screen（推荐）
```bash
# 创建screen会话
screen -S argo

# 运行应用
nodejs-argo

# 按 Ctrl+A 然后按 D 分离会话
# 重新连接：screen -r argo
```

### 使用tmux
```bash
# 创建tmux会话
tmux new-session -d -s argo

# 运行应用
tmux send-keys -t argo "nodejs-argo" Enter

# 分离会话：tmux detach -s argo
# 重新连接：tmux attach -t argo
```

### 使用PM2
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start nodejs-argo --name "argo-service"

# 管理应用
pm2 status
pm2 logs argo-service
pm2 restart argo-service
```

### 使用systemd（Linux系统服务）
```bash
# 创建服务文件
sudo nano /etc/systemd/system/nodejs-argo.service

```
[Unit]
Description=Node.js Argo Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/test
Environment=ARGO_PORT=8080
Environment=PORT=3000
ExecStart=/usr/bin/npx nodejs-argo
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

# 启动服务
sudo systemctl start nodejs-argo
sudo systemctl enable nodejs-argo
```

## 🔄 更新

```bash
# 更新全局安装的包
npm update -g nodejs-argo

# 或者重新安装
npm uninstall -g nodejs-argo
npm install -g nodejs-argo
```

## 📚 更多信息

- [GitHub仓库](https://github.com/eooce/nodejs-argo)
- [npm包页面](https://www.npmjs.com/package/nodejs-argo)
- [问题反馈](https://github.com/eooce/nodejs-argo/issues)

---

## 赞助
* 感谢[ZMTO](https://zmto.com/?affid=1548)提供赞助优质双isp vps。
  
# 免责声明
* 本程序仅供学习了解, 非盈利目的，请于下载后 24 小时内删除, 不得用作任何商业用途, 文字、数据及图片均有所属版权, 如转载须注明来源。
* 使用本程序必循遵守部署免责声明，使用本程序必循遵守部署服务器所在地、所在国家和用户所在国家的法律法规, 程序作者不对使用者任何不当行为负责。
