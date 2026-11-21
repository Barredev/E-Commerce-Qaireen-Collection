<?php

namespace App\Modules\Inventory\Services;

use App\Models\StockReceipt;
use App\Models\StockReceiptItem;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Enums\ReceiptStatus;
use App\Modules\Inventory\Enums\StockCondition;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StockReceiptService
{
    public function __construct(private readonly StockService $stock) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, ?string $userId): StockReceipt
    {
        return DB::transaction(function () use ($data, $userId): StockReceipt {
            $receipt = StockReceipt::query()->create([
                'receipt_number' => $this->generateReceiptNumber(),
                'warehouse_id' => $data['warehouse_id'],
                'source_type' => $data['source_type'],
                'received_by' => $userId,
                'received_at' => $data['received_at'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => ReceiptStatus::Draft,
            ]);

            $this->replaceItems($receipt, $data['items']);

            return $receipt->load($this->relations());
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(StockReceipt $receipt, array $data): StockReceipt
    {
        return DB::transaction(function () use ($receipt, $data): StockReceipt {
            $this->ensureDraft($receipt);

            if (array_key_exists('items', $data)) {
                $this->replaceItems($receipt, $data['items']);
            }

            $receipt->update(Arr::except($data, ['items']));

            return $receipt->refresh()->load($this->relations());
        });
    }

    /**
     * Confirm a draft receipt, moving every good item into the stock ledger.
     */
    public function confirm(StockReceipt $receipt, ?string $userId): StockReceipt
    {
        return DB::transaction(function () use ($receipt, $userId): StockReceipt {
            $locked = StockReceipt::query()->lockForUpdate()->findOrFail($receipt->id);

            $this->ensureDraft($locked);

            $items = $locked->items()->with('variant')->get();

            if ($items->isEmpty()) {
                throw ValidationException::withMessages([
                    'items' => ['Penerimaan stok minimal harus memiliki satu item.'],
                ]);
            }

            foreach ($items as $item) {
                if ($item->condition !== StockCondition::Good) {
                    // Damaged goods are recorded on the receipt but never become sellable stock.
                    continue;
                }

                $this->stock->receive([
                    'variant_id' => $item->variant_id,
                    'warehouse_id' => $locked->warehouse_id,
                    'quantity' => $item->quantity,
                    'movement_type' => MovementType::Receipt,
                    'reference_type' => 'stock_receipt',
                    'reference_id' => $locked->id,
                    'notes' => $item->notes,
                    'created_by' => $userId,
                ]);
            }

            $locked->update([
                'status' => ReceiptStatus::Confirmed,
                'received_at' => $locked->received_at ?? now(),
                'received_by' => $locked->received_by ?? $userId,
            ]);

            return $locked->refresh()->load($this->relations());
        });
    }

    public function cancel(StockReceipt $receipt): StockReceipt
    {
        return DB::transaction(function () use ($receipt): StockReceipt {
            $this->ensureDraft($receipt);

            $receipt->update(['status' => ReceiptStatus::Cancelled]);

            return $receipt->refresh()->load($this->relations());
        });
    }

    private function ensureDraft(StockReceipt $receipt): void
    {
        if ($receipt->status !== ReceiptStatus::Draft) {
            throw ValidationException::withMessages([
                'status' => ['Hanya penerimaan stok berstatus draf yang dapat diubah.'],
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function replaceItems(StockReceipt $receipt, array $items): void
    {
        $receipt->items()->delete();

        foreach ($items as $item) {
            StockReceiptItem::query()->create([
                'stock_receipt_id' => $receipt->id,
                'variant_id' => $item['variant_id'],
                'quantity' => $item['quantity'],
                'unit_cost' => $item['unit_cost'] ?? null,
                'condition' => $item['condition'] ?? StockCondition::Good->value,
                'notes' => $item['notes'] ?? null,
            ]);
        }
    }

    private function generateReceiptNumber(): string
    {
        do {
            $number = 'SR-'.now()->format('Ymd').'-'.Str::upper(Str::random(6));
        } while (StockReceipt::query()->where('receipt_number', $number)->exists());

        return $number;
    }

    /**
     * @return array<int, string>
     */
    private function relations(): array
    {
        return [
            'warehouse',
            'receiver:id,name',
            'items.variant.product',
        ];
    }
}
