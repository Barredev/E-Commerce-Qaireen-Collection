<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\Shipment;
use App\Modules\Order\Enums\ShipmentStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Shipment>
 */
class ShipmentFactory extends Factory
{
    protected $model = Shipment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'courier_code' => fake()->randomElement(['jne', 'jnt', 'sicepat']),
            'courier_name' => fake()->randomElement(['JNE', 'J&T', 'SiCepat']),
            'courier_service' => 'REG',
            'tracking_number' => null,
            'shipping_cost' => fake()->numberBetween(0, 40000),
            'status' => ShipmentStatus::Pending,
            'shipped_at' => null,
            'delivered_at' => null,
            'estimated_delivery' => now()->addDays(3),
        ];
    }
}
