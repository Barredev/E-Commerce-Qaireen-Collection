<?php

namespace App\Modules\Order\Services;

use App\Models\InventoryStock;
use App\Models\Order;
use App\Models\OrderItem;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Services\StockService;
use App\Modules\Order\Enums\OrderStatus;
use App\Modules\Order\Enums\PaymentStatus;
use App\Modules\Order\Enums\ShipmentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(private readonly StockService $stock) {}

    /**
     * Move an order to a new status, applying the matching stock side effects.
     */
    public function transition(Order $order, OrderStatus $status, ?string $reason = null): Order
    {
        return DB::transaction(function () use ($order, $status, $reason): Order {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);

            if (! $this->canTransition($locked->status, $status)) {
                throw ValidationException::withMessages([
                    'status' => ["Status pesanan tidak dapat diubah dari {$locked->status->label()} menjadi {$status->label()}."],
                ]);
            }

            match ($status) {
                OrderStatus::Paid => $this->applyPaid($locked),
                OrderStatus::Shipped => $locked->update(['shipped_at' => $locked->shipped_at ?? now()]),
                OrderStatus::Delivered => $this->applyDelivered($locked),
                OrderStatus::Completed => $locked->update(['completed_at' => now()]),
                OrderStatus::Cancelled => $this->applyCancelled($locked, $reason),
                OrderStatus::Refunded => $this->applyRefunded($locked),
                default => null,
            };

            $locked->update(['status' => $status]);

            return $locked->refresh()->load($this->relations());
        });
    }

    public function cancel(Order $order, ?string $reason = null): Order
    {
        return $this->transition($order, OrderStatus::Cancelled, $reason);
    }

    /**
     * Cancel every pending-payment order whose payment window has closed.
     *
     * Channels such as manual bank transfer and COD never push a gateway
     * notification, so without this sweep their stock reservations stay locked
     * forever and the units look sold while they are still on the shelf.
     *
     * @return int Number of orders cancelled.
     */
    public function expireUnpaidOrders(): int
    {
        $cancelled = 0;

        $orders = Order::query()
            ->where('status', OrderStatus::PendingPayment->value)
            ->whereHas('payments', fn (Builder $query): Builder => $query
                ->where('status', PaymentStatus::Pending->value)
                ->where('expired_at', '<', now()))
            ->lazyById(100);

        foreach ($orders as $order) {
            $cancelled += DB::transaction(function () use ($order): int {
                $locked = Order::query()->lockForUpdate()->find($order->id);

                if ($locked === null || $locked->status !== OrderStatus::PendingPayment) {
                    return 0;
                }

                $locked->payments()
                    ->where('status', PaymentStatus::Pending->value)
                    ->update(['status' => PaymentStatus::Expired->value]);

                $this->cancel($locked, 'Pembayaran kedaluwarsa.');

                return 1;
            });
        }

        return $cancelled;
    }

    /**
     * Create a shipment and move the order to "shipped".
     *
     * @param  array<string, mixed>  $data
     */
    public function ship(Order $order, array $data): Order
    {
        return DB::transaction(function () use ($order, $data): Order {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);

            if (! in_array($locked->status, [OrderStatus::Paid, OrderStatus::Processing], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Pesanan hanya dapat dikirim setelah dibayar dan sebelum dikirim.'],
                ]);
            }

            $courierCode = $data['courier_code'] ?? $locked->courier_code;
            $courierName = $data['courier_name'] ?? $locked->courier_name;
            $courierService = $data['courier_service'] ?? $locked->courier_service;

            if (empty($courierCode) || empty($courierName) || empty($courierService)) {
                throw ValidationException::withMessages([
                    'courier_code' => ['Kurir pengiriman belum ditentukan.'],
                ]);
            }

            $locked->shipments()->create([
                'courier_code' => $courierCode,
                'courier_name' => $courierName,
                'courier_service' => $courierService,
                'tracking_number' => $data['tracking_number'] ?? null,
                'shipping_cost' => $data['shipping_cost'] ?? $locked->shipping_cost,
                'status' => ShipmentStatus::PickedUp,
                'shipped_at' => now(),
                'estimated_delivery' => $data['estimated_delivery'] ?? null,
            ]);

            $locked->update([
                'status' => OrderStatus::Shipped,
                'shipped_at' => now(),
            ]);

            return $locked->refresh()->load($this->relations());
        });
    }

    /**
     * @return array<int, OrderStatus>
     */
    public function allowedTransitions(OrderStatus $status): array
    {
        return match ($status) {
            OrderStatus::PendingPayment => [OrderStatus::Paid, OrderStatus::Cancelled],
            OrderStatus::Paid => [OrderStatus::Processing, OrderStatus::Cancelled],
            OrderStatus::Processing => [OrderStatus::Shipped, OrderStatus::Cancelled],
            OrderStatus::Shipped => [OrderStatus::Delivered],
            OrderStatus::Delivered => [OrderStatus::Completed, OrderStatus::Refunded],
            OrderStatus::Completed => [OrderStatus::Refunded],
            default => [],
        };
    }

    private function canTransition(OrderStatus $from, OrderStatus $to): bool
    {
        return in_array($to, $this->allowedTransitions($from), true);
    }

    private function applyPaid(Order $order): void
    {
        foreach ($order->items()->get() as $item) {
            if (! $item->stock_reserved) {
                continue;
            }

            $stock = $this->stockForItem($item);

            if ($stock !== null) {
                $this->stock->commitReservation($stock, $item->quantity, [
                    'reference_type' => 'order_item',
                    'reference_id' => $item->id,
                    'notes' => "Pesanan {$order->order_number}",
                ]);
            }

            $item->update(['stock_reserved' => false, 'stock_deducted' => true]);
        }

        $order->update(['paid_at' => now()]);

        $order->payments()
            ->where('status', PaymentStatus::Pending->value)
            ->update([
                'status' => PaymentStatus::Paid->value,
                'paid_at' => now(),
            ]);
    }

    private function applyCancelled(Order $order, ?string $reason): void
    {
        foreach ($order->items()->get() as $item) {
            $stock = $this->stockForItem($item);

            if ($stock === null) {
                continue;
            }

            if ($item->stock_deducted) {
                $this->stock->receive([
                    'variant_id' => $item->variant_id,
                    'warehouse_id' => $item->warehouse_id,
                    'quantity' => $item->quantity,
                    'movement_type' => MovementType::ReturnIn,
                    'reference_type' => 'order_item',
                    'reference_id' => $item->id,
                    'notes' => "Pembatalan pesanan {$order->order_number}",
                ]);
            } elseif ($item->stock_reserved) {
                $this->stock->release($stock, $item->quantity);
            }

            $item->update(['stock_reserved' => false, 'stock_deducted' => false]);
        }

        $order->update([
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);

        $order->payments()
            ->where('status', PaymentStatus::Pending->value)
            ->update(['status' => PaymentStatus::Failed->value]);
    }

    /**
     * The money has already left the platform through a return; only the
     * order-level bookkeeping is stamped here.
     */
    private function applyRefunded(Order $order): void
    {
        $order->update(['refunded_at' => now()]);

        $order->payments()
            ->where('status', PaymentStatus::Paid->value)
            ->update(['status' => PaymentStatus::Refunded->value]);
    }

    private function applyDelivered(Order $order): void
    {
        $order->update(['delivered_at' => now()]);

        $order->shipments()
            ->whereIn('status', [ShipmentStatus::Pending->value, ShipmentStatus::PickedUp->value, ShipmentStatus::InTransit->value])
            ->update([
                'status' => ShipmentStatus::Delivered->value,
                'delivered_at' => now(),
            ]);
    }

    private function stockForItem(OrderItem $item): ?InventoryStock
    {
        if ($item->warehouse_id === null) {
            return null;
        }

        return InventoryStock::query()
            ->forPool($item->variant_id, $item->warehouse_id)
            ->first();
    }

    /**
     * @return array<int, string>
     */
    private function relations(): array
    {
        return ['user', 'items', 'payments', 'shipments', 'returns'];
    }
}
