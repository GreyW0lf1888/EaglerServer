const WebSocket = require('ws');
const net = require('net');

const PORT = process.env.PORT || 10000;
const TARGET_IP = process.env.SERVER_ADDR;
const TARGET_PORT = process.env.SERVER_PORT;
const SERVER_NAME = process.env.SERVERNAME || "Eaglercraft Server";
const MOTD_TEXT = process.env.MOTD || "Welcome to our server!";

if (!TARGET_IP || !TARGET_PORT) {
    console.error("CRITICAL ERROR: SERVER_ADDR and SERVER_PORT environment variables must be defined on Render!");
    process.exit(1);
}

const wss = new WebSocket.Server({ port: PORT });
console.log(`Eaglercraft Custom Version Proxy Active on port ${PORT}`);
console.log(`Routing to FalixNodes backend at: ${TARGET_IP}:${TARGET_PORT}`);

wss.on('connection', (ws) => {
    const tcpClient = new net.Socket();
    let isConnected = false;

    tcpClient.connect(TARGET_PORT, TARGET_IP, () => {
        isConnected = true;
    });

    ws.on('message', (message) => {
        const msgStr = message.toString();
        
        // INTERCEPT SEVER PING: Forces Eaglercraft to see a valid 1.12.2/1.8 response
        if (msgStr.includes("Accept: Motd") || msgStr.trim() === "00") {
            const fakeMotdResponse = JSON.stringify({
                name: SERVER_NAME,
                motd: [MOTD_TEXT],
                online: 1,
                max: 100,
                // These lines spoof the exact version IDs Eaglercraft looks for
                version: "1.12.2", 
                protocol: 340,     // 340 is the official Minecraft network ID for 1.12.2
                brand: "EaglercraftX"
            });
            
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(fakeMotdResponse);
            }
            return;
        }

        // Standard gameplay data stream
        if (isConnected && tcpClient.writable) {
            tcpClient.write(message);
        }
    });

    tcpClient.on('data', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });

    ws.on('close', () => tcpClient.end());
    tcpClient.on('close', () => ws.close());
    tcpClient.on('error', () => ws.close());
});
