import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  CreateNoteSuccessResponse,
  DeleteNoteSuccessResponse,
  SetNoteTierSuccessResponse,
} from '@later/types';

import { NotesService } from './notes.service';
import { CreateNoteDto, SetNoteTierDto } from './notes.dto';

@Controller('v1/notes')
export class NotesController {
  constructor(private notesService: NotesService) {}

  @Post()
  async createNote(
    @Req() req: Request,
    @Body() dto: CreateNoteDto,
  ): Promise<CreateNoteSuccessResponse> {
    const userId = req['user']?.id as string;

    const note = await this.notesService.createNote({
      userId,
      content: dto.content,
    });

    return {
      message: 'Create note successful',
      data: note,
    };
  }

  @Put(':noteId/tier')
  async setNoteTier(
    @Req() req: Request,
    @Param('noteId') noteId: string,
    @Body() dto: SetNoteTierDto,
  ): Promise<SetNoteTierSuccessResponse> {
    const userId = req['user']?.id as string;

    const tier = await this.notesService.setNoteTier({
      userId,
      noteId,
      tier: dto.tier,
    });

    return {
      message: 'Note tier update successful',
      data: tier,
    };
  }

  @Delete(':noteId')
  async deleteNote(
    @Req() req: Request,
    @Param('noteId') noteId: string,
  ): Promise<DeleteNoteSuccessResponse> {
    const userId = req['user']?.id as string;

    await this.notesService.deleteNote({
      userId,
      noteId,
    });

    return {
      message: 'Delete note successful',
    };
  }
}
