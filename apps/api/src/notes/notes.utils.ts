import { Prisma } from 'generated/prisma/client';

import { NoteEntity } from '@later/types';

import { DbNote } from './notes.types';

/**
 * The fields mapToNoteEntity needs
 */
export const NOTE_SELECT = {
  id: true,
  createdAt: true,
  tier: true,
  textNote: { select: { content: true } },
} satisfies Prisma.NoteSelect;

export function mapToNoteEntity(note: DbNote): NoteEntity {
  return {
    id: note.id,
    content: note.textNote?.content ?? '',
    createdAt: note.createdAt.toISOString(),
    // NULL until the owner's backfill, ranked as D by the feed too
    tier: note.tier ?? 'D',
  };
}
