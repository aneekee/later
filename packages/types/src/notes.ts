import type { BaseSuccessResponse } from "./shared";

export type NoteEntity = {
  id: string;
  content: string;
  createdAt: string;
  rating: number;
};

// create note

export interface CreateNoteRequestBody {
  content: string;
}

export interface CreateNoteSuccessResponse extends BaseSuccessResponse<NoteEntity> {}

// set note rating

export interface SetNoteRatingRequestBody {
  rating: number;
}

export type NoteRatingEntity = {
  id: string;
  rating: number;
};

export interface SetNoteRatingSuccessResponse extends BaseSuccessResponse<NoteRatingEntity> {}

// delete note

export interface DeleteNoteSuccessResponse extends BaseSuccessResponse {}
