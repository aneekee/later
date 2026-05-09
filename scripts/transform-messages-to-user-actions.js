const fs = require("fs");
const path = require("path");

const messagesPath = path.resolve(__dirname, "../messages.json");
const chatsPath = path.resolve(__dirname, "../chats.json");
const outputPath =
  process.argv[2] || path.resolve(__dirname, "../user-actions-messages.json");

const messages = JSON.parse(fs.readFileSync(messagesPath, "utf-8"));
const chats = JSON.parse(fs.readFileSync(chatsPath, "utf-8"));

const chatUserMap = Object.fromEntries(
  chats.map((chat) => [chat.id, chat.user_id]),
);

const userActions = messages.map((message) => ({
  type: "CREATE_MESSAGE",
  userId: chatUserMap[message.chat_id],
  params: { messageId: message.id, messageType: message.type },
  createdAt: new Date(message.created_at),
}));

fs.writeFileSync(outputPath, JSON.stringify(userActions, null, 2));
console.log(`Transformed ${userActions.length} messages -> ${outputPath}`);
