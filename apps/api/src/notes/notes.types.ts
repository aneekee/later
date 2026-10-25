export interface CheckNoteAccessServiceDto {
  noteId: string;
  userId: string;
}

export interface CreateNoteServiceDto {
  content: string;
  userId: string;
}

export interface SetNoteRatingServiceDto {
  noteId: string;
  userId: string;
  rating: number;
}

export interface DeleteNoteServiceDto {
  noteId: string;
  userId: string;
}

export type DbNote = {
  id: string;
  createdAt: Date;
  rating: number;
  textNote: { content: string } | null;
};
