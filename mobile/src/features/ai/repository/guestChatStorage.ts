import { db as defaultDb } from "@/lib/db/client";
import { guestChatMessages } from "@/lib/db/schema";
import type { Message } from "@/features/finance/utils/chatMessageUtils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqliteDb = any;

export function loadGuestChatMessages(db: SqliteDb = defaultDb): Message[] {
  const rows = db.select().from(guestChatMessages).all();
  return rows
    .map((row: typeof guestChatMessages.$inferSelect) => {
      const message = JSON.parse(row.payload) as Message;
      return { ...message, createdAt: new Date(message.createdAt) };
    })
    .sort((a: Message, b: Message) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function saveGuestChatMessages(messages: Message[], db: SqliteDb = defaultDb): void {
  db.delete(guestChatMessages).run();
  for (const message of messages) {
    db.insert(guestChatMessages)
      .values({
        id: message.id,
        type: message.type,
        created_at: message.createdAt.toISOString(),
        payload: JSON.stringify(message),
      })
      .run();
  }
}

export function clearGuestChatMessages(db: SqliteDb = defaultDb): void {
  db.delete(guestChatMessages).run();
}
