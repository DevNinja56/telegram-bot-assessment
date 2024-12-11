# Telegram Bot with Node.js and OpenAI API

## Overview
This project is a conversational Telegram bot built using Node.js, the Telegraf library, OpenAI APIs, and MongoDB. The bot collects user responses through a sequence of questions, generates a concise plan using OpenAI, and saves the conversation in a MongoDB database.

## Features
- Sequential question-based interaction with users.
- Integration with OpenAI's GPT-3.5-turbo for generating responses and plans.
- MongoDB for storing user conversations.
- Graceful handling of bot lifecycle events and user interactions.

## Prerequisites
To run this bot, you need:
- **Node.js** (v14 or higher)
- A **MongoDB** database (local or cloud, e.g., MongoDB Atlas)
- An **OpenAI API Key**
- A **Telegram Bot Token** (created via the [BotFather](https://core.telegram.org/bots#botfather))
- A `.env` file with the following variables:
  ```
  TELEGRAM_BOT_TOKEN=your-telegram-bot-token
  OPENAI_API_KEY=your-openai-api-key
  MONGO_URI=your-mongo-connection-string
  ```

## Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/telegram-bot.git
   cd telegram-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file and add your environment variables.

4. Run the bot:
   ```bash
   node index.js or npm start
   ```

## How It Works
1. **User Interaction**: 
   - The bot asks a series of predefined questions.
   - User responses are captured and stored in memory.

2. **Plan Generation**:
   - Once all questions are answered, the bot sends the responses to OpenAI's API.
   - A concise and actionable plan is generated.

3. **Conversation Storage**:
   - The conversation, including user inputs and bot responses, is saved in MongoDB.

4. **Error Handling**:
   - Errors in MongoDB or OpenAI API interactions are logged and user-friendly error messages are sent to users.

5. **State Management**:
   - User interaction states are managed in-memory, ensuring a smooth experience.

## Bot Commands
- Start the bot: Simply send a message to the bot to begin the conversation.
- Respond to questions: Provide text-based answers to the bot's questions.

## Try the Bot
You can try the bot here: 
    ```
    @devninja123_bot
    ```

## Project Structure
```
.
├── index.js          # Main bot logic
├── .env              # Environment variables
├── package.json      # Project metadata and dependencies
├── node_modules/     # Installed dependencies
└── README.md         # Project documentation
```

## Dependencies
- **Telegraf**: Telegram bot framework for Node.js.
- **mongoose**: MongoDB object modeling library.
- **dotenv**: For managing environment variables.
- **OpenAI**: Node.js SDK for OpenAI API.

## 