import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';
import { WebSocketServer } from 'ws';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost'; // Next.js app hostname
const nextJsPort = parseInt(process.env.PORT, 10) || 3000; // Next.js app port
const websocketPort = 4444; // Dedicated port for WebSocket server

// Create the Next.js app instance
const app = next({ dev, hostname, port: nextJsPort });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server for Next.js
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling Next.js request:', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
  .listen(nextJsPort, (err) => {
    if (err) throw err;
    console.log(`> Next.js Ready on http://${hostname}:${nextJsPort}`);
  });

  // Create a separate WebSocket server
  const wss = new WebSocketServer({ port: websocketPort });

  console.log(`> WebSocket Server Ready and listening on port ${websocketPort}`);

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`WebSocket: Client connected from ${clientIp}`);

    ws.on('message', (message) => {
      try {
        const messageString = message.toString(); // Convert Buffer to string
        console.log('WebSocket: Received raw message:', messageString);
        const data = JSON.parse(messageString);
        console.log('WebSocket: Received parsed data:', data);
        // TODO: Process the received data (e.g., update globe, store in DB, etc.)
        // For now, we are just logging it.
      } catch (e) {
        console.error('WebSocket: Failed to parse message or error in processing:', e);
        ws.send(JSON.stringify({ error: 'Invalid JSON received or processing error.' }));
      }
    });

    ws.on('close', () => {
      console.log(`WebSocket: Client ${clientIp} disconnected`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket: Error for client ${clientIp}:`, error);
    });

    ws.send(JSON.stringify({ message: 'WebSocket connection established with Next.js server.' }));
  });

  wss.on('error', (error) => {
    console.error('WebSocket Server general error:', error);
  });

}).catch(err => {
    console.error("Error during Next.js app preparation:", err);
    process.exit(1);
});
