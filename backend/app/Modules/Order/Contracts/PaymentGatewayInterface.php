<?php

namespace App\Modules\Order\Contracts;

use App\Models\Order;
use App\Modules\Order\DTOs\PaymentNotificationResult;

interface PaymentGatewayInterface
{
    /**
     * Create a payment gateway transaction for an order (Snap Token / Payment URL).
     *
     * `token` and `redirect_url` are empty strings when `is_simulated` is true:
     * the gateway is not configured, so no real Midtrans URL exists.
     *
     * @return array{
     *     token: string,
     *     redirect_url: string,
     *     payment_gateway: string,
     *     is_simulated: bool
     * }
     */
    public function createTransaction(Order $order): array;

    /**
     * Process an incoming webhook notification payload.
     */
    public function handleNotification(array $payload): PaymentNotificationResult;

    /**
     * Verify whether the notification signature is authentic.
     */
    public function verifySignature(array $payload): bool;
}
