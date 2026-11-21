<?php

namespace App\Modules\Order\Controllers;

use App\Models\Shipment;
use App\Modules\Order\Services\ShipmentTrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TrackingWebhookController
{
    public function __construct(private readonly ShipmentTrackingService $tracking) {}

    /**
     * Receive a courier manifest push and update the matching shipment.
     */
    public function handle(Request $request): JsonResponse
    {
        $expectedToken = (string) config('services.rajaongkir.webhook_token', '');
        $providedToken = (string) ($request->header('X-Webhook-Token') ?? $request->input('token', ''));

        if ($expectedToken === '' || ! hash_equals($expectedToken, $providedToken)) {
            Log::warning('Shipping webhook rejected: invalid token', [
                'tracking_number' => $request->input('tracking_number'),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Token webhook tidak valid.',
            ], 403);
        }

        $data = $request->validate([
            'courier_code' => ['required', 'string', 'max:50'],
            'tracking_number' => ['required', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:255'],
            'occurred_at' => ['nullable', 'string', 'max:50'],
            'history' => ['nullable', 'array'],
            'history.*.status' => ['nullable', 'string', 'max:50'],
            'history.*.description' => ['nullable', 'string', 'max:255'],
            'history.*.occurred_at' => ['nullable', 'string', 'max:50'],
        ]);

        $shipment = Shipment::query()
            ->where('tracking_number', $data['tracking_number'])
            ->whereRaw('lower(courier_code) = ?', [strtolower($data['courier_code'])])
            ->latest('created_at')
            ->first();

        if ($shipment === null) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengiriman dengan nomor resi tersebut tidak ditemukan.',
            ], 404);
        }

        $updated = $this->tracking->applyManifest($shipment, $data);

        return response()->json([
            'status' => 'success',
            'message' => 'Status pelacakan berhasil diperbarui.',
            'shipment_status' => $updated->status?->value,
            'order_status' => $updated->order?->status?->value,
        ]);
    }
}
