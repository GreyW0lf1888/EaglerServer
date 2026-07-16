const WebSocket = require('ws');
const net = require('net');

const PORT = process.env.PORT || 10000;
const TARGET_IP = process.env.SERVER_ADDR;
const TARGET_PORT = parseInt(process.env.SERVER_PORT || "22104");
const SERVER_NAME = process.env.SERVERNAME || "Eaglercraft Server";
const MOTD_TEXT = process.env.MOTD || "Online and Ready!";

if (!TARGET_IP || !TARGET_PORT) {
    console.error("CRITICAL: SERVER_ADDR and SERVER_PORT must be defined!");
    process.exit(1);
}

const wss = new WebSocket.Server({ port: PORT });
console.log(`Eaglercraft Translation Proxy running on port ${PORT}`);

wss.on('connection', (ws) => {
    const tcpClient = new net.Socket();
    let handshakeCompleted = false;

    tcpClient.connect(TARGET_PORT, TARGET_IP, () => {
        console.log('Connected to Falix backend.');
    });

    ws.on('message', (message) => {
        const msgStr = message.toString();
        
        // Handle Eaglercraft Server List Ping
        if (msgStr.includes("Accept: Motd") || msgStr.trim() === "00") {
            const pingResponse = JSON.stringify({
                name: SERVER_NAME,
                motd: [MOTD_TEXT],
                online: 1,
                max: 20
            });
            if (ws.readyState === WebSocket.OPEN) ws.send(pingResponse);
            return;
        }

        // Forward game traffic downstream
        if (tcpClient.writable) {
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

