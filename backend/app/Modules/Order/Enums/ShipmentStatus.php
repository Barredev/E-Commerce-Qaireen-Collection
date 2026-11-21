<?php

namespace App\Modules\Order\Enums;

enum ShipmentStatus: string
{
    case Pending = 'pending';
    case PickedUp = 'picked_up';
    case InTransit = 'in_transit';
    case Delivered = 'delivered';
    case Returned = 'returned';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu Pengiriman',
            self::PickedUp => 'Diambil Kurir',
            self::InTransit => 'Dalam Perjalanan',
            self::Delivered => 'Terkirim',
            self::Returned => 'Dikembalikan',
        };
    }
}
