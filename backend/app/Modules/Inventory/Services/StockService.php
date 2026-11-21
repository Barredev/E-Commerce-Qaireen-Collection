<?php

namespace App\Modules\Inventory\Services;

use App\Models\InventoryStock;
use App\Models\StockMovement;
use App\Models\Warehouse;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Exceptions\InsufficientStockException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Single entry point for every stock mutation.
 *
 * All methods run inside a transaction and lock the affected stock pool so the
 * on-hand balance and the movement ledger can never drift apart.
 */
class StockService
{
    /**
     * Add stock to a pool (receipt, return in, transfer in).
     *
     * @param  array<string, mixed>  $payload
     */
    public function receive(array $payload): StockMovement
    {
        return DB::transaction(function () use ($payload): StockMovement {
            $quantity = (int) $payload['quantity'];

            if ($quantity < 1) {
                throw ValidationException::withMessages([
                    'quantity' => ['Jumlah penerimaan harus lebih dari nol.'],
                ]);
            }

            $stock = $this->lockedPool($payload) ?? $this->createPool($payload);

            $stock->quantity_on_hand += $quantity;
            $stock->save();

            return $this->recordMovement($stock, $payload, $quantity);
        });
    }

    /**
     * Remove stock from a pool (sale, transfer out).
     *
     * @param  array<string, mixed>  $payload
     *
     * @throws InsufficientStockException
     */
    public function deduct(array $payload): StockMovement
    {
        return DB::transaction(function () use ($payload): StockMovement {
            $quantity = (int) $payload['quantity'];

            if ($quantity < 1) {
                throw ValidationException::withMessages([
                    'quantity' => ['Jumlah pengeluaran harus lebih dari nol.'],
                ]);
            }

            $stock = $this->lockedPool($payload);

            if ($stock === null || $stock->quantity_available < $quantity) {
                throw new InsufficientStockException($stock?->quantity_available ?? 0, $quantity);
            }

            $stock->quantity_on_hand -= $quantity;
            $stock->save();

            return $this->recordMovement($stock, $payload, -$quantity);
        });
    }

    /**
     * Set a pool's on-hand quantity to an absolute value (stock opname).
     *
     * @param  array<string, mixed>  $payload
     */
    public function adjust(array $payload): StockMovement
    {
        return DB::transaction(function () use ($payload): StockMovement {
            $newQuantity = (int) $payload['new_quantity'];

            $stock = $this->lockedPool($payload);

            if ($stock === null) {
                if ($newQuantity === 0) {
                    throw ValidationException::withMessages([
                        'new_quantity' => ['Tidak ada perubahan jumlah stok.'],
                    ]);
                }

                $stock = $this->createPool($payload);
            }

            if ($stock->quantity_reserved > $newQuantity) {
                throw ValidationException::withMessages([
                    'new_quantity' => ['Jumlah stok tidak boleh lebih kecil dari jumlah yang sedang direservasi.'],
                ]);
            }

            $delta = $newQuantity - $stock->quantity_on_hand;

            if ($delta === 0) {
                throw ValidationException::withMessages([
                    'new_quantity' => ['Tidak ada perubahan jumlah stok.'],
                ]);
            }

            $stock->quantity_on_hand = $newQuantity;

            if (isset($payload['low_stock_threshold'])) {
                $stock->low_stock_threshold = (int) $payload['low_stock_threshold'];
            }

            $stock->save();

            return $this->recordMovement($stock, $payload, $delta);
        });
    }

    /**
     * Reserve sellable stock for an unpaid order.
     *
     * @throws InsufficientStockException
     */
    public function reserve(InventoryStock $stock, int $quantity): InventoryStock
    {
        return DB::transaction(function () use ($stock, $quantity): InventoryStock {
            $locked = InventoryStock::query()->lockForUpdate()->findOrFail($stock->id);

            if ($locked->quantity_available < $quantity) {
                throw new InsufficientStockException($locked->quantity_available, $quantity);
            }

            $locked->quantity_reserved += $quantity;
            $locked->save();

            return $locked->refresh();
        });
    }

    /**
     * Release a reservation when an order is cancelled or expires.
     */
    public function release(InventoryStock $stock, int $quantity): InventoryStock
    {
        return DB::transaction(function () use ($stock, $quantity): InventoryStock {
            $locked = InventoryStock::query()->lockForUpdate()->findOrFail($stock->id);

            if ($quantity < 1 || $locked->quantity_reserved < $quantity) {
                throw ValidationException::withMessages([
                    'quantity' => ['Jumlah pelepasan reservasi melebihi jumlah yang direservasi.'],
                ]);
            }

            $locked->quantity_reserved -= $quantity;
            $locked->save();

            return $locked->refresh();
        });
    }

    /**
     * Turn a reservation into a real stock-out (order paid).
     *
     * @param  array<string, mixed>  $payload
     *
     * @throws InsufficientStockException
     */
    public function commitReservation(InventoryStock $stock, int $quantity, array $payload = []): StockMovement
    {
        return DB::transaction(function () use ($stock, $quantity, $payload): StockMovement {
            $locked = InventoryStock::query()->lockForUpdate()->findOrFail($stock->id);

            if ($locked->quantity_reserved < $quantity || $locked->quantity_on_hand < $quantity) {
                throw new InsufficientStockException($locked->quantity_reserved, $quantity);
            }

            $locked->quantity_reserved -= $quantity;
            $locked->quantity_on_hand -= $quantity;
            $locked->save();

            return $this->recordMovement($locked, [
                'movement_type' => MovementType::Sale,
                ...$payload,
            ], -$quantity);
        });
    }

    /**
     * Pick the pool that can serve the requested quantity, preferring the
     * largest available balance.
     */
    public function findAvailablePool(string $variantId, string $warehouseId, int $quantity): ?InventoryStock
    {
        return InventoryStock::query()
            ->where('variant_id', $variantId)
            ->where('warehouse_id', $warehouseId)
            ->whereRaw('(quantity_on_hand - quantity_reserved) >= ?', [$quantity])
            ->orderByDesc('quantity_available')
            ->first();
    }

    public function availableQuantity(string $variantId, string $warehouseId): int
    {
        return (int) InventoryStock::query()
            ->where('variant_id', $variantId)
            ->where('warehouse_id', $warehouseId)
            ->selectRaw('coalesce(sum(quantity_on_hand - quantity_reserved), 0) as total')
            ->value('total');
    }

    /**
     * Fulfilment warehouse used by cart validation and checkout.
     */
    public function defaultWarehouse(): ?Warehouse
    {
        return Warehouse::query()
            ->where('is_default', true)
            ->where('is_active', true)
            ->first()
            ?? Warehouse::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->first();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function lockedPool(array $payload): ?InventoryStock
    {
        return InventoryStock::query()
            ->forPool($payload['variant_id'], $payload['warehouse_id'])
            ->lockForUpdate()
            ->first();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function createPool(array $payload): InventoryStock
    {
        return InventoryStock::query()->create([
            'variant_id' => $payload['variant_id'],
            'warehouse_id' => $payload['warehouse_id'],
            'quantity_on_hand' => 0,
            'quantity_reserved' => 0,
            'low_stock_threshold' => (int) ($payload['low_stock_threshold'] ?? 5),
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function recordMovement(InventoryStock $stock, array $payload, int $quantity): StockMovement
    {
        return StockMovement::query()->create([
            'variant_id' => $stock->variant_id,
            'warehouse_id' => $stock->warehouse_id,
            'movement_type' => $payload['movement_type'],
            'reference_type' => $payload['reference_type'] ?? null,
            'reference_id' => $payload['reference_id'] ?? null,
            'quantity' => $quantity,
            'balance_after' => $stock->quantity_on_hand,
            'notes' => $payload['notes'] ?? null,
            'created_by' => $payload['created_by'] ?? null,
        ]);
    }
}
