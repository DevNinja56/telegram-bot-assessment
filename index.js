require("dotenv").config();
const { Telegraf } = require("telegraf");
const mongoose = require("mongoose");
const OpenAI = require("openai");

// Set up MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Define Conversation schema
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

const Conversation = mongoose.model("Conversation", conversationSchema);

// Set up OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set up Telegram Bot
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
      max_tokens: 150, // Limit the token count for shorter responses
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

  try {
    const plan = await askOpenAI(prompt);
    return plan;
  } catch (error) {
    console.error("Error generating plan:", error);
    return "I'm sorry, I couldn't generate a plan. Please try again.";
  }
};

// Save conversation to MongoDB
const saveConversation = async (ctx, state) => {
  const messages = Object.entries(state.responses).map(([key, content]) => ({
    role: key.startsWith("bot") ? "bot" : "user",
    content,
  }));

  // Include the generated plan in the conversation
  if (state.plan) {
    messages.push({
      role: "bot",
      content: state.plan,
    });
  }

  const conversation = new Conversation({
    userId: ctx.from.id,
    messages,
  });

  try {
    await conversation.save();
    console.log(`Conversation saved for user ${ctx.from.id}`);
  } catch (error) {
    console.error("Error saving conversation:", error);
  }
};

// Ask questions sequentially
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
    // Generate and send the plan
    const plan = await generatePlan(state.responses);
    state.plan = plan; // Store the plan in the state
    await ctx.reply("Thank you for your responses! Here is the plan we created for you:");
    await ctx.reply(plan);

    // Save the conversation to MongoDB
    await saveConversation(ctx, state);

    // Reset user state
    delete userState[ctx.from.id];
  }
};

// Handle messages
bot.on("text", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const state = setUserState(userId);

    if (state.step % 2 !== 0) {
      // Save user response
      state.responses[`user_step_${state.step}`] = ctx.message.text;
      state.step++;
    }

    // Ask next question or finalize the process
    await askQuestions(ctx, state);

    // Move to the next step
    state.step++;
  } catch (error) {
    console.error("Error handling message:", error);
    await ctx.reply("Something went wrong. Please try again.");
  }
});

// Start Bot
const startBot = async () => {
  try {
    await connectDB();
    bot.launch();
    console.log("Bot is running...");
  } catch (error) {
    console.error("Error starting bot:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// Initialize
startBot();
