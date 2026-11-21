<?php

namespace App\Modules\Promotion\Enums;

enum PromotionAppliesTo: string
{
    case All = 'all';
    case Category = 'category';
    case Product = 'product';

    public function label(): string
    {
        return match ($this) {
            self::All => 'Semua Produk',
            self::Category => 'Kategori Tertentu',
            self::Product => 'Produk Tertentu',
        };
    }
}
