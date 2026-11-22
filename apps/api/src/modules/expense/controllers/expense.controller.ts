import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole, ExpenseStatus } from '@fitnexa/shared';
import { ExpenseService } from '../services/expense.service';
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  ApproveExpenseDto,
} from '../dto/expense.dto';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get('categories')
  async getCategories(@CurrentUser() user: any) {
    return this.expenseService.getCategories(user.tenantId);
  }

  @Post('categories')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async createCategory(
    @CurrentUser() user: any,
    @Body() dto: CreateExpenseCategoryDto,
  ) {
    return this.expenseService.createCategory(user.tenantId, dto);
  }

  @Get()
  async getExpenses(
    @CurrentUser() user: any,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: ExpenseStatus,
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const scopedBranchId = [UserRole.GYM_OWNER, UserRole.SUPER_ADMIN].includes(user.role)
      ? branchId
      : (branchId || user.branchId);
    return this.expenseService.getExpenses(user.tenantId, {
      categoryId,
      status,
      branchId: scopedBranchId,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post()
  async createExpense(
    @CurrentUser() user: any,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenseService.createExpense(user.tenantId, user.userId, user.role, dto);
  }

  @Patch(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER)
  async approveExpense(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ApproveExpenseDto,
  ) {
    return this.expenseService.approveExpense(user.tenantId, id, user.userId, dto);
  }
}
