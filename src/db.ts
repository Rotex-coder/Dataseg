import { MongoClient, Db } from "mongodb";
import { User, Message } from "./types";

let mongoClient: MongoClient | null = null;
let db: Db | null = null;
let isConnectedToMongo = false;
let isMongoConnecting = false;

export async function getDbStatus(): Promise<{ connected: boolean; type: "mongo"; uri?: string }> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return { connected: false, type: "mongo" };
  }
  
  // Try to connect if we haven't already
  if (!db && !isMongoConnecting) {
    isMongoConnecting = true;
    try {
      mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await mongoClient.connect();
      db = mongoClient.db("sadewa");
      isConnectedToMongo = true;
      console.log("Connected to MongoDB cluster!");
    } catch (err) {
      console.error("MongoDB connection attempt failed:", err);
      isConnectedToMongo = false;
    } finally {
      isMongoConnecting = false;
    }
  }

  return {
    connected: isConnectedToMongo,
    type: "mongo",
    uri: uri ? "MONGODB_URI is set" : undefined
  };
}

async function getConnectedDb(): Promise<Db> {
  await getDbStatus();
  if (!db || !isConnectedToMongo) {
    throw new Error("MongoDB bağlantısı kurulamadı! Lütfen MONGODB_URI bağlantı linkini Secrets panelinde doğru tanımladığınızdan emin olun.");
  }
  return db;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const activeDb = await getConnectedDb();
  const userDoc = await activeDb.collection("users").findOne({ email: email.toLowerCase() });
  if (!userDoc) return null;
  return {
    id: userDoc._id.toString(),
    name: userDoc.name,
    email: userDoc.email,
    username: userDoc.username,
    avatar: userDoc.avatar,
    contacts: userDoc.contacts || [],
    createdAt: userDoc.createdAt
  };
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const activeDb = await getConnectedDb();
  const formattedUsername = username.startsWith("@") ? username.toLowerCase() : `@${username.toLowerCase()}`;
  
  const userDoc = await activeDb.collection("users").findOne({ username: formattedUsername });
  if (!userDoc) return null;
  return {
    id: userDoc._id.toString(),
    name: userDoc.name,
    email: userDoc.email,
    username: userDoc.username,
    avatar: userDoc.avatar,
    contacts: userDoc.contacts || [],
    createdAt: userDoc.createdAt
  };
}

export async function findUserById(id: string): Promise<User | null> {
  const activeDb = await getConnectedDb();
  try {
    const userDoc = await activeDb.collection("users").findOne({ _id: id as any });
    if (!userDoc) return null;
    return {
      id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      username: userDoc.username,
      avatar: userDoc.avatar,
      contacts: userDoc.contacts || [],
      createdAt: userDoc.createdAt
    };
  } catch (e) {
    return null;
  }
}

export async function verifyUserPassword(userId: string, passwordHash: string): Promise<boolean> {
  const activeDb = await getConnectedDb();
  const pdoc = await activeDb.collection("passwords").findOne({ userId });
  return pdoc ? pdoc.hash === passwordHash : false;
}

export async function createUser(user: User, passwordHash: string): Promise<User> {
  const activeDb = await getConnectedDb();
  await activeDb.collection("users").insertOne({
    _id: user.id as any,
    name: user.name,
    email: user.email.toLowerCase(),
    username: user.username.toLowerCase(),
    avatar: user.avatar,
    contacts: [],
    createdAt: user.createdAt
  });
  await activeDb.collection("passwords").insertOne({
    userId: user.id,
    hash: passwordHash
  });
  return user;
}

export async function addContactToUser(userId: string, contactId: string): Promise<void> {
  const activeDb = await getConnectedDb();
  await activeDb.collection("users").updateOne(
    { _id: userId as any },
    { $addToSet: { contacts: contactId } } as any
  );
  // Bidirectional add for WhatsApp-style chat visibility
  await activeDb.collection("users").updateOne(
    { _id: contactId as any },
    { $addToSet: { contacts: userId } } as any
  );
}

export async function getMessagesForUserChat(userId: string, contactId: string): Promise<Message[]> {
  const activeDb = await getConnectedDb();
  const query = {
    $or: [
      { senderId: userId, receiverId: contactId },
      { senderId: contactId, receiverId: userId }
    ],
    deletedForUsers: { $ne: userId }
  };
  const messageDocs = await activeDb.collection("messages").find(query).sort({ createdAt: 1 }).toArray();
  return messageDocs.map(doc => ({
    id: doc._id.toString(),
    senderId: doc.senderId,
    receiverId: doc.receiverId,
    text: doc.text,
    edited: doc.edited || false,
    deletedForEveryone: doc.deletedForEveryone || false,
    deletedForUsers: doc.deletedForUsers || [],
    createdAt: doc.createdAt,
    read: doc.read || false
  }));
}

export async function getMessageById(messageId: string): Promise<Message | null> {
  const activeDb = await getConnectedDb();
  const doc = await activeDb.collection("messages").findOne({ _id: messageId as any });
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    senderId: doc.senderId,
    receiverId: doc.receiverId,
    text: doc.text,
    edited: doc.edited || false,
    deletedForEveryone: doc.deletedForEveryone || false,
    deletedForUsers: doc.deletedForUsers || [],
    createdAt: doc.createdAt,
    read: doc.read || false
  };
}

export async function createMessage(msg: Message): Promise<Message> {
  const activeDb = await getConnectedDb();
  await activeDb.collection("messages").insertOne({
    _id: msg.id as any,
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    text: msg.text,
    edited: false,
    deletedForEveryone: false,
    deletedForUsers: [],
    createdAt: msg.createdAt,
    read: msg.read || false
  });
  return msg;
}

export async function markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
  const activeDb = await getConnectedDb();
  await activeDb.collection("messages").updateMany(
    { senderId, receiverId, read: { $ne: true } },
    { $set: { read: true } }
  );
}

export async function updateMessageText(messageId: string, newText: string): Promise<void> {
  const activeDb = await getConnectedDb();
  await activeDb.collection("messages").updateOne(
    { _id: messageId as any },
    { $set: { text: newText, edited: true } }
  );
}

export async function deleteMessageForEveryone(messageId: string): Promise<void> {
  const activeDb = await getConnectedDb();
  await activeDb.collection("messages").updateOne(
    { _id: messageId as any },
    { $set: { text: "Bu mesaj silindi", deletedForEveryone: true } }
  );
}

export async function deleteMessageForUser(messageId: string, userId: string): Promise<void> {
  const activeDb = await getConnectedDb();
  await activeDb.collection("messages").updateOne(
    { _id: messageId as any },
    { $addToSet: { deletedForUsers: userId } } as any
  );
}

export async function updateUserAvatar(userId: string, avatarBase64: string): Promise<void> {
  const activeDb = await getConnectedDb();
  await activeDb.collection("users").updateOne(
    { _id: userId as any },
    { $set: { avatar: avatarBase64 } }
  );
}

export interface ContactRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export async function getIncomingContactRequests(userId: string): Promise<ContactRequest[]> {
  const activeDb = await getConnectedDb();
  const docs = await activeDb.collection("contact_requests").find({ toUserId: userId, status: "pending" }).toArray();
  return docs.map(doc => ({
    id: doc._id.toString(),
    fromUserId: doc.fromUserId,
    toUserId: doc.toUserId,
    status: doc.status,
    createdAt: doc.createdAt
  }));
}

export async function getOutgoingContactRequests(userId: string): Promise<ContactRequest[]> {
  const activeDb = await getConnectedDb();
  const docs = await activeDb.collection("contact_requests").find({ fromUserId: userId, status: "pending" }).toArray();
  return docs.map(doc => ({
    id: doc._id.toString(),
    fromUserId: doc.fromUserId,
    toUserId: doc.toUserId,
    status: doc.status,
    createdAt: doc.createdAt
  }));
}

export async function sendContactRequest(fromUserId: string, toUserId: string): Promise<void> {
  const activeDb = await getConnectedDb();
  // Check if they are already contacts
  const user = await activeDb.collection("users").findOne({ _id: fromUserId as any });
  if (user && user.contacts && user.contacts.includes(toUserId)) {
    throw new Error("Bu kullanıcı zaten kişilerinizde ekli.");
  }

  // Check if there is already a pending request
  const existing = await activeDb.collection("contact_requests").findOne({
    $or: [
      { fromUserId, toUserId, status: "pending" },
      { fromUserId: toUserId, toUserId: fromUserId, status: "pending" }
    ]
  });
  if (existing) {
    throw new Error("Zaten bekleyen bir bağlantı isteği var.");
  }
  
  await activeDb.collection("contact_requests").insertOne({
    fromUserId,
    toUserId,
    status: "pending",
    createdAt: new Date().toISOString()
  });
}

export async function respondToContactRequest(requestId: string, toUserId: string, action: "accept" | "decline"): Promise<void> {
  const activeDb = await getConnectedDb();
  const { ObjectId } = await import("mongodb");
  
  const reqObjId = new ObjectId(requestId);
  const request = await activeDb.collection("contact_requests").findOne({ _id: reqObjId });
  if (!request) {
    throw new Error("İstek bulunamadı.");
  }
  
  if (request.toUserId !== toUserId) {
    throw new Error("Yetkisiz işlem.");
  }
  
  if (action === "accept") {
    await activeDb.collection("contact_requests").updateOne(
      { _id: reqObjId },
      { $set: { status: "accepted" } }
    );
    // Add contacts to each other
    await addContactToUser(request.fromUserId, request.toUserId);
  } else {
    await activeDb.collection("contact_requests").deleteOne({ _id: reqObjId });
  }
}

export async function removeContact(userId: string, contactId: string): Promise<void> {
  const activeDb = await getConnectedDb();
  // Bidirectional remove
  await activeDb.collection("users").updateOne(
    { _id: userId as any },
    { $pull: { contacts: contactId } } as any
  );
  await activeDb.collection("users").updateOne(
    { _id: contactId as any },
    { $pull: { contacts: userId } } as any
  );
  
  // Also clean up any requests between them
  await activeDb.collection("contact_requests").deleteMany({
    $or: [
      { fromUserId: userId, toUserId: contactId },
      { fromUserId: contactId, toUserId: userId }
    ]
  });
}
