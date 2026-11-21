<?php

namespace Database\Seeders;

use App\Models\Promotion;
use App\Models\User;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Promotion\Enums\DiscountBearer;
use App\Modules\Promotion\Enums\PromotionAppliesTo;
use App\Modules\Promotion\Enums\PromotionType;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin accounts
        User::query()->firstOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'Administrator',
                'password' => 'password',
                'role' => UserRole::Admin,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        User::query()->firstOrCreate(
            ['email' => 'adminqaireen@gmail.com'],
            [
                'name' => 'Administrator',
                'password' => 'password',
                'role' => UserRole::Admin,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        // Warehouse staff
        User::query()->firstOrCreate(
            ['email' => 'gudang@gmail.com'],
            [
                'name' => 'Staf Gudang',
                'password' => 'password',
                'role' => UserRole::Warehouse,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        // Customer account
        User::query()->firstOrCreate(
            ['email' => 'customer@gmail.com'],
            [
                'name' => 'Customer Demo',
                'password' => 'password',
                'role' => UserRole::Customer,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        $this->call(CatalogSeeder::class);

        // Seed Sample Promotions
        Promotion::query()->firstOrCreate(
            ['code' => 'FASHION10'],
            [
                'name' => 'Diskon Fashion 10%',
                'type' => PromotionType::Percentage,
                'value' => 10.0,
                'min_purchase' => 100000,
                'max_discount' => 50000,
                'applies_to' => PromotionAppliesTo::All,
                'usage_limit' => 500,
                'per_user_limit' => 2,
                'is_active' => true,
                'discount_bearer' => DiscountBearer::Platform,
                'description' => 'Potongan 10% untuk semua koleksi fashion, maksimal potongan Rp 50.000.',
            ]
        );

        Promotion::query()->firstOrCreate(
            ['code' => 'DISKON50K'],
            [
                'name' => 'Voucher Belanja Rp 50.000',
                'type' => PromotionType::FixedAmount,
                'value' => 50000.0,
                'min_purchase' => 250000,
                'applies_to' => PromotionAppliesTo::All,
                'usage_limit' => 200,
                'per_user_limit' => 1,
                'is_active' => true,
                'discount_bearer' => DiscountBearer::Shared,
                'description' => 'Potongan langsung Rp 50.000 dengan minimal belanja Rp 250.000.',
            ]
        );

        Promotion::query()->firstOrCreate(
            ['code' => 'GRATISONGKIR'],
            [
                'name' => 'Promo Bebas Ongkos Kirim',
                'type' => PromotionType::FreeShipping,
                'value' => 0.0,
                'min_purchase' => 150000,
                'applies_to' => PromotionAppliesTo::All,
                'usage_limit' => 1000,
                'per_user_limit' => 5,
                'is_active' => true,
                'discount_bearer' => DiscountBearer::Platform,
                'description' => 'Gratis ongkir untuk pesanan di atas Rp 150.000.',
            ]
        );

        // Two years of operating history so the dashboards and reports have data.
        $this->call(HistoricalSeeder::class);

        // Verified-buyer reviews backfilled over that history.
        $this->call(FeedbackSeeder::class);
    }
}
