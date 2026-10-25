import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

import {
  CheckNoteAccessServiceDto,
  CreateNoteServiceDto,
  DeleteNoteServiceDto,
  SetNoteRatingServiceDto,
} from './notes.types';
import { NOTE_SELECT, mapToNoteEntity } from './notes.utils';

@Injectable()
export class NotesService {
  constructor(private prismaService: PrismaService) {}

  async checkNoteAccess(dto: CheckNoteAccessServiceDto) {
    const note = await this.prismaService.message.findUnique({
      where: { id: dto.noteId, userId: dto.userId },
    });

    if (!note) {
      throw new ForbiddenException("You don't have access to this note");
    }
  }

  /**
   * Creates a note. It's created as seen,
   * so the feed returns it at the end of the rotation
   */
  async createNote(dto: CreateNoteServiceDto) {
    const note = await this.prismaService.message.create({
      data: {
        type: 'TEXT',
        userId: dto.userId,
        chatId: null,
        seenAt: new Date(),
        textMessage: {
          create: { content: dto.content },
        },
      },
      select: NOTE_SELECT,
    });

    return mapToNoteEntity(note);
  }

  /**
   * Sets the absolute note rating
   */
  async setNoteRating(dto: SetNoteRatingServiceDto) {
    await this.checkNoteAccess({
      userId: dto.userId,
      noteId: dto.noteId,
    });

    return this.prismaService.message.update({
      where: { id: dto.noteId },
      data: { rating: dto.rating },
      select: { id: true, rating: true },
    });
  }

  async deleteNote(dto: DeleteNoteServiceDto) {
    await this.checkNoteAccess({
      userId: dto.userId,
      noteId: dto.noteId,
    });

    await this.prismaService.message.delete({
      where: { id: dto.noteId },
    });
  }
}
