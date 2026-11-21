<?php

namespace App\Modules\Order\DTOs;

use App\Modules\Order\Enums\PaymentStatus;
use DateTimeInterface;

readonly class PaymentNotificationResult
{
    /**
     * @param  array<string, mixed>  $rawPayload
     */
    public function __construct(
        public string $orderNumber,
        public string $transactionId,
        public string $paymentType,
        public PaymentStatus $status,
        public float $grossAmount,
        public ?DateTimeInterface $paidAt = null,
        public array $rawPayload = [],
        public bool $isValid = true,
        public ?string $message = null,
    ) {}

    public function isSuccessful(): bool
    {
        return $this->isValid && $this->status === PaymentStatus::Paid;
    }
}
