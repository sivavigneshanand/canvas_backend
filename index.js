const express = require("express");
const WebSocket = require("ws");
const http = require("http");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = [];
let drawingData = [];

wss.on("connection", (ws) => {
  clients.push(ws);
  console.log("New client connected.");

  // Send the current drawing state to the new client
  if (drawingData.length > 0) {
    ws.send(
      JSON.stringify({
        type: "initial_drawing",
        data: drawingData,
      })
    );
  }

  // Handle incoming messages (drawing data, reset request)
  ws.on("message", (data) => {
    const message = JSON.parse(data);
   
    if (message.type === "user_connected") {
      // Notify the other clients about the new user
      broadcast(
        JSON.stringify({
          type: "user_connected",
          message: message.message,
        }),
        ws
      );
    } else if (message.type === "drawing") {
      // Save the drawing event on the server
      drawingData.push(message.drawing); // Store the drawing data

      // Broadcast the drawing event to all other clients (except the sender)
      broadcast(JSON.stringify(message), ws);
    } else if (message.type === "reset") {
      drawingData = []; 
      broadcast(JSON.stringify({ type: "reset_canvas" }), ws);
    } else if (message.type === "user_disconnected") {
      broadcast(
        JSON.stringify({
          type: "user_disconnected",
          message: message.message,
        }),
        ws
      );
    }
  });

  // Handle client disconnection
  ws.on("close", () => {
    clients = clients.filter((client) => client !== ws);
    console.log("Client disconnected.");
  });
});

// Broadcast a message to all clients except the sender
const broadcast = (message, sender) => {
  clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

