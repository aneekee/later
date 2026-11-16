import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

import {
  CheckNoteAccessServiceDto,
  CreateNoteServiceDto,
  DeleteNoteServiceDto,
  SetNoteTierServiceDto,
} from './notes.types';
import { NOTE_SELECT, mapToNoteEntity } from './notes.utils';

@Injectable()
export class NotesService {
  constructor(private prismaService: PrismaService) {}

  async checkNoteAccess(dto: CheckNoteAccessServiceDto) {
    const note = await this.prismaService.note.findUnique({
      where: { id: dto.noteId, userId: dto.userId },
    });

    if (!note) {
      throw new ForbiddenException("You don't have access to this note");
    }
  }

  /**
   * Creates a note. It's created as seen at tier D,
   * so the feed returns it at the end of the rotation
   */
  async createNote(dto: CreateNoteServiceDto) {
    const note = await this.prismaService.note.create({
      data: {
        type: 'TEXT',
        userId: dto.userId,
        seenAt: new Date(),
        tier: 'D',
        textNote: {
          create: { content: dto.content },
        },
      },
      select: NOTE_SELECT,
    });

    return mapToNoteEntity(note);
  }

  /**
   * Sets the note tier, returns it with NULL read as D
   */
  async setNoteTier(dto: SetNoteTierServiceDto) {
    await this.checkNoteAccess({
      userId: dto.userId,
      noteId: dto.noteId,
    });

    const note = await this.prismaService.note.update({
      where: { id: dto.noteId },
      data: { tier: dto.tier },
      select: { id: true, tier: true },
    });

    return { id: note.id, tier: note.tier ?? 'D' };
  }

  async deleteNote(dto: DeleteNoteServiceDto) {
    await this.checkNoteAccess({
      userId: dto.userId,
      noteId: dto.noteId,
    });

    await this.prismaService.note.delete({
      where: { id: dto.noteId },
    });
  }
}
