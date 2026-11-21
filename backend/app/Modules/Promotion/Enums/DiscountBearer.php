<?php

namespace App\Modules\Promotion\Enums;

enum DiscountBearer: string
{
    case Platform = 'platform';
    case Shared = 'shared';

    public function label(): string
    {
        return match ($this) {
            self::Platform => 'Ditanggung Toko',
            self::Shared => 'Bagi Dua (50% : 50%)',
        };
    }
}
