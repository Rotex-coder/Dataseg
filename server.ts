import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { 
  getDbStatus, 
  findUserByEmail, 
  findUserByUsername, 
  findUserById, 
  verifyUserPassword, 
  createUser, 
  addContactToUser, 
  getMessagesForUserChat, 
  getMessageById, 
  createMessage, 
  updateMessageText, 
  deleteMessageForEveryone, 
  deleteMessageForUser,
  updateUserAvatar,
  markMessagesAsRead,
  getIncomingContactRequests,
  sendContactRequest,
  respondToContactRequest,
  removeContact
} from "./src/db.js";
import { 
  cleanTurkishCharacters, 
  hashPassword, 
  generateToken, 
  verifyToken 
} from "./src/utils.js";
import { User, Message } from "./src/types.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "sadewa-super-secret-key-1337";

app.use(express.json({ limit: "10mb" }));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// SSE Client Connection Store
interface SSEConnection {
  userId: string;
  res: express.Response;
}
let sseConnections: SSEConnection[] = [];

function broadcastToUser(userId: string, data: any) {
  const connections = sseConnections.filter(c => c.userId === userId);
  connections.forEach(conn => {
    try {
      conn.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      console.error(`Error sending SSE update to user ${userId}:`, e);
    }
  });
}

function broadcastToChat(senderId: string, receiverId: string, data: any) {
  broadcastToUser(senderId, data);
  broadcastToUser(receiverId, data);
}

// Authentication Middleware
interface AuthRequest extends express.Request {
  userId?: string;
}

const authenticate = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.split(" ")[1];
  const userId = verifyToken(token, JWT_SECRET);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
};

// 1. SSE Stream Endpoint
app.get("/api/updates/stream", (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).send("User ID required");
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });

  // Write immediate initial response to flush proxy buffers
  res.write("retry: 3000\n: ok\n\n");

  // Keep connection alive with simple pings
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "ping" })}\n\n`);
  }, 15000);

  sseConnections.push({ userId, res });
  console.log(`User ${userId} connected to real-time update stream. Active connections: ${sseConnections.length}`);

  req.on("close", () => {
    clearInterval(interval);
    sseConnections = sseConnections.filter(c => c.res !== res);
    console.log(`User ${userId} disconnected from update stream. Active connections: ${sseConnections.length}`);
  });
});

// 2. Database Status Endpoint
app.get("/api/db-status", async (req, res) => {
  try {
    const status = await getDbStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: "Database state check failed" });
  }
});

// 3. Register Endpoint
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, avatar } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Lütfen tüm alanları doldurun." });
    return;
  }

  try {
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      res.status(400).json({ error: "Bu e-posta adresiyle zaten bir kayıt mevcut." });
      return;
    }

    // Clean Turkish characters for handle
    let baseHandle = cleanTurkishCharacters(name);
    if (baseHandle.length === 0) {
      baseHandle = "user";
    }
    
    let handle = `@${baseHandle}`;
    let isTaken = await findUserByUsername(handle);
    let attempts = 0;
    
    while (isTaken && attempts < 100) {
      const suffix = Math.floor(100 + Math.random() * 900);
      handle = `@${baseHandle}${suffix}`;
      isTaken = await findUserByUsername(handle);
      attempts++;
    }

    const userId = Math.random().toString(36).substring(2, 15);
    const avatarUrl = avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=005c4b,202c33,0b141a,34b7f1&fontFamily=Arial,Helvetica,sans-serif`;

    const newUser: User = {
      id: userId,
      name,
      email: email.toLowerCase(),
      username: handle,
      avatar: avatarUrl,
      contacts: [],
      createdAt: new Date().toISOString()
    };

    const hash = hashPassword(password);
    await createUser(newUser, hash);

    const token = generateToken(userId, JWT_SECRET);
    res.json({ user: newUser, token });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Kayıt işlemi sırasında bir hata oluştu." });
  }
});

// 4. Login Endpoint
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Lütfen tüm alanları doldurun." });
    return;
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      res.status(400).json({ error: "E-posta veya şifre hatalı." });
      return;
    }

    const hash = hashPassword(password);
    const isMatched = await verifyUserPassword(user.id, hash);
    if (!isMatched) {
      res.status(400).json({ error: "E-posta veya şifre hatalı." });
      return;
    }

    const token = generateToken(user.id, JWT_SECRET);
    res.json({ user, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Giriş işlemi sırasında bir hata oluştu." });
  }
});

// 5. Get Profile Info
app.get("/api/auth/me", authenticate as any, async (req: AuthRequest, res) => {
  try {
    const user = await findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: "Kullanıcı bulunamadı." });
      return;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Profil sorgulama başarısız oldu." });
  }
});

// 5b. Update Profile Avatar
app.post("/api/auth/avatar", authenticate as any, async (req: AuthRequest, res) => {
  const { avatar } = req.body;
  if (!avatar) {
    res.status(400).json({ error: "Lütfen bir görsel seçin." });
    return;
  }
  try {
    await updateUserAvatar(req.userId!, avatar);
    res.json({ success: true, avatar });
  } catch (err) {
    console.error("Avatar update error:", err);
    res.status(500).json({ error: "Profil resmi güncellenemedi." });
  }
});

// 6. Search Users by Handle
app.get("/api/users/search", authenticate as any, async (req: AuthRequest, res) => {
  const { handle } = req.query;
  if (!handle || typeof handle !== "string") {
    res.status(400).json({ error: "Arama terimi boş olamaz." });
    return;
  }

  try {
    const user = await findUserByUsername(handle.trim());
    if (!user) {
      res.status(404).json({ error: "Kullanıcı bulunamadı." });
      return;
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Arama başarısız." });
  }
});

// 7. Send Contact Request (replaces direct add)
app.post("/api/users/contacts/add", authenticate as any, async (req: AuthRequest, res) => {
  const { contactId } = req.body;
  if (!contactId) {
    res.status(400).json({ error: "Contact ID is required." });
    return;
  }

  if (contactId === req.userId) {
    res.status(400).json({ error: "Kendinizi ekleyemezsiniz." });
    return;
  }

  try {
    const contact = await findUserById(contactId);
    if (!contact) {
      res.status(404).json({ error: "Kullanıcı bulunamadı." });
      return;
    }

    await sendContactRequest(req.userId!, contactId);
    
    // Broadcast contact update event to both clients so they refresh contact/requests list
    broadcastToChat(req.userId!, contactId, { type: "contacts_update" });
    
    res.json({ success: true, message: "Bağlantı isteği gönderildi." });
  } catch (err: any) {
    console.error("Add contact request error:", err);
    res.status(400).json({ error: err.message || "İstek gönderilirken hata oluştu." });
  }
});

// 7.1. Get Pending Incoming Contact Requests
app.get("/api/users/contacts/requests/incoming", authenticate as any, async (req: AuthRequest, res) => {
  try {
    const requests = await getIncomingContactRequests(req.userId!);
    const detailedRequests = [];
    
    for (const reqObj of requests) {
      const fromUser = await findUserById(reqObj.fromUserId);
      if (fromUser) {
        detailedRequests.push({
          id: reqObj.id,
          createdAt: reqObj.createdAt,
          fromUser: {
            id: fromUser.id,
            name: fromUser.name,
            username: fromUser.username,
            avatar: fromUser.avatar
          }
        });
      }
    }
    
    res.json(detailedRequests);
  } catch (err) {
    console.error("Get incoming requests error:", err);
    res.status(500).json({ error: "İstekler yüklenirken hata oluştu." });
  }
});

// 7.2. Respond to Contact Request
app.post("/api/users/contacts/requests/respond", authenticate as any, async (req: AuthRequest, res) => {
  const { requestId, action } = req.body; // action: "accept" | "decline"
  if (!requestId || !action) {
    res.status(400).json({ error: "Request ID and action are required." });
    return;
  }
  
  try {
    await respondToContactRequest(requestId, req.userId!, action);
    
    // Broadcast contacts update to trigger sidebar reloading for anyone active
    broadcastToChat(req.userId!, "*", { type: "contacts_update" });
    
    res.json({ success: true });
  } catch (err: any) {
    console.error("Respond contact request error:", err);
    res.status(500).json({ error: err.message || "İşlem gerçekleştirilemedi." });
  }
});

// 7.3. Delete Contact Bidirectionally
app.delete("/api/users/contacts/:contactId", authenticate as any, async (req: AuthRequest, res) => {
  const { contactId } = req.params;
  try {
    await removeContact(req.userId!, contactId);
    
    // Broadcast update to other user
    broadcastToChat(req.userId!, contactId, { type: "contacts_update" });
    broadcastToChat(req.userId!, req.userId!, { type: "contacts_update" });
    
    res.json({ success: true, message: "Kişi silindi." });
  } catch (err) {
    console.error("Delete contact error:", err);
    res.status(500).json({ error: "Kişi silinemedi." });
  }
});

// 8. Get Contacts with Last Messages (WhatsApp Home Style)
app.get("/api/users/contacts", authenticate as any, async (req: AuthRequest, res) => {
  try {
    const user = await findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: "Kullanıcı bulunamadı." });
      return;
    }

    const contactIds = user.contacts || [];
    const contactList = [];

    for (const cId of contactIds) {
      const contactInfo = await findUserById(cId);
      if (contactInfo) {
        // Fetch last message between current user and this contact
        const messages = await getMessagesForUserChat(req.userId!, cId);
        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
        
        contactList.push({
          ...contactInfo,
          lastMessage: lastMsg
        });
      }
    }

    // Sort contacts by last message timestamp (most recent first)
    contactList.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    res.json(contactList);
  } catch (err) {
    console.error("Get contacts error:", err);
    res.status(500).json({ error: "Kişi listesi alınamadı." });
  }
});

// 9. Get Messages between current user and contact
app.get("/api/messages/:contactId", authenticate as any, async (req: AuthRequest, res) => {
  const { contactId } = req.params;
  try {
    // Automatically mark all messages from this contact as read since we are opening the chat
    await markMessagesAsRead(contactId, req.userId!);
    
    // Broadcast to the other user that their messages were read
    broadcastToChat(contactId, req.userId!, {
      type: "messages_read",
      readerId: req.userId!,
      senderId: contactId
    });

    const messages = await getMessagesForUserChat(req.userId!, contactId);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Mesaj geçmişi yüklenemedi." });
  }
});

// 9.5. Send Read Receipt
app.post("/api/messages/read", authenticate as any, async (req: AuthRequest, res) => {
  const { contactId } = req.body;
  if (!contactId) {
    res.status(400).json({ error: "İletişim kimliği (contactId) gereklidir." });
    return;
  }
  try {
    await markMessagesAsRead(contactId, req.userId!);
    
    // Broadcast to the other user that their messages were read
    broadcastToChat(contactId, req.userId!, {
      type: "messages_read",
      readerId: req.userId!,
      senderId: contactId
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Okundu bilgisi güncellenemedi." });
  }
});

// 10. Send New Message
app.post("/api/messages", authenticate as any, async (req: AuthRequest, res) => {
  const { receiverId, text } = req.body;
  if (!receiverId || !text) {
    res.status(400).json({ error: "Alıcı ve mesaj içeriği gereklidir." });
    return;
  }

  try {
    const msgId = Math.random().toString(36).substring(2, 15);
    const newMsg: Message = {
      id: msgId,
      senderId: req.userId!,
      receiverId,
      text,
      edited: false,
      deletedForEveryone: false,
      deletedForUsers: [],
      createdAt: new Date().toISOString()
    };

    await createMessage(newMsg);

    const senderUser = await findUserById(req.userId!);

    // Broadcast message to both users
    broadcastToChat(req.userId!, receiverId, { 
      type: "new_message", 
      message: newMsg,
      senderName: senderUser?.name || "Biri",
      senderAvatar: senderUser?.avatar || ""
    });

    res.json(newMsg);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Mesaj gönderilemedi." });
  }
});

// 11. Edit Message
app.patch("/api/messages/:id", authenticate as any, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: "Mesaj içeriği gereklidir." });
    return;
  }

  try {
    const msg = await getMessageById(id);
    if (!msg) {
      res.status(404).json({ error: "Mesaj bulunamadı." });
      return;
    }

    if (msg.senderId !== req.userId) {
      res.status(403).json({ error: "Sadece kendi mesajlarınızı düzenleyebilirsiniz." });
      return;
    }

    await updateMessageText(id, text);
    
    // Broadcast updated message event
    broadcastToChat(msg.senderId, msg.receiverId, { 
      type: "message_edit", 
      messageId: id, 
      text 
    });

    res.json({ success: true, text });
  } catch (err) {
    res.status(500).json({ error: "Mesaj düzenlenemedi." });
  }
});

// 12. Delete Message
app.post("/api/messages/:id/delete", authenticate as any, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { type } = req.body; // "everyone" | "me"
  if (!type || (type !== "everyone" && type !== "me")) {
    res.status(400).json({ error: "Silme türü 'everyone' veya 'me' olmalıdır." });
    return;
  }

  try {
    const msg = await getMessageById(id);
    if (!msg) {
      res.status(404).json({ error: "Mesaj bulunamadı." });
      return;
    }

    if (type === "everyone") {
      if (msg.senderId !== req.userId) {
        res.status(403).json({ error: "Bu mesajı herkesten sadece gönderen silebilir." });
        return;
      }
      await deleteMessageForEveryone(id);
      broadcastToChat(msg.senderId, msg.receiverId, { 
        type: "message_delete_everyone", 
        messageId: id 
      });
    } else {
      // Delete for me (only add current userId to deletedForUsers list)
      await deleteMessageForUser(id, req.userId!);
      // Broadcast only to current user stream to update local view
      broadcastToUser(req.userId!, { 
        type: "message_delete_me", 
        messageId: id 
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ error: "Mesaj silinemedi." });
  }
});

// Express serving production frontend and development Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
