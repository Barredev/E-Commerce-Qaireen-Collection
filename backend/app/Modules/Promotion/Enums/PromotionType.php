<?php

namespace App\Modules\Promotion\Enums;

enum PromotionType: string
{
    case Percentage = 'percentage';
    case FixedAmount = 'fixed_amount';
    case FreeShipping = 'free_shipping';

    public function label(): string
    {
        return match ($this) {
            self::Percentage => 'Persentase (%)',
            self::FixedAmount => 'Potongan Tetap (Rp)',
            self::FreeShipping => 'Gratis Ongkir',
        };
    }
}
