<?php

namespace Tests\Feature;

use App\Models\InventoryStock;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Models\Warehouse;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Exceptions\InsufficientStockException;
use App\Modules\Inventory\Services\StockService;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class StockServiceTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_receive_creates_a_pool_and_a_movement(): void
    {
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $movement = $this->service()->receive($this->payload($variant, $warehouse, 12));

        $this->assertDatabaseHas('inventory_stocks', [
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity_on_hand' => 12,
        ]);

        $this->assertSame(12, $movement->quantity);
        $this->assertSame(12, $movement->balance_after);
        $this->assertSame(MovementType::Receipt, $movement->movement_type);
    }

    public function test_receive_adds_to_an_existing_pool(): void
    {
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->service()->receive($this->payload($variant, $warehouse, 5));
        $this->service()->receive($this->payload($variant, $warehouse, 7));

        $this->assertSame(12, $this->stockFor($variant, $warehouse)->quantity_on_hand);
        $this->assertSame(2, StockMovement::query()->count());
    }

    public function test_receive_rejects_a_non_positive_quantity(): void
    {
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->expectException(ValidationException::class);

        $this->service()->receive($this->payload($variant, $warehouse, 0));
    }

    public function test_deduct_reduces_the_pool_and_records_a_negative_movement(): void
    {
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->service()->receive($this->payload($variant, $warehouse, 10));

        $movement = $this->service()->deduct([
            ...$this->payload($variant, $warehouse, 4),
            'movement_type' => MovementType::Sale,
        ]);

        $this->assertSame(-4, $movement->quantity);
        $this->assertSame(6, $movement->balance_after);
        $this->assertSame(6, $this->stockFor($variant, $warehouse)->quantity_on_hand);
    }

    public function test_deduct_refuses_to_go_below_zero(): void
    {
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->service()->receive($this->payload($variant, $warehouse, 3));

        try {
            $this->service()->deduct($this->payload($variant, $warehouse, 4));
            $this->fail('Pengurangan stok melebihi jumlah tersedia seharusnya gagal.');
        } catch (InsufficientStockException $exception) {
            $this->assertSame(3, $exception->available);
            $this->assertSame(4, $exception->requested);
        }

        $this->assertSame(3, $this->stockFor($variant, $warehouse)->quantity_on_hand);
        $this->assertSame(1, StockMovement::query()->count());
    }

    public function test_deduct_ignores_reserved_quantity_when_checking_availability(): void
    {
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->service()->receive($this->payload($variant, $warehouse, 5));
        $stock = $this->stockFor($variant, $warehouse);

        $this->service()->reserve($stock, 4);

        $this->expectException(InsufficientStockException::class);

        $this->service()->deduct($this->payload($variant, $warehouse, 2));
    }

    public function test_adjust_sets_an_absolute_quantity_and_records_the_delta(): void
    {
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->service()->receive($this->payload($variant, $warehouse, 10));

        $movement = $this->service()->adjust([
            ...$this->payload($variant, $warehouse, 0),
            'new_quantity' => 7,
            'movement_type' => MovementType::Adjustment,
            'notes' => 'Stock opname',
        ]);

        $this->assertSame(-3, $movement->quantity);
        $this->assertSame(7, $movement->balance_after);
        $this->assertSame(7, $this->stockFor($variant, $warehouse)->quantity_on_hand);
    }

    public function test_adjust_creates_a_pool_when_the_variant_has_no_stock_yet(): void
    {
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->service()->adjust([
            ...$this->payload($variant, $warehouse, 0),
            'new_quantity' => 6,
            'movement_type' => MovementType::Adjustment,
        ]);

        $this->assertSame(6, $this->stockFor($variant, $warehouse)->quantity_on_hand);
    }

    public function test_adjust_refuses_to_drop_below_the_reserved_quantity(): void
    {
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->service()->receive($this->payload($variant, $warehouse, 10));
        $this->service()->reserve($this->stockFor($variant, $warehouse), 8);

        $this->expectException(ValidationException::class);

        $this->service()->adjust([
            ...$this->payload($variant, $warehouse, 0),
            'new_quantity' => 5,
            'movement_type' => MovementType::Adjustment,
        ]);
    }

    public function test_reserve_moves_quantity_from_available_to_reserved(): void
    {
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->service()->receive($this->payload($variant, $warehouse, 10));

        $stock = $this->service()->reserve($this->stockFor($variant, $warehouse), 4);

        $this->assertSame(4, $stock->quantity_reserved);
        $this->assertSame(6, $stock->quantity_available);
        $this->assertSame(10, $stock->quantity_on_hand);
    }

    public function test_reserve_refuses_to_exceed_available_quantity(): void
    {
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->service()->receive($this->payload($variant, $warehouse, 2));

        $this->expectException(InsufficientStockException::class);

        $this->service()->reserve($this->stockFor($variant, $warehouse), 3);
    }

    public function test_release_returns_reserved_quantity_to_available(): void
    {
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->service()->receive($this->payload($variant, $warehouse, 10));
        $this->service()->reserve($this->stockFor($variant, $warehouse), 5);

        $stock = $this->service()->release($this->stockFor($variant, $warehouse), 3);

        $this->assertSame(2, $stock->quantity_reserved);
        $this->assertSame(8, $stock->quantity_available);
    }

    public function test_release_refuses_to_exceed_the_reserved_quantity(): void
    {
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->service()->receive($this->payload($variant, $warehouse, 10));
        $this->service()->reserve($this->stockFor($variant, $warehouse), 2);

        $this->expectException(ValidationException::class);

        $this->service()->release($this->stockFor($variant, $warehouse), 3);
    }

    private function service(): StockService
    {
        return app(StockService::class);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(ProductVariant $variant, Warehouse $warehouse, int $quantity): array
    {
        return [
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => $quantity,
            'movement_type' => MovementType::Receipt,
        ];
    }

    private function stockFor(ProductVariant $variant, Warehouse $warehouse): InventoryStock
    {
        return InventoryStock::query()
            ->where('variant_id', $variant->id)
            ->where('warehouse_id', $warehouse->id)
            ->firstOrFail();
    }
}
