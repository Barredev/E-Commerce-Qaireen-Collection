<?php

namespace App\Modules\Inventory\Enums;

enum MovementType: string
{
    case Receipt = 'receipt';
    case Sale = 'sale';
    case ReturnIn = 'return_in';
    case Adjustment = 'adjustment';
    case TransferOut = 'transfer_out';
    case TransferIn = 'transfer_in';

    public function label(): string
    {
        return match ($this) {
            self::Receipt => 'Penerimaan',
            self::Sale => 'Penjualan',
            self::ReturnIn => 'Retur Masuk',
            self::Adjustment => 'Penyesuaian',
            self::TransferOut => 'Transfer Keluar',
            self::TransferIn => 'Transfer Masuk',
        };
    }
}
