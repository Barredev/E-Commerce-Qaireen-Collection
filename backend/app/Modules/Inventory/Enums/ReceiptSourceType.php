<?php

namespace App\Modules\Inventory\Enums;

enum ReceiptSourceType: string
{
    case Production = 'production';
    case Purchase = 'purchase';
    case Return = 'return';
    case TransferIn = 'transfer_in';

    public function label(): string
    {
        return match ($this) {
            self::Production => 'Hasil Produksi',
            self::Purchase => 'Pembelian',
            self::Return => 'Retur',
            self::TransferIn => 'Transfer Masuk',
        };
    }
}
