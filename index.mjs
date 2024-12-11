// Import dependencies
import * as dotenv from "dotenv";
import { Telegraf } from "telegraf";
import mongoose from "mongoose";
import OpenAI from "openai";

// Load environment variables
dotenv.config();

// Connect to MongoDB
// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Define MongoDB Schema and Model
const defineModels = () => {
  const conversationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    messages: [
      {
        role: { type: String, enum: ["bot", "user"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  });

  return mongoose.model("Conversation", conversationSchema);
};

const Conversation = defineModels();

// Initialize OpenAI API
const initializeOpenAI = () => {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

const openai = initializeOpenAI();

// Initialize Telegram Bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// User state management
const userState = {};
const setUserState = (userId) => {
  if (!userState[userId]) {
    userState[userId] = { step: 0, responses: {}, plan: null };
  }
  return userState[userId];
};

// Ask OpenAI for a concise response
const askOpenAI = async (prompt) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 150, // Configurable token limit
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return "I'm sorry, I couldn't generate a response. Please try again.";
  }
};

// Generate a concise plan using OpenAI
const generatePlan = async (responses) => {
  const prompt = `Based on the following details collected from the user, generate a concise and actionable plan:
  ${Object.entries(responses)
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
    .join("\n")}

  Please keep the plan concise, no more than 100 words.`;

  return await askOpenAI(prompt);
};

// Save conversation to MongoDB
const saveConversation = async (ctx, state) => {
  const messages = Object.entries(state.responses).map(([key, content]) => ({
    role: key.startsWith("bot") ? "bot" : "user",
    content,
  }));

  if (state.plan) {
    messages.push({
      role: "bot",
      content: state.plan,
    });
  }

  try {
    await new Conversation({
      userId: ctx.from.id,
      messages,
    }).save();
    console.log(`Conversation saved for user ${ctx.from.id}`);
  } catch (error) {
    console.error("Error saving conversation:", error);
  }
};

// Ask predefined questions
const askQuestions = async (ctx, state) => {
  const predefinedQuestions = [
    "Are you looking for a health insurance plan?",
    "What is your family size?",
    "What is your household income?",
    "What is your gender?",
  ];

  if (state.step / 2 < predefinedQuestions.length) {
    const question = predefinedQuestions[Math.floor(state.step / 2)];
    state.responses[`bot_step_${state.step}`] = question;
    await ctx.reply(question);
  } else {
    try {
      state.plan = await generatePlan(state.responses);
      await ctx.reply("Thank you for your responses! Here is the plan we created for you:");
      await ctx.reply(state.plan);
      await saveConversation(ctx, state);
      delete userState[ctx.from.id];
    } catch (error) {
      console.error("Error generating plan:", error);
      await ctx.reply("Something went wrong while generating your plan. Please try again later.");
    }
  }
};

// Handle incoming text messages
bot.on("text", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const state = setUserState(userId);

    if (state.step % 2 !== 0) {
      state.responses[`user_step_${state.step}`] = ctx.message.text;
      state.step++;
    }

    await askQuestions(ctx, state);
    state.step++;
  } catch (error) {
    console.error("Error handling message:", error);
    await ctx.reply("Something went wrong. Please try again.");
  }
});

// Start bot and MongoDB connection
const startBot = async () => {
  try {
    await connectDB();
    bot.launch();
    console.log("Bot is running...");
  } catch (error) {
    if (error.code === 'ECONNRESET') {
      console.error("Connection reset by peer, retrying...");
      setTimeout(startBot, 5000); // Retry after 5 seconds
    } else {
      console.error("Error starting bot:", error);
      process.exit(1);
    }
  }
};

startBot();
