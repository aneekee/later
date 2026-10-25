import type {
  CreateNoteRequestBody,
  SetNoteRatingRequestBody,
} from '@later/types';

export interface CreateNoteParams {
  body: CreateNoteRequestBody;
}

export interface SetNoteRatingParams {
  noteId: string;
  body: SetNoteRatingRequestBody;
}

export interface DeleteNoteParams {
  noteId: string;
}
