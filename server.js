/**
 * server.js
 * - Serves the static mini-app
 * - Runs Socket.IO for real-time gameplay
 * - Uses chess.js for move legality, check/checkmate detection
 *
 * Run: PUBLIC_URL must be set for the bot to use the right webapp URL.
 *
 * Usage:
 *   npm install
 *   PUBLIC_URL=https://your-public-url npm start
 *
 * Strong opinion: keep pairing logic simple initially (queue). Add persistence/rooms later.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public/ for the web app
app.use(express.static('public'));

// Basic health check
app.get('/healthz', (req, res) => res.send('ok'));

// In-memory matchmaking and games storage
const waitingQueue = []; // array of socket ids waiting
const games = new Map(); // roomId -> { chess: Chess, players: { white: socketId, black: socketId }, turn, history }

// Utility to create a deterministic room id
function makeRoomId(a, b) {
    // sort to make deterministic
    return [a, b].sort().join('#');
}

// When a client connects
io.on('connection', (socket) => {
    console.log(`socket connected: ${socket.id}`);

    // Place player in queue and try to match
    waitingQueue.push(socket.id);
    tryCreateGame();

    // Clean up on disconnect
    socket.on('disconnect', () => {
        console.log(`socket disconnected: ${socket.id}`);
        // Remove from waiting queue if present
        const idx = waitingQueue.indexOf(socket.id);
        if (idx !== -1) waitingQueue.splice(idx, 1);

        // If player was in a running game, notify opponent and delete game
        // Find game that includes this socket
        for (const [roomId, game] of games.entries()) {
            if (game.players.white === socket.id || game.players.black === socket.id) {
                const opponentId = (game.players.white === socket.id) ? game.players.black : game.players.white;
                io.to(opponentId).emit('opponent:disconnect');
                games.delete(roomId);
                console.log(`game ${roomId} ended due to disconnect`);
                break;
            }
        }
    });

    // Client requests a move: { from: 'e2', to: 'e4', promotion?: 'q' }
    socket.on('move', (payload) => {
        // find the game
        const game = findGameBySocket(socket.id);
        if (!game) {
            socket.emit('error', { message: 'Not found in an active game' });
            return;
        }

        const { chess, players, roomId } = game;
        // determine player's color
        const color = (players.white === socket.id) ? 'w' : (players.black === socket.id) ? 'b' : null;
        if (!color) {
            socket.emit('error', { message: 'You are not a player in this game' });
            return;
        }

        // enforce turn
        const turn = chess.turn(); // 'w' or 'b'
        if (turn !== color) {
            socket.emit('invalid:turn', { message: 'Not your turn' });
            return;
        }

        // Attempt move with chess.js
        const moveObj = chess.move({ from: payload.from, to: payload.to, promotion: payload.promotion || 'q' });
        if (moveObj === null) {
            socket.emit('invalid:move', { message: 'Illegal move' });
            return;
        }

        // Valid move — broadcast updated FEN, move history, and status
        const fen = chess.fen();
        const pgn = chess.pgn();
        const legalMoves = chess.moves();
        const inCheck = chess.in_check();
        const inCheckmate = chess.in_checkmate();
        const inDraw = chess.in_draw();
        const result = inCheckmate ? (turn === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate') :
            (inDraw ? 'Draw' : null);

        io.to(players.white).emit('game:update', { fen, pgn, lastMove: moveObj, turn: chess.turn(), inCheck, inCheckmate, inDraw });
        io.to(players.black).emit('game:update', { fen, pgn, lastMove: moveObj, turn: chess.turn(), inCheck, inCheckmate, inDraw });

        if (result) {
            io.to(players.white).emit('game:over', { result });
            io.to(players.black).emit('game:over', { result });
            games.delete(roomId);
            console.log(`game ${roomId} ended: ${result}`);
        }
    });

    // Allow client to request a resign
    socket.on('resign', () => {
        const game = findGameBySocket(socket.id);
        if (!game) return;
        const opponentId = (game.players.white === socket.id) ? game.players.black : game.players.white;
        const result = (game.players.white === socket.id) ? 'Black wins by resignation' : 'White wins by resignation';
        io.to(opponentId).emit('game:over', { result });
        socket.emit('game:over', { result });
        games.delete(game.roomId);
    });

    // Optional: client can request current game state
    socket.on('get:state', () => {
        const game = findGameBySocket(socket.id);
        if (!game) {
            socket.emit('no:game');
            return;
        }
        const { chess } = game;
        socket.emit('game:update', {
            fen: chess.fen(),
            pgn: chess.pgn(),
            turn: chess.turn(),
            inCheck: chess.in_check(),
            inCheckmate: chess.in_checkmate(),
            inDraw: chess.in_draw()
        });
    });

    // Helper attempt to create a game if two players waiting
    function tryCreateGame() {
        while (waitingQueue.length >= 2) {
            const a = waitingQueue.shift();
            const b = waitingQueue.shift();
            // create room id
            const roomId = makeRoomId(a, b);
            const chess = new Chess();
            // Randomly assign colors: flip a coin
            const coin = Math.random() < 0.5;
            const players = coin ? { white: a, black: b } : { white: b, black: a };

            // save game
            games.set(roomId, { roomId, chess, players, createdAt: Date.now() });

            // join sockets to a room for convenience
            io.sockets.sockets.get(players.white)?.join(roomId);
            io.sockets.sockets.get(players.black)?.join(roomId);

            // send start event including which color each player has
            io.to(players.white).emit('game:start', { color: 'white', opponentSocketId: players.black, fen: chess.fen(), turn: chess.turn() });
            io.to(players.black).emit('game:start', { color: 'black', opponentSocketId: players.white, fen: chess.fen(), turn: chess.turn() });

            console.log(`game created ${roomId} (white=${players.white}, black=${players.black})`);
        }
    }

    function findGameBySocket(sid) {
        for (const [roomId, game] of games.entries()) {
            if (game.players.white === sid || game.players.black === sid) {
                return game;
            }
        }
        return null;
    }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Serving static webapp at / (make sure PUBLIC_URL is reachable for Telegram)`);
});
