<?php

namespace App\Modules\Order\Enums;

enum ReturnStatus: string
{
    case Requested = 'requested';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Received = 'received';
    case Refunded = 'refunded';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Requested => 'Diajukan',
            self::Approved => 'Disetujui',
            self::Rejected => 'Ditolak',
            self::Received => 'Diterima Gudang',
            self::Refunded => 'Dana Dikembalikan',
            self::Cancelled => 'Dibatalkan',
        };
    }

    /**
     * Statuses that still occupy the return quota of an order item.
     *
     * @return array<int, self>
     */
    public static function active(): array
    {
        return [self::Requested, self::Approved, self::Received, self::Refunded];
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Rejected, self::Refunded, self::Cancelled], true);
    }
}
