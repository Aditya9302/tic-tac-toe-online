import { useEffect, useState } from "react";
import { socket } from "./socket";
import "./App.css";

function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);

  const [symbol, setSymbol] = useState("");
  const [room, setRoom] = useState(null);
  const [winner, setWinner] = useState("");

  const joinRoom = () => {
    if (!roomId) return;
    socket.emit("join-room", roomId);
    setJoined(true);
  };

  useEffect(() => {
    socket.on("player-symbol", (sym) => {
      console.log("MY SYMBOL:", sym);
      setSymbol(sym);
    });

    socket.on("room-update", (data) => {
      setRoom(data);

      if (!data.gameOver) {
        setWinner("");
      }
    });

    socket.on("game-over", (data) => {
      setWinner(data.winner);

      setRoom((prev) => ({
        ...(prev || {}),
        board: data.board,
        gameOver: true,
      }));
    });

    return () => {
      socket.off();
    };
  }, []);

  const handleClick = (index) => {
    if (!room || room.gameOver) return;

    socket.emit("make-move", {
      roomId,
      index,
    });
  };

  const resetGame = () => {
    setWinner("");
    socket.emit("reset-game", roomId);
  };

  return (
    <div className="container">
      <h1>Tic Tac Toe Online</h1>

      {!joined ? (
        <>
          <input
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={joinRoom}>Join</button>
        </>
      ) : (
        <>
          <h3>You are: {symbol || "Waiting..."}</h3>
          <h3>Turn: {room?.turn || "-"}</h3>

          {winner && (
            <h2 style={{ color: "green" }}>
              {winner === "Draw"
                ? "It's a draw"
                : `Winner: ${winner}`}    {/* `Winner: ${winner}` */}
            </h2>
          )}

          <div className="board">
            {room && room.board ? (
              room.board.map((cell, i) => (
                <button key={i} onClick={() => handleClick(i)}>
                  {cell}
                </button>
              ))
            ) : (
              <p>Waiting for opponent...</p>
            )}
          </div>

          {room?.gameOver && (
            <button onClick={resetGame}>Restart Game</button>
          )}
        </>
      )}
    </div>
  );
}

export default App;
