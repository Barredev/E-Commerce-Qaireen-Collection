<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Order\Enums\OrderStatus;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_guests_and_customers_cannot_access_reports(): void
    {
        $this->getJson('/api/v1/admin/reports/overview')->assertUnauthorized();

        $customer = User::factory()->create(['role' => UserRole::Customer]);
        Sanctum::actingAs($customer);

        $this->getJson('/api/v1/admin/reports/overview')->assertForbidden();
    }

    public function test_admin_can_access_dashboard_and_analytics_endpoints(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        Sanctum::actingAs($admin);

        $brand = Brand::factory()->create(['name' => 'Qaireen Collection']);
        $product = Product::factory()->create(['brand_id' => $brand->id]);
        $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'price' => 150000]);

        $order = Order::create([
            'order_number' => 'ORD-TEST-001',
            'user_id' => $admin->id,
            'status' => OrderStatus::Paid,
            'subtotal' => 150000,
            'discount_total' => 0,
            'shipping_cost' => 15000,
            'grand_total' => 165000,
            'shipping_name' => 'John Doe',
            'shipping_phone' => '08123456789',
            'shipping_address' => 'Jl. Sudirman 1',
            'shipping_city' => 'Jakarta Selatan',
            'shipping_province' => 'DKI Jakarta',
            'shipping_postal_code' => '12190',
            'paid_at' => now(),
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'variant_id' => $variant->id,
            'brand_id' => $brand->id,
            'product_name' => $product->name,
            'variant_sku' => $variant->sku,
            'variant_size' => $variant->size,
            'variant_color' => $variant->color,
            'brand_name' => $brand->name,
            'unit_price' => 150000,
            'quantity' => 1,
            'discount_amount' => 0,
            'line_total' => 150000,
        ]);

        $this->getJson('/api/v1/admin/reports/overview')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'total_revenue',
                    'total_subtotal',
                    'total_discounts',
                    'total_orders',
                    'total_physical_units',
                    'total_reserved_units',
                    'low_stock_count',
                ],
            ])
            ->assertJsonPath('data.total_revenue', 165000)
            ->assertJsonPath('data.total_orders', 1);

        $this->getJson('/api/v1/admin/reports/sales')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'daily_trend',
                    'status_breakdown',
                ],
            ]);

        $this->getJson('/api/v1/admin/reports/inventory')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'total_units_on_hand',
                    'total_units_available',
                    'total_units_reserved',
                    'by_warehouse',
                    'low_stock_items',
                ],
            ]);
    }

    public function test_retired_report_endpoints_are_no_longer_exposed(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/reports/brands')->assertNotFound();
        $this->getJson('/api/v1/admin/reports/settlements')->assertNotFound();
        $this->getJson('/api/v1/admin/reports/tax')->assertNotFound();
    }
}
