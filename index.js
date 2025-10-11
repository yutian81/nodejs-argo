const express = require("express");
const app = express();
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const { execSync } = require('child_process');

// 环境变量配置 (保持不变)
const UPLOAD_URL = process.env.UPLOAD_URL || ''; 
const PROJECT_URL = process.env.PROJECT_URL || '';
const AUTO_ACCESS = process.env.AUTO_ACCESS === 'true';
const FILE_PATH = process.env.FILE_PATH || '/tmp'; 
const SUB_PATH = process.env.SUB_PATH || 'sub';
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const UUID = process.env.UUID || '9afd1229-b893-40c1-84dd-51e7ce204913';
const NEZHA_SERVER = process.env.NEZHA_SERVER || '';
const NEZHA_PORT = process.env.NEZHA_PORT || '';
const NEZHA_KEY = process.env.NEZHA_KEY || '';
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';
const ARGO_AUTH = process.env.ARGO_AUTH || '';
const ARGO_PORT = process.env.ARGO_PORT || 8001;
const CFIP = process.env.CFIP || 'cdns.doon.eu.org';
const CFPORT = process.env.CFPORT || 443;
const NAME = process.env.NAME || '';

// 定义路径 (基于 FILE_PATH 的路径)
const webPath = path.join(FILE_PATH, 'web');
const botPath = path.join(FILE_PATH, 'bot');
const npmPath = path.join(FILE_PATH, 'npm');
const phpPath = path.join(FILE_PATH, 'php');
const subPath = path.join(FILE_PATH, 'sub.txt');
const listPath = path.join(FILE_PATH, 'list.txt');
const bootLogPath = path.join(FILE_PATH, 'boot.log');
const configPath = path.join(FILE_PATH, 'config.json');
const configYamlPath = path.join(FILE_PATH, 'config.yaml');
const tunnelJsonPath = path.join(FILE_PATH, 'tunnel.json');
const tunnelYamlPath = path.join(FILE_PATH, 'tunnel.yml');

const WEB_EXECUTABLE = 'web';
const BOT_EXECUTABLE = 'bot';
const NPM_EXECUTABLE = 'npm';
const PHP_EXECUTABLE = 'php';

// 创建运行文件夹 (确保 /tmp 存在)
if (!fs.existsSync(FILE_PATH)) {
  fs.mkdirSync(FILE_PATH, { recursive: true });
  console.log(`${FILE_PATH} is created`);
} else {
  console.log(`${FILE_PATH} already exists`);
}

// 如果订阅器上存在历史运行节点则先删除
function deleteNodes() {
  try {
    if (!UPLOAD_URL) return;
    if (!fs.existsSync(subPath)) return;

    let fileContent;
    try {
      fileContent = fs.readFileSync(subPath, 'utf-8');
    } catch {
      return null;
    }

    const decoded = Buffer.from(fileContent, 'base64').toString('utf-8');
    const nodes = decoded.split('\n').filter(line =>
      /(vless|vmess|trojan|hysteria2|tuic):\/\//.test(line)
    );

    if (nodes.length === 0) return;

    return axios.post(`${UPLOAD_URL}/api/delete-nodes`,
      JSON.stringify({ nodes }),
      { headers: { 'Content-Type': 'application/json' } }
    ).catch((error) => {
      console.error(`Error deleting nodes: ${error.message}`);
      return null;
    });
  } catch (err) {
    console.error(`Unexpected error in deleteNodes: ${err.message}`);
    return null;
  }
}

// 清理历史文件
function cleanupOldFiles() {
  const pathsToDelete = [webPath, botPath, npmPath, phpPath, subPath, listPath, bootLogPath, configPath, configYamlPath, tunnelJsonPath, tunnelYamlPath];
  pathsToDelete.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        // console.log(`Cleaned up ${filePath}`);
      } catch (e) {
        // console.warn(`Could not delete ${filePath}: ${e.message}`);
      }
    }
  });
}

// 根路由
app.get("/", function(req, res) {
  res.send("Hello world!");
});

// 订阅路由
app.get(`/${SUB_PATH}`, (req, res) => {
    // 检查 sub.txt 文件是否存在
    if (!fs.existsSync(subPath)) {
        return res.status(404).send('Subscription file not generated yet. Please try again in a few seconds.');
    }
    
    let encodedContent;
    try {
        // 从文件中读取 base64 编码的节点内容
        encodedContent = fs.readFileSync(subPath, 'utf-8');
    } catch (e) {
        console.error(`Error reading ${subPath}: ${e.message}`);
        return res.status(500).send('Error reading subscription content.');
    }
    
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(encodedContent);
});

// 生成xr-ay配置文件
const config = {
  log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
  inbounds: [
    { port: ARGO_PORT, protocol: 'vless', settings: { clients: [{ id: UUID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: "/vless-argo", dest: 3002 }, { path: "/vmess-argo", dest: 3003 }, { path: "/trojan-argo", dest: 3004 }] }, streamSettings: { network: 'tcp' } },
    { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" }, streamSettings: { network: "tcp", security: "none" } },
    { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
    { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: UUID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
    { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: UUID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/trojan-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
  ],
  dns: { servers: ["https+local://8.8.8.8/dns-query"] },
  outbounds: [ { protocol: "freedom", tag: "direct" }, {protocol: "blackhole", tag: "block"} ]
};
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

// 下载并运行依赖文件
async function downloadFilesAndRun() {
  // 运行ne-zha
  if (NEZHA_SERVER && NEZHA_KEY) {
    if (!NEZHA_PORT) {
      // 哪吒v0 (php) 逻辑
      const port = NEZHA_SERVER.includes(':') ? NEZHA_SERVER.split(':').pop() : '';
      const tlsPorts = new Set(['443', '8443', '2096', '2087', '2083', '2053']);
      const nezhatls = tlsPorts.has(port) ? 'true' : 'false';
      const configYaml = `
client_secret: ${NEZHA_KEY}
debug: false
disable_auto_update: true
disable_command_execute: false
disable_force_update: true
disable_nat: false
disable_send_query: false
gpu: false
insecure_tls: true
ip_report_period: 1800
report_delay: 4
server: ${NEZHA_SERVER}
skip_connection_count: true
skip_procs_count: true
temperature: false
tls: ${nezhatls}
use_gitee_to_upgrade: false
use_ipv6_country_code: false
uuid: ${UUID}`;

      fs.writeFileSync(configYamlPath, configYaml);

      const command = `nohup ${phpPath} -c "${configYamlPath}" >/dev/null 2>&1 &`;
      try {
        await exec(command);
        console.log('php is running');
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } catch (error) {
        console.error(`php running error: ${error.message}`);
      }
    } else {
      // 哪吒v1 (npm) 逻辑
      let NEZHA_TLS = '';
      const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
      if (tlsPorts.includes(NEZHA_PORT.toString())) {
        NEZHA_TLS = '--tls';
      }
      const command = `nohup ${npmPath} -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} --disable-auto-update --report-delay 4 --skip-conn --skip-procs >/dev/null 2>&1 &`;
      try {
        await exec(command);
        console.log('npm is running');
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } catch (error) {
        console.error(`npm running error: ${error.message}`);
      }
    }
  } else {
    console.log('NEZHA variable is empty, skip running');
  }

  // 运行xr-ay (web)
  const command1 = `nohup ${webPath} -c ${configPath} >/dev/null 2>&1 &`;
  try {
    await exec(command1);
    console.log('web is running');
    await new Promise((resolve) => setTimeout(resolve, 10000));
  } catch (error) {
    console.error(`web running error: ${error.message}`);
  }

  // 运行cloud-fared (bot)
  if (fs.existsSync(botPath)) {
    let args;

    // 先运行 argoType 以确保固定隧道的配置文件存在
    argoType();

    if (ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) { // token
      args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}`;
    } else if (ARGO_AUTH.includes('TunnelSecret') && fs.existsSync(tunnelYamlPath)) { // json
      args = `tunnel --edge-ip-version auto --config ${tunnelYamlPath} run`;
    } else { // 临时隧道
      args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${bootLogPath} --loglevel info --url http://localhost:${ARGO_PORT}`;
    }

    try {
      await exec(`nohup ${botPath} ${args} >/dev/null 2>&1 &`);
      console.log('bot is running');
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      console.error(`Error executing bot command: ${error.message}`);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

// 获取固定隧道json
function argoType() {
  if (!ARGO_AUTH || !ARGO_DOMAIN) {
    return;
  }

  if (ARGO_AUTH.includes('TunnelSecret')) {
    try {
      // 写入 json 文件
      fs.writeFileSync(tunnelJsonPath, ARGO_AUTH);
      // 从 json 中提取 tunnel ID
      const authJson = JSON.parse(ARGO_AUTH);
      const tunnelId = authJson.TunnelID;

      if (!tunnelId) {
          console.error("Failed to extract tunnel ID from ARGO_AUTH JSON.");
          return;
      }

      const tunnelYaml = `
tunnel: ${tunnelId}
credentials-file: ${tunnelJsonPath}
protocol: http2

ingress:
  - hostname: ${ARGO_DOMAIN}
    service: http://localhost:${ARGO_PORT}
    originRequest:
      noTLSVerify: true
  - service: http_status:404
`;
      fs.writeFileSync(tunnelYamlPath, tunnelYaml);
      console.log("Fixed Argo tunnel config written.");
    } catch (e) {
      console.error(`Error processing ARGO_AUTH JSON/YAML: ${e.message}`);
    }
  } else {
    // console.log("ARGO_AUTH is a token, not JSON. Using token mode.");
  }
}

// 获取临时隧道domain
async function extractDomains() {
  let argoDomain;

  if (ARGO_AUTH && ARGO_DOMAIN) {
    argoDomain = ARGO_DOMAIN;
    console.log('ARGO_DOMAIN (fixed):', argoDomain);
    await generateLinks(argoDomain);
  } else {
    try {
      // 确保文件存在且不为空
      if (!fs.existsSync(bootLogPath) || fs.statSync(bootLogPath).size === 0) {
        throw new Error('boot.log is empty or missing.');
      }
      const fileContent = fs.readFileSync(bootLogPath, 'utf-8');
      const lines = fileContent.split('\n');
      let argoDomains = [];
      lines.forEach((line) => {
        const domainMatch = line.match(/https?:\/\/([^ ]*trycloudflare\.com)\/?/);
        if (domainMatch) {
          argoDomains.push(domainMatch[1]);
        }
      });
      // 只取最后一个（最新的）
      argoDomain = argoDomains.pop();

      if (argoDomain) {
        console.log('ArgoDomain (temporary):', argoDomain);
        await generateLinks(argoDomain);
      } else {
        console.log('ArgoDomain not found, attempting to re-run bot to obtain ArgoDomain');
        // 删除 boot.log 文件
        try { fs.unlinkSync(bootLogPath); } catch (e) { /* ignore */ }

        // 尝试杀死 bot 进程
        async function killBotProcess() {
          try {
            await exec('pkill -f "[b]ot" > /dev/null 2>&1');
            // console.log("Existing bot process killed.");
          } catch (error) {
             // 忽略错误
          }
        }
        await killBotProcess();
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // 重新运行 bot 临时隧道
        const args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${bootLogPath} --loglevel info --url http://localhost:${ARGO_PORT}`;
        try {
          await exec(`nohup ${botPath} ${args} >/dev/null 2>&1 &`);
          console.log('bot is re-running.');
          await new Promise((resolve) => setTimeout(resolve, 5000)); // 延长等待时间
          await extractDomains(); // 重新提取域名
        } catch (error) {
          console.error(`Error re-executing bot command: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error reading boot.log/Domain extraction:', error.message);
    }
  }

  // 生成 list 和 sub 信息
  async function generateLinks(argoDomain) {
    let ISP = 'unknown';
    try {
      // 使用 try-catch 避免因 curl 失败而阻塞
      const metaInfo = execSync(
        'curl -sm 5 https://speed.cloudflare.com/meta | awk -F\\" \'{print $26"-"$18}\' | sed -e \'s/ /_/g\'',
        { encoding: 'utf-8' }
      );
      ISP = metaInfo.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'unknown'; // 清理 ISP 字符串
    } catch (e) {
      console.warn(`curl command failed: ${e.message}`);
    }

    const nodeName = NAME ? `${NAME}-${ISP}` : ISP;

    return new Promise((resolve) => {      
        const VMESS = { v: '2', ps: `${nodeName}`, add: CFIP, port: CFPORT, id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: argoDomain, path: '/vmess-argo?ed=2560', tls: 'tls', sni: argoDomain, alpn: '', fp: 'chrome'};
        const subTxt = `
vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${argoDomain}&fp=chrome&type=ws&host=${argoDomain}&path=%2Fvless-argo%3Fed%3D2560#${nodeName}

vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}

trojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${argoDomain}&fp=chrome&type=ws&host=${argoDomain}&path=%2Ftrojan-argo%3Fed%3D2560#${nodeName}
`;
        const encodedContent = Buffer.from(subTxt.trim()).toString('base64');
        console.log(encodedContent);
        
        fs.writeFileSync(subPath, encodedContent);
        console.log(`${subPath} saved successfully`);

        // 写入 list.txt
        fs.writeFileSync(listPath, subTxt.trim());
        console.log(`${listPath} saved successfully`);

        // 上传节点或订阅
        uplodNodes();
        resolve(subTxt);
    });
  }
}

// 自动上传节点或订阅
async function uplodNodes() {
  if (UPLOAD_URL && PROJECT_URL) {
    const subscriptionUrl = `${PROJECT_URL}/${SUB_PATH}`;
    const jsonData = { subscription: [subscriptionUrl] };
    try {
        const response = await axios.post(`${UPLOAD_URL}/api/add-subscriptions`, jsonData, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 200) {
            console.log('Subscription uploaded successfully');
        } else {
          return null;
        }
    } catch (error) {
        if (error.response && error.response.status !== 400) { // 忽略 400 订阅已存在
            console.error(`Error uploading subscription: ${error.message}`);
        }
        return null;
    }
  } else if (UPLOAD_URL) {
      if (!fs.existsSync(listPath)) return;
      const content = fs.readFileSync(listPath, 'utf-8');
      const nodes = content.split('\n').filter(line => /(vless|vmess|trojan|hysteria2|tuic):\/\//.test(line));

      if (nodes.length === 0) return;

      const jsonData = JSON.stringify({ nodes });

      try {
          const response = await axios.post(`${UPLOAD_URL}/api/add-nodes`, jsonData, {
              headers: { 'Content-Type': 'application/json' }
          });
          if (response.status === 200) {
            console.log('Nodes uploaded successfully');
          } else {
              return null;
          }
      } catch (error) {
          // console.error(`Error uploading nodes: ${error.message}`);
          return null;
      }
  } else {
      return;
  }
}

// 90s后删除相关文件
function cleanFiles() {
  setTimeout(() => {
    // 只删除临时运行文件，保留 sub/list 文件供下次启动清理
    const filesToDelete = [configPath, webPath, botPath, configYamlPath, tunnelJsonPath, tunnelYamlPath];

    if (NEZHA_PORT) {
      filesToDelete.push(npmPath);
    } else if (NEZHA_SERVER && NEZHA_KEY) {
      filesToDelete.push(phpPath);
    }
    
    // 清理 boot.log
    filesToDelete.push(bootLogPath);

    // 使用 exec 来批量删除
    exec(`rm -rf ${filesToDelete.join(' ')} >/dev/null 2>&1`, (error) => {
      console.log('App is running and initial cleanup done.');
      console.log('Thank you for using this script, enjoy!');
    });
  }, 90000); // 90s
}

// 自动访问项目URL (保活)
async function AddVisitTask() {
  if (!AUTO_ACCESS || !PROJECT_URL) {
    console.log("Skipping adding automatic access task");
    return;
  }

  try {
    const response = await axios.post('https://oooo.serv00.net/add-url', {
      url: PROJECT_URL
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`automatic access task added successfully`);
  } catch (error) {
    console.error(`Add automatic access task failed: ${error.message}`);
  }
}

// 主运行逻辑
async function startserver() {
  console.log("Starting server setup...");
  deleteNodes();
  cleanupOldFiles();
  await downloadFilesAndRun(); 
  await extractDomains();
  AddVisitTask();
  cleanFiles(); 
  console.log("Server setup complete.");
}

app.listen(PORT, () => {
    console.log(`http server is running on port:${PORT}! (Immediate listen)`);
    startserver();
});
