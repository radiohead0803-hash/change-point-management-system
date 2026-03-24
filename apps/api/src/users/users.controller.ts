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

  // 사용자 목록 조회 - 모든 로그인 사용자 접근 가능 (등록폼 승인자 선택에 필요)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // 회사 목록 조회 - 모든 로그인 사용자 접근 가능 (등록폼 협력사 선택에 필요)
  @Get('companies')
  findCompanies() {
    return this.usersService.findCompanies();
  }

  // 내 프로필 조회 (모든 역할 가능)
  @Get('me')
  getMyProfile(@Req() req: any) {
    return this.usersService.findOne(req.user.id);
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
    return this.usersService.update(req.user.id, body);
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
    email?: string;
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

  // ── Company CRUD ──

  @Post('companies')
  @Roles(Role.ADMIN)
  createCompany(@Body() body: { name: string; code: string; type: string }) {
    return this.usersService.createCompany(body);
  }

  @Patch('companies/:id')
  @Roles(Role.ADMIN)
  updateCompany(@Param('id') id: string, @Body() body: { name?: string; code?: string; type?: string }) {
    return this.usersService.updateCompany(id, body);
  }

  @Delete('companies/:id')
  @Roles(Role.ADMIN)
  deleteCompany(@Param('id') id: string) {
    return this.usersService.deleteCompany(id);
  }
}
