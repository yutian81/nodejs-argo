import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import { spawn } from "child_process";

const app = express();

// ==== 基础环境变量 ====
const FILE_PATH = process.env.FILE_PATH || "/tmp";
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
const SUB_PATH = process.env.SUB_PATH || "sub";
const UPLOAD_URL = process.env.UPLOAD_URL || "";
const PROJECT_URL = process.env.PROJECT_URL || "";
const AUTO_ACCESS = process.env.AUTO_ACCESS === "true";
const UUID = process.env.UUID || "9afd1229-b893-40c1-84dd-51e7ce204913";
const CFIP = process.env.CFIP || "cdns.doon.eu.org";
const CFPORT = process.env.CFPORT || 443;
const NAME = process.env.NAME || "";
const ARGO_AUTH = process.env.ARGO_AUTH || "";
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || "";
const ARGO_PORT = process.env.ARGO_PORT || 8001;
const NEZHA_SERVER = process.env.NEZHA_SERVER || "";
const NEZHA_KEY = process.env.NEZHA_KEY || "";
const NEZHA_PORT = process.env.NEZHA_PORT || "";

if (!fs.existsSync(FILE_PATH)) fs.mkdirSync(FILE_PATH, { recursive: true });

// ==== 输出基础状态 ====
app.get("/", (_, res) => res.send("✅ Leapcell NodeJS-Argo 服务已启动！"));

// ==== /sub 路由占位 ====
let currentSub = "等待生成订阅中...";
app.get(`/${SUB_PATH}`, (_, res) => res.type("text").send(Buffer.from(currentSub).toString("base64")));

// ==== 下载二进制文件 ====
async function downloadBinary(url, filename) {
  const full = path.join(FILE_PATH, filename);
  const writer = fs.createWriteStream(full);
  const response = await axios({ url, method: "GET", responseType: "stream" });
  response.data.pipe(writer);
  await new Promise((r, j) => {
    writer.on("finish", r);
    writer.on("error", j);
  });
  fs.chmodSync(full, 0o755);
  return full;
}

// ==== 获取系统架构 ====
function getArch() {
  return os.arch().includes("arm") ? "arm64" : "amd64";
}

// ==== 启动主逻辑 ====
async function start() {
  const arch = getArch();
  const webUrl = `https://${arch}.ssss.nyc.mn/web`;
  const botUrl = `https://${arch}.ssss.nyc.mn/bot`;
  const webPath = await downloadBinary(webUrl, "web");
  const botPath = await downloadBinary(botUrl, "bot");

  // === 写入xray配置 ===
  const config = {
    log: { loglevel: "none" },
    inbounds: [
      {
        port: ARGO_PORT,
        protocol: "vless",
        settings: { clients: [{ id: UUID, flow: "xtls-rprx-vision" }], decryption: "none" },
        streamSettings: { network: "tcp" }
      }
    ],
    outbounds: [{ protocol: "freedom" }]
  };
  fs.writeFileSync(path.join(FILE_PATH, "config.json"), JSON.stringify(config, null, 2));

  // === 启动 xray ===
  const xray = spawn(webPath, ["-c", path.join(FILE_PATH, "config.json")]);
  xray.stdout.on("data", d => console.log("[web]", d.toString()));
  xray.stderr.on("data", d => console.error("[web-err]", d.toString()));

  // === 启动 Argo Tunnel ===
  let args;
  if (ARGO_AUTH && ARGO_DOMAIN) {
    if (ARGO_AUTH.includes("TunnelSecret")) {
      fs.writeFileSync(path.join(FILE_PATH, "tunnel.json"), ARGO_AUTH);
      fs.writeFileSync(
        path.join(FILE_PATH, "tunnel.yml"),
        `tunnel: ${ARGO_AUTH.split('"')[11]}
credentials-file: ${FILE_PATH}/tunnel.json
ingress:
  - hostname: ${ARGO_DOMAIN}
    service: http://localhost:${ARGO_PORT}
  - service: http_status:404`
      );
      args = ["tunnel", "--config", `${FILE_PATH}/tunnel.yml`, "run"];
    } else {
      args = ["tunnel", "--no-autoupdate", "run", "--token", ARGO_AUTH];
    }
  } else {
    args = ["tunnel", "--no-autoupdate", "--url", `http://localhost:${ARGO_PORT}`];
  }

  const argo = spawn(botPath, args);
  let argoDomain = ARGO_DOMAIN;
  argo.stdout.on("data", d => {
    const str = d.toString();
    console.log("[argo]", str);
    const match = str.match(/https?:\/\/([^ ]*trycloudflare\.com)/);
    if (match && !argoDomain) {
      argoDomain = match[1];
      generateSub(argoDomain);
    }
  });
  argo.stderr.on("data", d => console.error("[argo-err]", d.toString()));
}

// ==== 生成订阅 ====
async function generateSub(domain) {
  const meta = execSyncSafe(`curl -sm 5 https://speed.cloudflare.com/meta | awk -F\\" '{print $26"-"$18}' | sed 's/ /_/g'`) || "Unknown";
  const nodeName = NAME ? `${NAME}-${meta}` : meta;

  const vmess = {
    v: "2", ps: nodeName, add: CFIP, port: CFPORT, id: UUID, aid: "0",
    scy: "none", net: "ws", type: "none", host: domain,
    path: "/vmess-argo?ed=2560", tls: "tls", sni: domain, fp: "chrome"
  };

  const subText = `
vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${domain}&fp=chrome&type=ws&host=${domain}&path=%2Fvless-argo%3Fed%3D2560#${nodeName}
vmess://${Buffer.from(JSON.stringify(vmess)).toString("base64")}
trojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${domain}&fp=chrome&type=ws&host=${domain}&path=%2Ftrojan-argo%3Fed%3D2560#${nodeName}
`;

  currentSub = subText;
  console.log("✅ 订阅已生成，访问路径：/" + SUB_PATH);

  if (UPLOAD_URL && PROJECT_URL) {
    try {
      await axios.post(`${UPLOAD_URL}/api/add-subscriptions`, {
        subscription: [`${PROJECT_URL}/${SUB_PATH}`]
      });
      console.log("✅ 已上传订阅链接");
    } catch (err) {
      console.error("上传订阅失败", err.message);
    }
  }
}

// ==== 工具函数 ====
function execSyncSafe(cmd) {
  try {
    return require("child_process").execSync(cmd, { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

// ==== 启动 ====
start();
app.listen(PORT, () => console.log("Server running on port", PORT));
