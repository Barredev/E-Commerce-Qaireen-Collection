<?php

namespace App\Modules\Order\Exceptions;

use RuntimeException;

class PaymentGatewayException extends RuntimeException
{
    public function __construct(string $message = 'Gateway pembayaran sedang tidak dapat dihubungi. Coba lagi beberapa saat lagi.')
    {
        parent::__construct($message);
    }
}
