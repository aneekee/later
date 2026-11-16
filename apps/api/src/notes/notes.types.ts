import type { NoteTier } from '@later/types';

export interface CheckNoteAccessServiceDto {
  noteId: string;
  userId: string;
}

export interface CreateNoteServiceDto {
  content: string;
  userId: string;
}

export interface SetNoteTierServiceDto {
  noteId: string;
  userId: string;
  tier: NoteTier;
}

export interface DeleteNoteServiceDto {
  noteId: string;
  userId: string;
}

export type DbNote = {
  id: string;
  createdAt: Date;
  tier: NoteTier | null;
  textNote: { content: string } | null;
};
