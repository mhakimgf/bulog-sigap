import os from 'os';

function getLocalIpOrigins() {
  const ips = [];
  try {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (iface) {
        for (const alias of iface) {
          if (alias.family === 'IPv4' && !alias.internal) {
            ips.push(alias.address);
            ips.push(`${alias.address}:3000`);
          }
        }
      }
    }
  } catch (e) {
    // Ignore error if networkInterfaces is unavailable
  }
  return ips;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: [
    ...getLocalIpOrigins(),
    '192.168.*.*',
    '10.*.*.*',
    '172.16.*.*',
    '172.17.*.*',
    '172.18.*.*',
    '172.19.*.*',
    '172.20.*.*',
    '172.21.*.*',
    '172.22.*.*',
    '172.23.*.*',
    '172.24.*.*',
    '172.25.*.*',
    '172.26.*.*',
    '172.27.*.*',
    '172.28.*.*',
    '172.29.*.*',
    '172.30.*.*',
    '172.31.*.*',
    '*.local',
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
    '*.ngrok-free.app',
    '*.ngrok.app',
    '*.ngrok.io',
    '654c-2407-0-3f66-1f49-dd11-8ccc-cd0e-750a.ngrok-free.app',
  ],
};

export default nextConfig;
