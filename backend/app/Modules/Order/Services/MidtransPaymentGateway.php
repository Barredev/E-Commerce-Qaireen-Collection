<?php

namespace App\Modules\Order\Services;

use App\Models\Order;
use App\Modules\Order\Contracts\PaymentGatewayInterface;
use App\Modules\Order\DTOs\PaymentNotificationResult;
use App\Modules\Order\Enums\PaymentStatus;
use App\Modules\Order\Exceptions\PaymentGatewayException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MidtransPaymentGateway implements PaymentGatewayInterface
{
    private string $serverKey;

    private string $clientKey;

    private bool $isProduction;

    private string $finishUrl;

    public function __construct()
    {
        $this->serverKey = (string) config('services.midtrans.server_key', '');
        $this->clientKey = (string) config('services.midtrans.client_key', '');
        $this->isProduction = (bool) config('services.midtrans.is_production', false);
        $this->finishUrl = rtrim((string) config('services.midtrans.finish_url', ''), '/');
    }

    public function getClientKey(): string
    {
        return $this->clientKey;
    }

    public function isProduction(): bool
    {
        return $this->isProduction;
    }

    public function isSimulationMode(): bool
    {
        return empty($this->serverKey)
            || str_starts_with($this->serverKey, 'SB-Mid-server-demo');
    }

    public function createTransaction(Order $order): array
    {
        $order->loadMissing(['items', 'user']);

        if ($this->isSimulationMode()) {
            return [
                'token' => '',
                'redirect_url' => '',
                'payment_gateway' => 'midtrans_simulated',
                'is_simulated' => true,
            ];
        }

        $baseUrl = $this->isProduction
            ? 'https://app.midtrans.com/snap/v1/transactions'
            : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

        $payload = [
            'transaction_details' => [
                'order_id' => $order->order_number,
                'gross_amount' => (int) round($order->grand_total),
            ],
            'customer_details' => [
                'first_name' => $order->shipping_name,
                'email' => $order->user?->email ?? 'guest@example.com',
                'phone' => $order->shipping_phone,
            ],
            'item_details' => $this->buildItemDetails($order),
            'callbacks' => [
                'finish' => $this->finishUrl.'/account/orders/'.$order->order_number,
                'unfinish' => $this->finishUrl.'/account/orders/'.$order->order_number,
                'error' => $this->finishUrl.'/account/orders/'.$order->order_number,
            ],
        ];

        try {
            $response = Http::withBasicAuth($this->serverKey, '')
                ->acceptJson()
                ->asJson()
                ->timeout(15)
                ->post($baseUrl, $payload);
        } catch (\Throwable $e) {
            Log::error('Midtrans Request Exception', [
                'order' => $order->order_number,
                'message' => $e->getMessage(),
            ]);

            throw new PaymentGatewayException;
        }

        if (! $response->successful()) {
            Log::error('Midtrans Snap Error', [
                'status' => $response->status(),
                'response' => $response->body(),
                'order' => $order->order_number,
            ]);

            throw new PaymentGatewayException;
        }

        $data = $response->json();
        $token = (string) ($data['token'] ?? '');
        $redirectUrl = (string) ($data['redirect_url'] ?? '');

        if ($token === '') {
            Log::error('Midtrans Snap Error: token kosong pada respons', [
                'order' => $order->order_number,
            ]);

            throw new PaymentGatewayException;
        }

        return [
            'token' => $token,
            'redirect_url' => $redirectUrl,
            'payment_gateway' => 'midtrans',
            'is_simulated' => false,
        ];
    }

    /**
     * @return array<int, array{id: string, price: int, quantity: int, name: string}>
     */
    private function buildItemDetails(Order $order): array
    {
        $items = [];

        foreach ($order->items as $item) {
            $items[] = [
                'id' => mb_substr($item->variant_sku ?? (string) $item->id, 0, 50),
                'price' => (int) round($item->unit_price),
                'quantity' => (int) $item->quantity,
                'name' => mb_substr($item->product_name, 0, 50),
            ];
        }

        if ($order->shipping_cost > 0) {
            $items[] = [
                'id' => 'SHIPPING',
                'price' => (int) round($order->shipping_cost),
                'quantity' => 1,
                'name' => 'Ongkos Kirim',
            ];
        }

        if ($order->discount_total > 0) {
            $items[] = [
                'id' => 'DISCOUNT',
                'price' => (int) -round($order->discount_total),
                'quantity' => 1,
                'name' => 'Diskon Kupon Promosi',
            ];
        }

        $grossAmount = (int) round($order->grand_total);
        $itemsTotal = array_sum(array_map(
            fn (array $item): int => $item['price'] * $item['quantity'],
            $items,
        ));

        if ($itemsTotal !== $grossAmount) {
            $items[] = [
                'id' => 'ADJUSTMENT',
                'price' => $grossAmount - $itemsTotal,
                'quantity' => 1,
                'name' => 'Penyesuaian',
            ];
        }

        return $items;
    }

    public function verifySignature(array $payload): bool
    {
        if ($this->isSimulationMode()) {
            return true;
        }

        $orderId = (string) ($payload['order_id'] ?? '');
        $statusCode = (string) ($payload['status_code'] ?? '');
        $grossAmount = (string) ($payload['gross_amount'] ?? '');
        $signatureKey = (string) ($payload['signature_key'] ?? '');

        if (empty($orderId) || empty($statusCode) || empty($grossAmount) || empty($signatureKey)) {
            return false;
        }

        $expected = hash('sha512', $orderId.$statusCode.$grossAmount.$this->serverKey);

        return hash_equals($expected, $signatureKey);
    }

    public function handleNotification(array $payload): PaymentNotificationResult
    {
        $isValid = $this->verifySignature($payload);
        $orderId = (string) ($payload['order_id'] ?? '');
        $transactionId = (string) ($payload['transaction_id'] ?? 'TRX-'.uniqid());
        $paymentType = (string) ($payload['payment_type'] ?? 'unknown');
        $grossAmount = (float) ($payload['gross_amount'] ?? 0.0);
        $transactionStatus = (string) ($payload['transaction_status'] ?? '');
        $fraudStatus = (string) ($payload['fraud_status'] ?? 'accept');
        $settlementTime = $payload['settlement_time'] ?? null;

        $paidAt = null;
        if (! empty($settlementTime)) {
            try {
                $paidAt = Carbon::parse($settlementTime);
            } catch (\Throwable) {
                $paidAt = now();
            }
        }

        $status = match ($transactionStatus) {
            'capture' => ($fraudStatus === 'challenge') ? PaymentStatus::Pending : PaymentStatus::Paid,
            'settlement' => PaymentStatus::Paid,
            'pending' => PaymentStatus::Pending,
            'deny', 'cancel' => PaymentStatus::Failed,
            'expire' => PaymentStatus::Expired,
            'refund', 'partial_refund' => PaymentStatus::Refunded,
            default => PaymentStatus::Pending,
        };

        if ($status === PaymentStatus::Paid && $paidAt === null) {
            $paidAt = now();
        }

        return new PaymentNotificationResult(
            orderNumber: $orderId,
            transactionId: $transactionId,
            paymentType: $paymentType,
            status: $status,
            grossAmount: $grossAmount,
            paidAt: $paidAt,
            rawPayload: $payload,
            isValid: $isValid,
            message: "Status transaksi Midtrans: {$transactionStatus}",
        );
    }
}
