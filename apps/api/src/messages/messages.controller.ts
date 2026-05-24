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
  ListResolvedMessagesSuccessResponse,
  ResolveMessageSuccessResponse,
  UnresolveMessageSuccessResponse,
  UpdateTextMessageSuccessResponse,
} from '@later/types';

import { MessagesService } from './messages.service';
import {
  CreateTextMessageDto,
  ListMessagesDto,
  ListResolvedMessagesDto,
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
        resolution: listMessagesDto.resolution,
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

  @Get('/resolved')
  async listResolvedMessages(
    @Req() req: Request,
    @Query() dto: ListResolvedMessagesDto,
  ): Promise<ListResolvedMessagesSuccessResponse> {
    const userId = req['user']?.id as string;

    const { list, page, pageSize, totalSize } =
      await this.messagesService.listResolvedMessages({
        page: dto.page,
        pageSize: dto.pageSize,
        userId,
      });

    return {
      message: 'Get resolved messages successful',
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

  @Patch('/text/:messageId')
  async updateTextMessage(
    @Req() req: Request,
    @Param('messageId') messageId: string,
    @Param('chatId') chatId: string,
    @Body() dto: UpdateTextMessageDto,
  ): Promise<UpdateTextMessageSuccessResponse> {
    const userId = req['user']?.id as string;

    const message = await this.messagesService.updateTextMessage({
      messageId,
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

  @Put('/:messageId/resolution')
  async resolveMessage(
    @Req() req: Request,
    @Param('messageId') messageId: string,
    @Param('chatId') chatId: string,
    @Body() dto: ResolveMessageDto,
  ): Promise<ResolveMessageSuccessResponse> {
    const userId = req['user']?.id as string;

    await this.messagesService.resolveMessage({
      messageId,
      userId,
      chatId,
      note: dto.note,
    });

    return {
      message: 'Message resolve successful',
    };
  }
  @Delete('/:messageId/resolution/:resolutionId')
  async unresolveMessage(
    @Req() req: Request,
    @Param('resolutionId') resolutionId: string,
    @Param('messageId') messageId: string,
    @Param('chatId') chatId: string,
  ): Promise<UnresolveMessageSuccessResponse> {
    const userId = req['user']?.id as string;

    await this.messagesService.unresolveMessage({
      messageId,
      userId,
      chatId,
      resolutionId,
    });

    return {
      message: 'Messaage unresolve successful',
    };
  }

  @Delete(':messageId')
  async deleteMessage(
    @Req() req: Request,
    @Param('messageId') messageId: string,
    @Param('chatId') chatId: string,
  ): Promise<DeleteMessageSuccessResponse> {
    const userId = req['user']?.id as string;

    await this.messagesService.deleteMessage({
      messageId,
      chatId,
      userId,
    });

    return {
      message: 'Delete message successful',
    };
  }
}
