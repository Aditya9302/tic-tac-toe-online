const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://tic-tac-toe-online-orcin.vercel.app",
    ],
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://tic-tac-toe-online-orcin.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
});

let rooms = {};

const WINNING_COMBOS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board) {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;

    if (
      board[a] &&
      board[a] === board[b] &&
      board[b] === board[c]
    ) {
      return board[a];
    }
  }

  return null;
}

io.on("connection", (socket) => {
  console.log("✅ Connected:", socket.id);

  socket.on("join-room", (roomId) => {
    roomId = roomId.trim();

    console.log(
      `📥 Join request from ${socket.id} for room "${roomId}"`
    );

    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        board: Array(9).fill(""),
        turn: "X",
        gameOver: false,
      };

      console.log(`🆕 Room created: ${roomId}`);
    }

    const room = rooms[roomId];

    console.log("👥 Players before join:", room.players);

    const alreadyExists = room.players.find(
      (p) => p.id === socket.id
    );

    if (!alreadyExists) {
      if (room.players.length >= 2) {
        console.log(`❌ Room ${roomId} is full`);

        socket.emit("room-full");
        return;
      }

      const symbol = room.players.length === 0 ? "X" : "O";

      room.players.push({
        id: socket.id,
        symbol,
      });

      console.log(
        `🎮 Player ${socket.id} assigned symbol ${symbol}`
      );

      socket.emit("player-symbol", symbol);
    }

    console.log("👥 Players after join:", room.players);

    io.to(roomId).emit("room-update", room);

    console.log(`📤 room-update emitted to ${roomId}`);
  });

  socket.on("make-move", ({ roomId, index }) => {
    const room = rooms[roomId];

    if (!room) {
      console.log("❌ Room not found");
      return;
    }

    if (room.gameOver) {
      console.log("❌ Game already over");
      return;
    }

    const player = room.players.find(
      (p) => p.id === socket.id
    );

    if (!player) {
      console.log("❌ Player not found in room");
      return;
    }

    if (room.turn !== player.symbol) {
      console.log(
        `❌ Not ${player.symbol}'s turn. Current turn: ${room.turn}`
      );
      return;
    }

    if (room.board[index]) {
      console.log(`❌ Cell ${index} already occupied`);
      return;
    }

    room.board[index] = player.symbol;

    console.log(
      `✅ ${player.symbol} played at position ${index}`
    );

    const winner = checkWinner(room.board);

    if (winner) {
      room.gameOver = true;

      console.log(
        `🏆 Winner in room ${roomId}: ${winner}`
      );

      io.to(roomId).emit("game-over", {
        winner,
        board: room.board,
      });

      return;
    }

    const isDraw = room.board.every(
      (cell) => cell !== ""
    );

    if (isDraw) {
      room.gameOver = true;

      console.log(`🤝 Draw in room ${roomId}`);

      io.to(roomId).emit("game-over", {
        winner: "Draw",
        board: room.board,
      });

      return;
    }

    room.turn = room.turn === "X" ? "O" : "X";

    io.to(roomId).emit("room-update", room);

    console.log(
      `🔄 Turn changed to ${room.turn} in room ${roomId}`
    );
  });

  socket.on("reset-game", (roomId) => {
    if (!rooms[roomId]) return;

    rooms[roomId].board = Array(9).fill("");
    rooms[roomId].turn = "X";
    rooms[roomId].gameOver = false;

    console.log(`🔁 Game reset in room ${roomId}`);

    io.to(roomId).emit("room-update", rooms[roomId]);
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);

    for (const roomId in rooms) {
      const room = rooms[roomId];

      const before = room.players.length;

      room.players = room.players.filter(
        (player) => player.id !== socket.id
      );

      if (before !== room.players.length) {
        console.log(
          `🚪 Removed ${socket.id} from room ${roomId}`
        );

        io.to(roomId).emit("room-update", room);
      }

      if (room.players.length === 0) {
        delete rooms[roomId];

        console.log(
          `🗑️ Deleted empty room ${roomId}`
        );
      }
    }
  });
});

app.get("/", (req, res) => {
  res.send("Socket.IO Tic Tac Toe Server Running");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
