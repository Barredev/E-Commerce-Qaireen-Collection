<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Warehouse;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class CatalogSeederTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_base_seeding_creates_an_active_default_warehouse(): void
    {
        $this->seed(CatalogSeeder::class);

        $default = Warehouse::query()->where('is_default', true)->first();

        $this->assertNotNull($default, 'Checkout requires a default warehouse to exist after base seeding.');
        $this->assertTrue($default->is_active);
        $this->assertSame('GDG-JKT', $default->code);
        $this->assertSame(1, Warehouse::query()->where('is_default', true)->count());
    }

    public function test_base_seeding_is_idempotent(): void
    {
        $this->seed(CatalogSeeder::class);
        $this->seed(CatalogSeeder::class);

        $this->assertSame(count(CatalogSeeder::WAREHOUSES), Warehouse::query()->count());
        $this->assertSame(4, Product::query()->count());
        $this->assertSame(22, ProductVariant::query()->count());
    }
}
