global.broadcast = (data) => {
  console.log("Broadcasting", data, global.sseClients);
  if (global.sseClients) {
    const msg = JSON.stringify(data);
    global.sseClients.forEach(client => {
      client.write(`data: ${msg}\n\n`);
    });
  }
}

export default {
  "GET /sse": (req, res, data) => {
    console.log("SSE Client Connected");
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Store the response object to send updates later
    if (!global.sseClients) global.sseClients = [];
    global.sseClients.push(res);

    // Send initial connection message
    res.write("data: { \"status\": \"connected\" }\n\n");

    // Remove client on close
    req.on('close', () => {
      global.sseClients = global.sseClients.filter(client => client !== res);
    });

    return "SSE"; // Special return value to tell the server not to close the connection automatically
  }
}