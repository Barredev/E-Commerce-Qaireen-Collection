<?php

namespace Tests\Feature;

use App\Models\InventoryStock;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Warehouse;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Inventory\Enums\MovementType;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StockAdjustmentTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_get_401_on_adjustments(): void
    {
        $this->postJson('/api/v1/admin/inventory/adjustments', [])->assertUnauthorized();
    }

    public function test_admin_can_set_an_absolute_stock_quantity(): void
    {
        $this->actingAsAdmin();
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        InventoryStock::factory()->create([
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity_on_hand' => 10,
        ]);

        $this->postJson('/api/v1/admin/inventory/adjustments', [
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'new_quantity' => 4,
            'notes' => 'Stock opname bulanan',
        ])->assertCreated()
            ->assertJsonPath('data.movement_type', MovementType::Adjustment->value)
            ->assertJsonPath('data.quantity', -6)
            ->assertJsonPath('data.balance_after', 4);

        $this->assertDatabaseHas('inventory_stocks', [
            'variant_id' => $variant->id,
            'quantity_on_hand' => 4,
        ]);
    }

    public function test_an_adjustment_without_a_reason_is_rejected(): void
    {
        $this->actingAsAdmin();
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->postJson('/api/v1/admin/inventory/adjustments', [
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'new_quantity' => 3,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('notes');
    }

    public function test_stock_cannot_be_reduced_below_the_reserved_quantity(): void
    {
        $this->actingAsAdmin();
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        InventoryStock::factory()->create([
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity_on_hand' => 10,
            'quantity_reserved' => 6,
        ]);

        $this->postJson('/api/v1/admin/inventory/adjustments', [
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'new_quantity' => 5,
            'notes' => 'Koreksi',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('new_quantity');
    }

    public function test_an_adjustment_without_a_change_is_rejected(): void
    {
        $this->actingAsAdmin();
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        InventoryStock::factory()->create([
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity_on_hand' => 8,
        ]);

        $this->postJson('/api/v1/admin/inventory/adjustments', [
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'new_quantity' => 8,
            'notes' => 'Tanpa perubahan',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('new_quantity');
    }

    public function test_an_adjustment_creates_a_pool_when_the_variant_has_no_stock_yet(): void
    {
        $this->actingAsAdmin();
        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->postJson('/api/v1/admin/inventory/adjustments', [
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'new_quantity' => 9,
            'notes' => 'Stok awal',
        ])->assertCreated();

        $this->assertDatabaseHas('inventory_stocks', [
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'quantity_on_hand' => 9,
        ]);
    }

    public function test_warehouse_staff_can_adjust_stock(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Warehouse]));

        $warehouse = Warehouse::factory()->create();
        $variant = ProductVariant::factory()->create();

        $this->postJson('/api/v1/admin/inventory/adjustments', [
            'variant_id' => $variant->id,
            'warehouse_id' => $warehouse->id,
            'new_quantity' => 5,
            'notes' => 'Stok awal',
        ])->assertCreated();
    }

    public function test_customers_may_not_adjust_stock(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Customer]));

        $this->postJson('/api/v1/admin/inventory/adjustments', [])->assertForbidden();
    }

    private function actingAsAdmin(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));
    }
}
