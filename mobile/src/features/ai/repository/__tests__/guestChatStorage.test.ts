jest.mock('@/lib/db/client', () => ({ db: null }));

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/lib/db/schema';
import {
  clearGuestChatMessages,
  loadGuestChatMessages,
  saveGuestChatMessages,
} from '../guestChatStorage';
import { createUserTextMessage, createAITypingMessage } from '@/features/finance/utils/chatMessageUtils';

function makeTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE guest_chat_messages (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
  `);
  return drizzle(sqlite, { schema });
}

describe('guestChatStorage', () => {
  it('returns an empty array when nothing has been saved', () => {
    const db = makeTestDb();
    expect(loadGuestChatMessages(db)).toEqual([]);
  });

  it('round-trips a saved message list, restoring createdAt as a Date', () => {
    const db = makeTestDb();
    const messages = [
      { ...createUserTextMessage('halo'), createdAt: new Date('2026-01-01T10:00:00Z') },
      { ...createAITypingMessage('halo'), createdAt: new Date('2026-01-01T10:00:05Z') },
    ];

    saveGuestChatMessages(messages, db);
    const loaded = loadGuestChatMessages(db);

    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe(messages[0].id);
    expect(loaded[0].createdAt).toEqual(new Date('2026-01-01T10:00:00Z'));
    expect(loaded[1].id).toBe(messages[1].id);
  });

  it('restores messages in chronological order regardless of save order', () => {
    const db = makeTestDb();
    const later = { ...createUserTextMessage('later'), createdAt: new Date('2026-01-02T00:00:00Z') };
    const earlier = { ...createUserTextMessage('earlier'), createdAt: new Date('2026-01-01T00:00:00Z') };

    saveGuestChatMessages([later, earlier], db);

    expect(loadGuestChatMessages(db).map((m) => m.id)).toEqual([earlier.id, later.id]);
  });

  it('save replaces the entire previous cache, not appends', () => {
    const db = makeTestDb();
    const first = createUserTextMessage('first');
    const second = createUserTextMessage('second');

    saveGuestChatMessages([first], db);
    saveGuestChatMessages([second], db);

    expect(loadGuestChatMessages(db).map((m) => m.id)).toEqual([second.id]);
  });

  it('saving an empty array clears the cache', () => {
    const db = makeTestDb();
    saveGuestChatMessages([createUserTextMessage('x')], db);

    saveGuestChatMessages([], db);

    expect(loadGuestChatMessages(db)).toEqual([]);
  });

  it('clearGuestChatMessages empties the cache', () => {
    const db = makeTestDb();
    saveGuestChatMessages([createUserTextMessage('x')], db);

    clearGuestChatMessages(db);

    expect(loadGuestChatMessages(db)).toEqual([]);
  });
});
