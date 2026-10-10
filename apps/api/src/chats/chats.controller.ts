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
import { type Request } from 'express';

import {
  CreateChatSuccessResponse,
  DeleteChatSuccessResponse,
  GetChatStatsSuccessResponse,
  ListChatsSuccessResponse,
  UpdateChatSuccessResponse,
} from '@later/types';

import { ChatsService } from './chats.service';
import {
  CreateChatDto,
  DeleteChatDto,
  ListChatsDto,
  UpdateChatDto,
} from './chats.dto';

@Controller('v1/chats')
export class ChatsController {
  constructor(private chatsService: ChatsService) {}

  @Get()
  async listChats(
    @Req() req: Request,
    @Query() listChatsDto: ListChatsDto,
  ): Promise<ListChatsSuccessResponse> {
    const userId = req['user']?.id as string;
    const { list, page, pageSize, totalSize } =
      await this.chatsService.listChats({
        page: listChatsDto.page,
        pageSize: listChatsDto.pageSize,
        search: listChatsDto.search,
        excludeId: listChatsDto.excludeId,
        userId,
      });

    return {
      message: 'Get chats successful',
      data: { list, page, pageSize, totalSize },
    };
  }

  @Post()
  async createChat(
    @Req() req: Request,
    @Body() createChatDto: CreateChatDto,
  ): Promise<CreateChatSuccessResponse> {
    const userId = req['user']?.id as string;
    const chat = await this.chatsService.createChat({
      title: createChatDto.title,
      userId,
    });

    return {
      message: 'Create chat successful',
      data: { chat },
    };
  }

  @Get(':id/stats')
  async getChatStats(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<GetChatStatsSuccessResponse> {
    const userId = req['user']?.id as string;
    const stats = await this.chatsService.getChatStats({
      chatId: id,
      userId,
    });

    return {
      message: 'Get chat stats successful',
      data: { stats },
    };
  }

  @Patch(':id')
  async updateChat(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateChatDto: UpdateChatDto,
  ): Promise<UpdateChatSuccessResponse> {
    const userId = req['user']?.id as string;
    const chat = await this.chatsService.updateChat(id, {
      title: updateChatDto.title,
      userId,
    });

    return {
      message: 'Update chat successful',
      data: { chat },
    };
  }

  @Delete(':id')
  async deleteChat(
    @Req() req: Request,
    @Param('id') id: string,
    @Query() deleteChatDto: DeleteChatDto,
  ): Promise<DeleteChatSuccessResponse> {
    const userId = req['user']?.id as string;

    if (deleteChatDto.targetChatId) {
      await this.chatsService.deleteChatAndMoveMessages({
        chatId: id,
        targetChatId: deleteChatDto.targetChatId,
        userId,
      });
    } else {
      await this.chatsService.deleteChat({
        chatId: id,
        userId,
      });
    }

    return {
      message: 'Delete chat successful',
    };
  }
}
