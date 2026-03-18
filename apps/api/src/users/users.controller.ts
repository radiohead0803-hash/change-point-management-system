import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('companies')
  @Roles(Role.ADMIN)
  findCompanies() {
    return this.usersService.findCompanies();
  }

  // 내 프로필 조회 (모든 역할 가능)
  @Get('me')
  getMyProfile(@Req() req: any) {
    return this.usersService.findOne(req.user.sub);
  }

  // 내 프로필 수정 (모든 역할 - 비밀번호, 이름, 팀, 직급, 전화번호)
  @Patch('me')
  updateMyProfile(@Req() req: any, @Body() body: {
    name?: string;
    password?: string;
    team?: string;
    position?: string;
    phone?: string;
  }) {
    return this.usersService.update(req.user.sub, body);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() body: {
    email: string;
    password: string;
    name: string;
    role: Role;
    companyId?: string;
    team?: string;
    position?: string;
    phone?: string;
  }) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() body: {
    name?: string;
    role?: Role;
    companyId?: string;
    password?: string;
    team?: string;
    position?: string;
    phone?: string;
  }) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
