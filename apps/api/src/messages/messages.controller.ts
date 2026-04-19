import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { MessagesService } from './messages.service';
import {
  CreateTextMessageDto,
  ListMessagesDto,
  UpdateTextMessageDto,
} from './messages.dto';

@Controller('v1/chats/:chatId/messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  async getMessages(
    @Req() req: Request,
    @Param('chatId') chatId: string,
    @Query() listMessagesDto: ListMessagesDto,
  ) {
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
  ) {
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
  ) {
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

  @Delete(':id')
  async deleteMessage(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('chatId') chatId: string,
  ) {
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
