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
  ListChatsSuccessResponse,
  UpdateChatSuccessResponse,
} from '@repo/types';

import { ChatsService } from './chats.service';
import { CreateChatDto, ListChatsDto, UpdateChatDto } from './chats.dto';

@Controller('v1/chats')
export class ChatsController {
  constructor(private chatsService: ChatsService) {}

  @Get()
  async getChats(
    @Req() req: Request,
    @Query() listChatsDto: ListChatsDto,
  ): Promise<ListChatsSuccessResponse> {
    const userId = req['user']?.id as string;
    const { list, page, pageSize, totalSize } =
      await this.chatsService.listChats({
        page: listChatsDto.page,
        pageSize: listChatsDto.pageSize,
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
      icon: createChatDto.icon,
      userId,
    });

    return {
      message: 'Create chat successful',
      data: { chat },
    };
  }

  @Patch(':id')
  async updateChat(
    @Param('id') id: string,
    @Body() updateChatDto: UpdateChatDto,
  ): Promise<UpdateChatSuccessResponse> {
    const chat = await this.chatsService.updateChat(id, {
      title: updateChatDto.title,
      icon: updateChatDto.icon,
    });

    return {
      message: 'Update chat successful',
      data: { chat },
    };
  }

  @Delete(':id')
  async deleteChat(
    @Param('id') id: string,
  ): Promise<DeleteChatSuccessResponse> {
    await this.chatsService.deleteChat(id);

    return {
      message: 'Delete chat successful',
    };
  }
}
