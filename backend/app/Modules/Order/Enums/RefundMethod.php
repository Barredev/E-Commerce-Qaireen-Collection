<?php

namespace App\Modules\Order\Enums;

enum RefundMethod: string
{
    case BankTransfer = 'bank_transfer';
    case EWallet = 'ewallet';
    case StoreCredit = 'store_credit';
    case OriginalPayment = 'original_payment';

    public function label(): string
    {
        return match ($this) {
            self::BankTransfer => 'Transfer Bank',
            self::EWallet => 'Dompet Digital',
            self::StoreCredit => 'Saldo Toko',
            self::OriginalPayment => 'Metode Pembayaran Asli',
        };
    }
}
