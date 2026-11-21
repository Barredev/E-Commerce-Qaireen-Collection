<?php

namespace App\Modules\Inventory\Enums;

enum ReceiptStatus: string
{
    case Draft = 'draft';
    case Confirmed = 'confirmed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draf',
            self::Confirmed => 'Terkonfirmasi',
            self::Cancelled => 'Dibatalkan',
        };
    }
}
