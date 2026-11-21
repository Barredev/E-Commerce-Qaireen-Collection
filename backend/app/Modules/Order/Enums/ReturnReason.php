<?php

namespace App\Modules\Order\Enums;

enum ReturnReason: string
{
    case WrongItem = 'wrong_item';
    case Damaged = 'damaged';
    case NotAsDescribed = 'not_as_described';
    case SizeMismatch = 'size_mismatch';
    case ChangedMind = 'changed_mind';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::WrongItem => 'Barang Salah Kirim',
            self::Damaged => 'Barang Rusak atau Cacat',
            self::NotAsDescribed => 'Tidak Sesuai Deskripsi',
            self::SizeMismatch => 'Ukuran Tidak Cocok',
            self::ChangedMind => 'Berubah Pikiran',
            self::Other => 'Lainnya',
        };
    }
}
