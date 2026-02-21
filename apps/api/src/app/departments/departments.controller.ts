import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '@task-management/auth';
import { CreateDepartmentDto, UpdateDepartmentDto } from '@task-management/data';

import { User } from '../entities/user.entity';
import { DepartmentsService } from './departments.service';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly deptsService: DepartmentsService) {}

  /** POST /api/departments — Owner only. */
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateDepartmentDto) {
    return this.deptsService.create(user, dto);
  }

  /** GET /api/departments — scoped by user role. */
  @Get()
  findAll(@CurrentUser() user: User) {
    return this.deptsService.findAll(user);
  }

  /** PUT /api/departments/:id — Owner only. */
  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.deptsService.update(user, id, dto);
  }

  /** DELETE /api/departments/:id — Owner only. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.deptsService.remove(user, id);
  }
}
