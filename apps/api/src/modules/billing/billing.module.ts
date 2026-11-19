import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { BillingSequenceService } from './services/billing-sequence.service';
import { MemberLedgerService } from './services/member-ledger.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { DuesService } from './services/dues.service';
import { ReceiptService } from './services/receipt.service';
import { RenewalService } from './services/renewal.service';
import { RefundService } from './services/refund.service';
import { CashRegisterService } from './services/cash-register.service';
import { InvoiceController } from './controllers/invoice.controller';
import { PaymentController } from './controllers/payment.controller';
import { DuesController } from './controllers/dues.controller';
import { ReceiptController } from './controllers/receipt.controller';
import { RenewalController } from './controllers/renewal.controller';
import { RefundController } from './controllers/refund.controller';
import { CashRegisterController } from './controllers/cash-register.controller';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [
    InvoiceController,
    PaymentController,
    DuesController,
    ReceiptController,
    RenewalController,
    RefundController,
    CashRegisterController,
  ],
  providers: [
    BillingSequenceService,
    MemberLedgerService,
    InvoiceService,
    PaymentService,
    DuesService,
    ReceiptService,
    RenewalService,
    RefundService,
    CashRegisterService,
  ],
  exports: [
    BillingSequenceService,
    MemberLedgerService,
    InvoiceService,
    PaymentService,
    DuesService,
    ReceiptService,
    RenewalService,
    RefundService,
    CashRegisterService,
  ],
})
export class BillingModule {}
