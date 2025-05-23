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
  const browserClients = new Set(); // To store connected browser clients

  console.log(`> WebSocket Server Ready and listening on port ${websocketPort}`);

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress; // This might be NGINX's IP if proxied
    const trueClientIp = req.headers['x-forwarded-for'] || clientIp; // Get true client IP if behind proxy
    console.log(`WebSocket: Client connected from ${trueClientIp}`);
    browserClients.add(ws); // Assume any connection could be a browser client initially

    ws.on('message', (message) => {
      // Assume messages are from the agent
      try {
        const messageString = message.toString();
        console.log(`WebSocket: Received raw message from agent (${trueClientIp}):`, messageString);
        const agentData = JSON.parse(messageString); // agentData is like {"ip1": "US", "ip2": "CA"}
        console.log(`WebSocket: Received parsed data from agent (${trueClientIp}):`, agentData);

        // Prepare data for broadcasting to browser clients
        // We'll send an array of { ip: "...", countryCode: "..." }
        const trafficDataForFrontend = Object.entries(agentData).map(([ip, countryCode]) => ({
          ip,
          countryCode
        }));

        if (trafficDataForFrontend.length > 0) {
          const broadcastMessage = JSON.stringify({ type: 'trafficUpdate', payload: trafficDataForFrontend });
          console.log('WebSocket: Broadcasting to browser clients:', broadcastMessage);
          browserClients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) { // Don't send back to the agent, only to other clients
              client.send(broadcastMessage);
            } else if (client === ws) {
              // This means the agent itself is in browserClients. This is okay if agent doesn't expect a reply here.
              // Or, we can refine client management if agent should never be in browserClients.
              // For now, this logic is fine as long as agent doesn't process this broadcast.
            }
          });
        }

      } catch (e) {
        console.error(`WebSocket: Failed to parse message from agent (${trueClientIp}) or error in processing:`, e);
        // Optionally send error back to agent if it's expecting a response or status
        // ws.send(JSON.stringify({ error: 'Invalid JSON received or processing error.' }));
      }
    });

    ws.on('close', () => {
      console.log(`WebSocket: Client ${trueClientIp} disconnected`);
      browserClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket: Error for client ${trueClientIp}:`, error);
      browserClients.delete(ws); // Remove on error as well
    });

    // Send a welcome message to the newly connected client (could be browser or agent)
    ws.send(JSON.stringify({ type: 'connection', message: 'WebSocket connection established.' }));
  });

  wss.on('error', (error) => {
    console.error('WebSocket Server general error:', error);
  });

}).catch(err => {
    console.error("Error during Next.js app preparation:", err);
    process.exit(1);
});
