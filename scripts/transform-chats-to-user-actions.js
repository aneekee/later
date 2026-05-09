const fs = require("fs");
const path = require("path");

const chatsPath = path.resolve(__dirname, "../chats.json");
const outputPath =
  process.argv[2] || path.resolve(__dirname, "../user-actions-chats.json");

const chats = JSON.parse(fs.readFileSync(chatsPath, "utf-8"));

const userActions = chats.map((chat) => ({
  type: "CREATE_CHAT",
  userId: chat.user_id,
  params: { chatId: chat.id },
  createdAt: new Date(chat.created_at),
}));

fs.writeFileSync(outputPath, JSON.stringify(userActions, null, 2));
console.log(`Transformed ${userActions.length} chats -> ${outputPath}`);
