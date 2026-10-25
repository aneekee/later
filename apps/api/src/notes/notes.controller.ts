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
  SetNoteRatingSuccessResponse,
} from '@later/types';

import { NotesService } from './notes.service';
import { CreateNoteDto, SetNoteRatingDto } from './notes.dto';

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

  @Put(':noteId/rating')
  async setNoteRating(
    @Req() req: Request,
    @Param('noteId') noteId: string,
    @Body() dto: SetNoteRatingDto,
  ): Promise<SetNoteRatingSuccessResponse> {
    const userId = req['user']?.id as string;

    const rating = await this.notesService.setNoteRating({
      userId,
      noteId,
      rating: dto.rating,
    });

    return {
      message: 'Note rating update successful',
      data: rating,
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
