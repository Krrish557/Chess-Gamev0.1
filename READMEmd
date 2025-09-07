# ♟️ Telegram Chess Mini App

A minimal multiplayer chess prototype that runs as a **Telegram Mini App** with a **vanilla JS frontend** and a **Node.js backend**.  
This project uses **Docker** and **Docker Compose** for deployment. Both the Express server and the Telegram bot run inside the same container for simplicity.

---

## 📦 Features

- Minimal **vanilla JS frontend** served by `server.js`  
- **Telegram bot integration** via `bot.js`  
- Single Docker container runs both processes using **concurrently**  
- Configurable environment variables for tokens and URLs  
- Ready for local development with **ngrok** or production hosting  

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/chess-telegram-app.git
cd chess-telegram-app
```

### 2. Configure environment

Create a .env file in the project root:
```.env
TELEGRAM_BOT_TOKEN=your-bot-token-here
PUBLIC_URL=https://your-ngrok-url-or-server-domain
```

TELEGRAM_BOT_TOKEN: Your Telegram bot token from BotFather
PUBLIC_URL: Publicly accessible URL of your server (for webhooks). If running locally, use ngrok.

Example using ngrok:
```bash
ngrok http 3000
```
Copy the generated https://xxxx.ngrok.io URL into PUBLIC_URL.


### 3. Install dependencies

```bash 
npm install
```

### 4. Start the server and bot
Start the Express server:

```bash
node server.js
```

Start the Telegram bot (in a separate terminal):

```bash
node bot.js
```

### 5. Access the App

Frontend: Open the URL served by ngrok (e.g., https://xxxx.ngrok.io) in your browser or via Telegram Web App.

Telegram bot: Open your bot in Telegram (@your_bot_username) and send /start or /play. Click the inline “Play Chess” button to open the mini app.

### Extra Tip
Use nodemon for hot reload in development:

```bash 
npm install -g nodemon
nodemon server.js
```