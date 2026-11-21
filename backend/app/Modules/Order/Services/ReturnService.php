<?php

namespace App\Modules\Order\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderReturn;
use App\Models\ReturnItem;
use App\Models\User;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Enums\StockCondition;
use App\Modules\Inventory\Services\StockService;
use App\Modules\Order\Enums\OrderStatus;
use App\Modules\Order\Enums\RefundMethod;
use App\Modules\Order\Enums\ReturnStatus;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Owns the whole return lifecycle: customer complaint, admin approval,
 * warehouse verification, and the money leaving the platform.
 */
class ReturnService
{
    /**
     * Return window applied to every delivered line.
     */
    private const DEFAULT_RETURN_WINDOW_DAYS = 14;

    /**
     * @var array<int, OrderStatus>
     */
    private const RETURNABLE_STATUSES = [OrderStatus::Delivered, OrderStatus::Completed];

    public function __construct(
        private readonly StockService $stock,
        private readonly OrderService $orders,
    ) {}

    /**
     * Register a customer return request for a delivered order.
     *
     * @param  array{reason_category: string, reason: string, notes?: string|null, items: array<int, array{order_item_id: string, quantity: int, reason?: string|null}>}  $data
     */
    public function request(Order $order, User $user, array $data): OrderReturn
    {
        return DB::transaction(function () use ($order, $user, $data): OrderReturn {
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);

            if (! in_array($locked->status, self::RETURNABLE_STATUSES, true)) {
                throw ValidationException::withMessages([
                    'status' => ['Retur hanya dapat diajukan untuk pesanan yang sudah diterima pelanggan.'],
                ]);
            }

            $requested = $this->quantitiesByOrderItem($data['items']);
            $reasons = $this->reasonsByOrderItem($data['items']);

            $orderItems = $locked->items()
                ->whereIn('id', $requested->keys()->all())
                ->get()
                ->keyBy('id');

            if ($orderItems->count() !== $requested->count()) {
                throw ValidationException::withMessages([
                    'items' => ['Terdapat barang yang bukan bagian dari pesanan ini.'],
                ]);
            }

            $alreadyReturned = $this->alreadyReturnedQuantities($requested->keys()->all());
            $deliveredAt = $locked->delivered_at ?? $locked->completed_at ?? $locked->updated_at;

            $return = OrderReturn::query()->create([
                'order_id' => $locked->id,
                'user_id' => $user->id,
                'return_number' => $this->generateReturnNumber(),
                'reason_category' => $data['reason_category'],
                'reason' => $data['reason'],
                'status' => ReturnStatus::Requested,
                'requested_at' => now(),
                'notes' => $data['notes'] ?? null,
            ]);

            $totalRefund = 0.0;

            foreach ($requested as $orderItemId => $quantity) {
                $item = $orderItems->get($orderItemId);

                $returned = (int) ($alreadyReturned[$orderItemId] ?? 0);

                if ($quantity < 1 || $quantity + $returned > $item->quantity) {
                    throw ValidationException::withMessages([
                        'items' => ["Jumlah retur untuk {$item->product_name} melebihi jumlah yang dibeli atau sudah pernah diretur."],
                    ]);
                }

                $windowDays = self::DEFAULT_RETURN_WINDOW_DAYS;

                if ($deliveredAt !== null && $deliveredAt->copy()->addDays($windowDays)->isPast()) {
                    throw ValidationException::withMessages([
                        'items' => ["Batas waktu retur {$windowDays} hari untuk {$item->product_name} sudah terlewat."],
                    ]);
                }

                $refund = $this->proportionalAmount($item, $quantity);
                $totalRefund += $refund;

                $return->items()->create([
                    'order_item_id' => $item->id,
                    'quantity' => $quantity,
                    'condition' => StockCondition::Good,
                    'is_restocked' => false,
                    'refund_amount' => $refund,
                    'reason' => $reasons[$orderItemId] ?? null,
                ]);
            }

            $return->update(['refund_amount' => round($totalRefund, 2)]);

            return $return->refresh()->load($this->relations());
        });
    }

    public function approve(OrderReturn $return, User $admin, ?string $resolution = null): OrderReturn
    {
        return DB::transaction(function () use ($return, $admin, $resolution): OrderReturn {
            $locked = $this->lockReturn($return);

            if ($locked->status !== ReturnStatus::Requested) {
                throw ValidationException::withMessages([
                    'status' => ['Hanya retur berstatus diajukan yang dapat disetujui.'],
                ]);
            }

            $locked->update([
                'status' => ReturnStatus::Approved,
                'approved_by' => $admin->id,
                'approved_at' => now(),
                'resolution' => $resolution ?? $locked->resolution,
            ]);

            return $locked->refresh()->load($this->relations());
        });
    }

    public function reject(OrderReturn $return, User $admin, string $resolution): OrderReturn
    {
        return DB::transaction(function () use ($return, $admin, $resolution): OrderReturn {
            $locked = $this->lockReturn($return);

            if (! in_array($locked->status, [ReturnStatus::Requested, ReturnStatus::Approved], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Retur ini sudah diproses dan tidak dapat ditolak.'],
                ]);
            }

            $locked->update([
                'status' => ReturnStatus::Rejected,
                'approved_by' => $admin->id,
                'resolution' => $resolution,
            ]);

            return $locked->refresh()->load($this->relations());
        });
    }

    /**
     * Verify the physical goods at the warehouse and restock what is sellable.
     *
     * @param  array<int, array{id: string, quantity: int, condition: string, notes?: string|null}>  $lines
     */
    public function receive(OrderReturn $return, User $admin, array $lines): OrderReturn
    {
        return DB::transaction(function () use ($return, $admin, $lines): OrderReturn {
            $locked = $this->lockReturn($return);

            if ($locked->status !== ReturnStatus::Approved) {
                throw ValidationException::withMessages([
                    'status' => ['Retur harus disetujui sebelum barang diverifikasi di gudang.'],
                ]);
            }

            $existing = $locked->items()->with('orderItem')->get()->keyBy('id');
            $submitted = collect($lines)->keyBy('id');

            if ($existing->count() !== $submitted->count() || $submitted->keys()->diff($existing->keys())->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'items' => ['Semua baris retur harus diverifikasi sekaligus.'],
                ]);
            }

            $totalRefund = 0.0;

            foreach ($existing as $line) {
                $payload = $submitted->get($line->id);
                $quantity = (int) $payload['quantity'];
                $condition = StockCondition::from($payload['condition']);
                $orderItem = $line->orderItem;

                if ($quantity < 1 || $quantity > $line->quantity) {
                    throw ValidationException::withMessages([
                        'items' => ["Jumlah terverifikasi untuk {$orderItem->product_name} tidak sesuai pengajuan."],
                    ]);
                }

                $restocked = $condition === StockCondition::Good && $this->restock($orderItem, $line, $quantity, $admin, $locked);

                $refund = $this->proportionalAmount($orderItem, $quantity);
                $totalRefund += $refund;

                $line->update([
                    'quantity' => $quantity,
                    'condition' => $condition,
                    'is_restocked' => $restocked,
                    'refund_amount' => $refund,
                    'notes' => $payload['notes'] ?? $line->notes,
                ]);
            }

            $locked->update([
                'status' => ReturnStatus::Received,
                'verified_by' => $admin->id,
                'received_at' => now(),
                'refund_amount' => round($totalRefund, 2),
            ]);

            return $locked->refresh()->load($this->relations());
        });
    }

    /**
     * Release the money to the customer and close the return.
     */
    public function refund(
        OrderReturn $return,
        RefundMethod $method,
        ?string $reference = null,
    ): OrderReturn {
        return DB::transaction(function () use ($return, $method, $reference): OrderReturn {
            $locked = $this->lockReturn($return);

            if ($locked->status !== ReturnStatus::Received) {
                throw ValidationException::withMessages([
                    'status' => ['Dana hanya dapat dikembalikan setelah barang diterima gudang.'],
                ]);
            }

            $locked->update([
                'status' => ReturnStatus::Refunded,
                'refund_method' => $method,
                'refund_reference' => $reference,
                'refunded_at' => now(),
            ]);

            $order = $locked->order;

            if ($order !== null && $this->isFullyReturned($order)) {
                $this->orders->transition($order, OrderStatus::Refunded);
            }

            return $locked->refresh()->load($this->relations());
        });
    }

    public function cancel(OrderReturn $return, User $user): OrderReturn
    {
        return DB::transaction(function () use ($return, $user): OrderReturn {
            $locked = $this->lockReturn($return);

            if ($locked->user_id !== $user->id) {
                abort(404);
            }

            if ($locked->status !== ReturnStatus::Requested) {
                throw ValidationException::withMessages([
                    'status' => ['Retur yang sudah diproses tidak dapat dibatalkan.'],
                ]);
            }

            $locked->update(['status' => ReturnStatus::Cancelled]);

            return $locked->refresh()->load($this->relations());
        });
    }

    /**
     * @return Collection<string, int>
     */
    private function quantitiesByOrderItem(array $items): Collection
    {
        return collect($items)
            ->groupBy('order_item_id')
            ->map(fn ($rows): int => (int) collect($rows)->sum('quantity'));
    }

    /**
     * @return array<string, string|null>
     */
    private function reasonsByOrderItem(array $items): array
    {
        $reasons = [];

        foreach ($items as $item) {
            $reasons[$item['order_item_id']] ??= $item['reason'] ?? null;
        }

        return $reasons;
    }

    /**
     * Quantities already sitting in a return that has not been closed yet.
     *
     * @param  array<int, string>  $orderItemIds
     * @return Collection<string, int>
     */
    private function alreadyReturnedQuantities(array $orderItemIds): Collection
    {
        return ReturnItem::query()
            ->whereIn('order_item_id', $orderItemIds)
            ->whereHas('orderReturn', fn ($query) => $query->whereIn('status', ReturnStatus::active()))
            ->selectRaw('order_item_id, sum(quantity) as total')
            ->groupBy('order_item_id')
            ->pluck('total', 'order_item_id');
    }

    private function restock(OrderItem $item, ReturnItem $line, int $quantity, User $admin, OrderReturn $return): bool
    {
        if ($item->warehouse_id === null) {
            return false;
        }

        $this->stock->receive([
            'variant_id' => $item->variant_id,
            'warehouse_id' => $item->warehouse_id,
            'quantity' => $quantity,
            'movement_type' => MovementType::ReturnIn,
            'reference_type' => 'return_item',
            'reference_id' => $line->id,
            'notes' => "Retur {$return->return_number}",
            'created_by' => $admin->id,
        ]);

        return true;
    }

    private function isFullyReturned(Order $order): bool
    {
        $ordered = (int) $order->items()->sum('quantity');

        $returned = (int) ReturnItem::query()
            ->whereHas('orderReturn', fn ($query) => $query
                ->where('order_id', $order->id)
                ->where('status', ReturnStatus::Refunded))
            ->sum('quantity');

        return $ordered > 0 && $returned >= $ordered;
    }

    /**
     * Value of the returned units, taken proportionally from the paid line so
     * line discounts are honoured.
     */
    private function proportionalAmount(OrderItem $item, int $quantity): float
    {
        if ($item->quantity < 1) {
            return 0.0;
        }

        return round((float) $item->line_total / $item->quantity * $quantity, 2);
    }

    private function lockReturn(OrderReturn $return): OrderReturn
    {
        return OrderReturn::query()->lockForUpdate()->findOrFail($return->id);
    }

    private function generateReturnNumber(): string
    {
        return 'RET-'.now()->format('Ymd').'-'.Str::upper(Str::random(6));
    }

    /**
     * @return array<int, string>
     */
    private function relations(): array
    {
        return ['order', 'user', 'items.orderItem', 'approvedByUser', 'verifiedByUser'];
    }
}
