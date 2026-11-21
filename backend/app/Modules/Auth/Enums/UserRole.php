<?php

namespace App\Modules\Auth\Enums;

enum UserRole: string
{
    case Customer = 'customer';
    case Admin = 'admin';
    case Warehouse = 'warehouse';

    /**
     * @return array<int, self>
     */
    public static function staff(): array
    {
        return [self::Admin, self::Warehouse];
    }

    public function label(): string
    {
        return match ($this) {
            self::Customer => 'Pelanggan',
            self::Admin => 'Administrator',
            self::Warehouse => 'Staf Gudang',
        };
    }
}
