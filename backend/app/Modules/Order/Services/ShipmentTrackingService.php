<?php

namespace App\Modules\Order\Services;

use App\Models\Shipment;
use App\Modules\Order\Contracts\ShippingProviderInterface;
use App\Modules\Order\Enums\OrderStatus;
use App\Modules\Order\Enums\ShipmentStatus;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Keeps a shipment's manifest timeline in sync with the courier.
 *
 * The same normalisation is used for webhook pushes and for pulls against
 * the RajaOngkir waybill endpoint, so both paths update the order identically.
 */
class ShipmentTrackingService
{
    public function __construct(
        private readonly ShippingProviderInterface $provider,
        private readonly OrderService $orders,
    ) {}

    /**
     * @param  array{
     *     status?: string|null,
     *     description?: string|null,
     *     occurred_at?: string|null,
     *     history?: array<int, array{
     *         status?: string|null,
     *         description?: string|null,
     *         occurred_at?: string|null
     *     }>
     * }  $payload
     */
    public function applyManifest(Shipment $shipment, array $payload): Shipment
    {
        return DB::transaction(function () use ($shipment, $payload): Shipment {
            $locked = Shipment::query()->lockForUpdate()->findOrFail($shipment->id);

            $history = (array) ($locked->tracking_history ?? []);

            foreach ((array) ($payload['history'] ?? []) as $entry) {
                $this->appendHistory($history, [
                    'status' => $this->statusValue($entry['status'] ?? null),
                    'description' => trim((string) ($entry['description'] ?? '')),
                    'occurred_at' => $this->timestamp($entry['occurred_at'] ?? null),
                ]);
            }

            $status = $this->forwardStatus($locked->status, $this->mapStatus($payload['status'] ?? null));

            if ($status !== $locked->status) {
                $this->appendHistory($history, [
                    'status' => $status->value,
                    'description' => trim((string) ($payload['description'] ?? $status->label())),
                    'occurred_at' => $this->timestamp($payload['occurred_at'] ?? null),
                ]);
            }

            $attributes = [
                'tracking_history' => $history,
                'last_tracked_at' => now(),
            ];

            if ($status !== $locked->status) {
                $attributes['status'] = $status;
            }

            if ($status === ShipmentStatus::Delivered && $locked->delivered_at === null) {
                $attributes['delivered_at'] = now();
            }

            $locked->update($attributes);

            $this->syncOrderStatus($locked);

            // The order status may have advanced, so drop the cached relation
            // before handing the shipment back to the caller.
            $locked->unsetRelation('order');

            return $locked->refresh();
        });
    }

    /**
     * Pull the latest manifest from the shipping provider.
     */
    public function refreshFromProvider(Shipment $shipment): Shipment
    {
        $trackingNumber = (string) ($shipment->tracking_number ?? '');

        if ($trackingNumber === '') {
            throw ValidationException::withMessages([
                'tracking_number' => ['Nomor resi belum tersedia untuk dilacak.'],
            ]);
        }

        $result = $this->provider->track((string) $shipment->courier_code, $trackingNumber);

        return $this->applyManifest($shipment, [
            'status' => $result['status'],
            'history' => $result['history'],
        ]);
    }

    /**
     * @param  array<int, array{status: string|null, description: string, occurred_at: string|null}>  $history
     * @param  array{status: string|null, description: string, occurred_at: string|null}  $entry
     */
    private function appendHistory(array &$history, array $entry): void
    {
        if ($entry['description'] === '' && $entry['status'] === null) {
            return;
        }

        foreach ($history as $existing) {
            if (($existing['status'] ?? null) === $entry['status']
                && ($existing['description'] ?? null) === $entry['description']
                && ($existing['occurred_at'] ?? null) === $entry['occurred_at']) {
                return;
            }
        }

        $history[] = $entry;
    }

    /**
     * A shipment never moves backwards in the delivery funnel.
     */
    private function forwardStatus(ShipmentStatus $current, ?ShipmentStatus $candidate): ShipmentStatus
    {
        if ($candidate === null) {
            return $current;
        }

        return $this->rank($candidate) >= $this->rank($current) ? $candidate : $current;
    }

    private function rank(ShipmentStatus $status): int
    {
        return match ($status) {
            ShipmentStatus::Pending => 0,
            ShipmentStatus::PickedUp => 1,
            ShipmentStatus::InTransit => 2,
            ShipmentStatus::Delivered, ShipmentStatus::Returned => 3,
        };
    }

    private function mapStatus(mixed $status): ?ShipmentStatus
    {
        return match (strtolower(trim((string) $status))) {
            'delivered', 'terkirim', 'diterima' => ShipmentStatus::Delivered,
            'in_transit', 'transit', 'dalam_perjalanan' => ShipmentStatus::InTransit,
            'picked_up', 'picked', 'diambil' => ShipmentStatus::PickedUp,
            'returned', 'retur', 'dikembalikan' => ShipmentStatus::Returned,
            default => null,
        };
    }

    private function statusValue(mixed $status): ?string
    {
        return $this->mapStatus($status)?->value;
    }

    private function timestamp(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Carbon::parse((string) $value)->toIso8601String();
        } catch (\Throwable) {
            return null;
        }
    }

    private function syncOrderStatus(Shipment $shipment): void
    {
        if ($shipment->status !== ShipmentStatus::Delivered) {
            return;
        }

        $order = $shipment->order;

        if ($order === null || $order->status !== OrderStatus::Shipped) {
            return;
        }

        $this->orders->transition($order, OrderStatus::Delivered);
    }
}
