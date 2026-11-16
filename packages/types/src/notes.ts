import type { BaseSuccessResponse } from "./shared";

/**
 * A note's grade, S is the highest. Each app keeps a Record<NoteTier, …>,
 * so adding a tier fails type checks until both apps handle it
 */
export type NoteTier = "S" | "A" | "B" | "C" | "D";

export type NoteEntity = {
  id: string;
  content: string;
  createdAt: string;
  tier: NoteTier;
};

// create note

export interface CreateNoteRequestBody {
  content: string;
}

export interface CreateNoteSuccessResponse extends BaseSuccessResponse<NoteEntity> {}

// set note tier

export interface SetNoteTierRequestBody {
  tier: NoteTier;
}

export type NoteTierEntity = {
  id: string;
  tier: NoteTier;
};

export interface SetNoteTierSuccessResponse extends BaseSuccessResponse<NoteTierEntity> {}

// delete note

export interface DeleteNoteSuccessResponse extends BaseSuccessResponse {}
