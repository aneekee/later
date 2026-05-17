import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  CreateTextMessageSuccessResponse,
  DeleteMessageSuccessResponse,
  ListMessagesSuccessResponse,
  ResolveMessageSuccessResponse,
  UpdateTextMessageSuccessResponse,
} from '@later/types';

import { MessagesService } from './messages.service';
import {
  CreateTextMessageDto,
  ListMessagesDto,
  ResolveMessageDto,
  UpdateTextMessageDto,
} from './messages.dto';

@Controller('v1/chats/:chatId/messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  async listMessages(
    @Req() req: Request,
    @Param('chatId') chatId: string,
    @Query() listMessagesDto: ListMessagesDto,
  ): Promise<ListMessagesSuccessResponse> {
    // TODO: move the "const userId = req['user']?.id as string;" to a decorator?
    const userId = req['user']?.id as string;

    const { list, page, pageSize, totalSize } =
      await this.messagesService.listMessages({
        page: listMessagesDto.page,
        pageSize: listMessagesDto.pageSize,
        chatId,
        userId,
      });

    return {
      message: 'Get messagess successful',
      data: {
        list,
        page,
        pageSize,
        totalSize,
      },
    };
  }

  @Post('/text')
  async createTextMessage(
    @Req() req: Request,
    @Param('chatId') chatId: string,
    @Body() body: CreateTextMessageDto,
  ): Promise<CreateTextMessageSuccessResponse> {
    const userId = req['user']?.id as string;

    const message = await this.messagesService.createTextMessage({
      content: body.content,
      chatId,
      userId,
    });

    return {
      message: 'Create text message successful',
      data: {
        message,
      },
    };
  }

  @Patch('/text/:id')
  async updateTextMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('chatId') chatId: string,
    @Body() dto: UpdateTextMessageDto,
  ): Promise<UpdateTextMessageSuccessResponse> {
    const userId = req['user']?.id as string;

    const message = await this.messagesService.updateTextMessage({
      messageId: id,
      userId,
      chatId,
      content: dto.content,
    });

    return {
      message: 'Update text message successful',
      data: {
        message,
      },
    };
  }

  @Put('/:id/resolution')
  async resolveMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('chatId') chatId: string,
    @Body() dto: ResolveMessageDto,
  ): Promise<ResolveMessageSuccessResponse> {
    const userId = req['user']?.id as string;

    await this.messagesService.resolveMessage({
      messageId: id,
      userId,
      chatId,
      note: dto.note,
    });

    return {
      message: '',
    };
  }

  @Delete(':id')
  async deleteMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('chatId') chatId: string,
  ): Promise<DeleteMessageSuccessResponse> {
    const userId = req['user']?.id as string;

    await this.messagesService.deleteMessage({
      messageId: id,
      chatId,
      userId,
    });

    return {
      message: 'Delete message successful',
    };
  }
}
