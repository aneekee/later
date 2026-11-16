import type {
  CreateNoteRequestBody,
  SetNoteTierRequestBody,
} from '@later/types';

export interface CreateNoteParams {
  body: CreateNoteRequestBody;
}

export interface SetNoteTierParams {
  noteId: string;
  body: SetNoteTierRequestBody;
}

export interface DeleteNoteParams {
  noteId: string;
}
