import { Controller, Get } from '@nestjs/common';

@Controller('todos')
export class TodosController {
  @Get()
  findAll() {
    return [
      { id: 1, title: 'Learn NestJS', completed: false },
      { id: 2, title: 'Build a REST API', completed: false },
    ];
  }
}
