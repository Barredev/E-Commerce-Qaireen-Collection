<?php

namespace App\Modules\Order\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Modules\Order\Enums\OrderStatus;
use App\Modules\Order\Enums\PaymentStatus;
use App\Modules\Order\Exceptions\PaymentGatewayException;
use App\Modules\Order\Services\MidtransPaymentGateway;
use App\Modules\Order\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentWebhookController extends Controller
{
    public function __construct(
        private readonly MidtransPaymentGateway $gateway,
        private readonly OrderService $orderService,
    ) {}

    /**
     * Handle incoming Midtrans Webhook Notification.
     */
    public function handleMidtrans(Request $request): JsonResponse
    {
        $payload = $request->all();

        Log::info('Midtrans Webhook Received', [
            'order_id' => $payload['order_id'] ?? null,
            'transaction_status' => $payload['transaction_status'] ?? null,
        ]);

        $result = $this->gateway->handleNotification($payload);

        if (! $result->isValid) {
            Log::warning('Midtrans Webhook Invalid Signature', ['order_id' => $result->orderNumber]);

            return response()->json([
                'status' => 'error',
                'message' => 'Tanda tangan transaksi tidak valid.',
            ], 403);
        }

        $order = Order::query()->where('order_number', $result->orderNumber)->first();

        if ($order === null) {
            Log::error('Midtrans Webhook Order Not Found', ['order_number' => $result->orderNumber]);

            return response()->json([
                'status' => 'error',
                'message' => 'Pesanan tidak ditemukan.',
            ], 404);
        }

        // Update payment record
        $payment = $order->payments()->latest()->first();
        if ($payment !== null) {
            $payment->update([
                'payment_gateway' => 'midtrans',
                'gateway_transaction_id' => $result->transactionId,
                'gateway_response' => $result->rawPayload,
                'payment_method' => $result->paymentType ?: $payment->payment_method,
                'status' => $result->status,
                'paid_at' => $result->paidAt,
            ]);
        }

        // Transition order state based on payment result
        if ($result->isSuccessful() && $order->status === OrderStatus::PendingPayment) {
            $this->orderService->transition($order, OrderStatus::Paid);
        } elseif (in_array($result->status, [PaymentStatus::Expired, PaymentStatus::Failed], true)) {
            if ($order->status === OrderStatus::PendingPayment) {
                $this->orderService->cancel(
                    $order,
                    $result->status === PaymentStatus::Expired
                        ? 'Pembayaran kedaluwarsa.'
                        : 'Pembayaran ditolak atau dibatalkan oleh gateway.'
                );
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Notifikasi pembayaran berhasil diproses.',
            'order_status' => $order->fresh()->status->value,
        ]);
    }

    /**
     * Generate payment token / Snap URL for an order (Customer endpoint).
     */
    public function createPaymentToken(Order $order): JsonResponse
    {
        if ($order->status !== OrderStatus::PendingPayment) {
            return response()->json([
                'message' => 'Pesanan ini sudah tidak membutuhkan pembayaran.',
            ], 422);
        }

        $payment = $order->payments()->latest()->first();

        $reusedToken = $this->reusableSnapToken($payment);

        if ($reusedToken !== null) {
            return response()->json([
                'data' => [
                    'token' => $reusedToken['snap_token'],
                    'redirect_url' => $reusedToken['snap_redirect_url'],
                    'payment_gateway' => $payment->payment_gateway ?? 'midtrans',
                    'is_simulated' => false,
                    'client_key' => $this->gateway->getClientKey(),
                    'is_production' => $this->gateway->isProduction(),
                ],
            ]);
        }

        try {
            $data = $this->gateway->createTransaction($order);
        } catch (PaymentGatewayException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 503);
        }

        if ($payment !== null) {
            $gatewayResponse = is_array($payment->gateway_response) ? $payment->gateway_response : [];

            $payment->update([
                'payment_gateway' => $data['payment_gateway'],
                'gateway_response' => array_merge($gatewayResponse, [
                    'snap_token' => $data['token'],
                    'snap_redirect_url' => $data['redirect_url'],
                ]),
            ]);
        }

        return response()->json([
            'data' => [
                'token' => $data['token'],
                'redirect_url' => $data['redirect_url'],
                'payment_gateway' => $data['payment_gateway'],
                'is_simulated' => $data['is_simulated'] ?? false,
                'client_key' => $this->gateway->getClientKey(),
                'is_production' => $this->gateway->isProduction(),
            ],
        ]);
    }

    /**
     * Reuse a still-valid Snap token so repeated clicks do not hit "order_id already used".
     *
     * @return array{snap_token: string, snap_redirect_url: string}|null
     */
    private function reusableSnapToken(?Payment $payment): ?array
    {
        if ($payment === null || $payment->status !== PaymentStatus::Pending) {
            return null;
        }

        if ($payment->expired_at !== null && $payment->expired_at->isPast()) {
            return null;
        }

        $response = $payment->gateway_response;

        if (! is_array($response)) {
            return null;
        }

        $token = (string) ($response['snap_token'] ?? '');
        $redirectUrl = (string) ($response['snap_redirect_url'] ?? '');

        if ($token === '') {
            return null;
        }

        return [
            'snap_token' => $token,
            'snap_redirect_url' => $redirectUrl,
        ];
    }

    /**
     * Sandbox Payment Simulator: Instant Pay for Demo/Testing.
     */
    public function simulatePayment(Order $order): JsonResponse
    {
        if (! $this->gateway->isSimulationMode()) {
            return response()->json([
                'message' => 'Simulator hanya tersedia saat gateway belum dikonfigurasi.',
            ], 403);
        }

        if ($order->status !== OrderStatus::PendingPayment) {
            return response()->json([
                'message' => 'Pesanan tidak dalam status menunggu pembayaran.',
            ], 422);
        }

        $simulatedPayload = [
            'order_id' => $order->order_number,
            'transaction_id' => 'SIM-'.strtoupper(substr(md5($order->order_number.now()), 0, 12)),
            'transaction_status' => 'settlement',
            'payment_type' => 'qris_simulated',
            'gross_amount' => (string) number_format((float) $order->grand_total, 2, '.', ''),
            'settlement_time' => now()->toDateTimeString(),
            'signature_key' => 'simulated_signature',
        ];

        $request = new Request($simulatedPayload);

        return $this->handleMidtrans($request);
    }
}
