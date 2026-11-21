<?php

namespace App\Modules\Feedback\Enums;

enum SizeFit: string
{
    case TooSmall = 'too_small';
    case Fit = 'fit';
    case TooLarge = 'too_large';

    public function label(): string
    {
        return match ($this) {
            self::TooSmall => 'Kekecilan',
            self::Fit => 'Pas / Sesuai',
            self::TooLarge => 'Kebesaran',
        };
    }
}
