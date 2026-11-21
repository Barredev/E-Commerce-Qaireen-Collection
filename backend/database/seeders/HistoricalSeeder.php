<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\Brand;
use App\Models\Category;
use App\Models\InventoryStock;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderReturn;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ReturnItem;
use App\Models\Shipment;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use App\Modules\Auth\Enums\UserRole;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Enums\ReceiptSourceType;
use App\Modules\Inventory\Enums\StockCondition;
use App\Modules\Inventory\Exceptions\InsufficientStockException;
use App\Modules\Inventory\Services\StockReceiptService;
use App\Modules\Inventory\Services\StockService;
use App\Modules\Order\Enums\OrderStatus;
use App\Modules\Order\Enums\PaymentStatus;
use App\Modules\Order\Enums\RefundMethod;
use App\Modules\Order\Enums\ReturnReason;
use App\Modules\Order\Enums\ReturnStatus;
use App\Modules\Order\Enums\ShipmentStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Backfills a two-year operating history for the single-store catalog so every
 * report has a past.
 *
 * Stock receipts run through StockReceiptService, so balances and the movement
 * ledger obey the same rules as live traffic. Only the timestamps and the order
 * rows themselves are written directly, because the services always stamp
 * "now".
 */
class HistoricalSeeder extends Seeder
{
    private const MONTHS_OF_HISTORY = 24;

    private const CUSTOMER_COUNT = 64;

    /**
     * Units a variant should carry before a month's trading begins. Small
     * enough to keep the warehouse lean, large enough that a normal month of
     * demand cannot drain a pool mid-cycle.
     */
    private const RESTOCK_TARGET = 10;

    /**
     * @var array<int, array{code: string, name: string, service: string}>
     */
    private const COURIERS = [
        ['code' => 'jne', 'name' => 'JNE', 'service' => 'REG'],
        ['code' => 'jne', 'name' => 'JNE', 'service' => 'YES'],
        ['code' => 'sicepat', 'name' => 'SiCepat', 'service' => 'REG'],
        ['code' => 'sicepat', 'name' => 'SiCepat', 'service' => 'BEST'],
        ['code' => 'jnt', 'name' => 'J&T Express', 'service' => 'EZ'],
    ];

    /**
     * @var array<int, array{city: string, province: string, district: string, postal_code: string, destination_id: string}>
     */
    private const DESTINATIONS = [
        ['city' => 'Jakarta Selatan', 'province' => 'DKI Jakarta', 'district' => 'Kebayoran Baru', 'postal_code' => '12110', 'destination_id' => '152'],
        ['city' => 'Jakarta Barat', 'province' => 'DKI Jakarta', 'district' => 'Grogol Petamburan', 'postal_code' => '11470', 'destination_id' => '151'],
        ['city' => 'Bandung', 'province' => 'Jawa Barat', 'district' => 'Coblong', 'postal_code' => '40132', 'destination_id' => '23'],
        ['city' => 'Surabaya', 'province' => 'Jawa Timur', 'district' => 'Gubeng', 'postal_code' => '60281', 'destination_id' => '444'],
        ['city' => 'Yogyakarta', 'province' => 'DI Yogyakarta', 'district' => 'Mlati', 'postal_code' => '55287', 'destination_id' => '501'],
        ['city' => 'Semarang', 'province' => 'Jawa Tengah', 'district' => 'Tembalang', 'postal_code' => '50275', 'destination_id' => '399'],
        ['city' => 'Denpasar', 'province' => 'Bali', 'district' => 'Denpasar Barat', 'postal_code' => '80119', 'destination_id' => '17'],
        ['city' => 'Medan', 'province' => 'Sumatera Utara', 'district' => 'Medan Baru', 'postal_code' => '20153', 'destination_id' => '278'],
        ['city' => 'Makassar', 'province' => 'Sulawesi Selatan', 'district' => 'Panakkukang', 'postal_code' => '90231', 'destination_id' => '254'],
        ['city' => 'Palembang', 'province' => 'Sumatera Selatan', 'district' => 'Ilir Barat I', 'postal_code' => '30131', 'destination_id' => '327'],
    ];

    /**
     * Ramadan/Lebaran and Harbolnas drive the spikes an Indonesian fashion
     * store actually sees; January is always the quiet month after the spree.
     *
     * @var array<string, float>
     */
    private const SEASONALITY = [
        '2024-11' => 1.25, '2024-12' => 1.70, '2025-01' => 0.80, '2025-02' => 1.05,
        '2025-03' => 1.85, '2025-04' => 1.55, '2025-05' => 0.95, '2025-06' => 1.05,
        '2025-07' => 1.20, '2025-08' => 1.00, '2025-09' => 0.95, '2025-10' => 1.05,
        '2025-11' => 1.75, '2025-12' => 1.90, '2026-01' => 0.85, '2026-02' => 1.45,
        '2026-03' => 1.90, '2026-04' => 1.50, '2026-05' => 0.95, '2026-06' => 1.10,
        '2026-07' => 1.25, '2026-08' => 1.05, '2026-09' => 1.00, '2026-10' => 1.10,
        '2026-11' => 1.60,
    ];

    /**
     * Additional collections carried by the store, seeded before trading so
     * the catalog is not limited to the four demo products.
     *
     * @var array<int, array{name: string, category: string, price: int, sizes: array<int, string>, colors: array<int, array{0: string, 1: string}>, description: string}>
     */
    private const COLLECTIONS = [
        [
            'name' => 'Kemeja Batik Parang',
            'category' => 'Kemeja',
            'price' => 349000,
            'sizes' => ['S', 'M', 'L', 'XL'],
            'colors' => [['Navy', '1F2A44'], ['Coklat', '5B3A29']],
            'description' => 'Kemeja batik parang dengan pewarna alami, potongan modern.',
        ],
        [
            'name' => 'Blouse Satin Modern',
            'category' => 'Blouse',
            'price' => 279000,
            'sizes' => ['S', 'M', 'L'],
            'colors' => [['Dusty Pink', 'C9A0A0'], ['Ivory', 'F2EAD9']],
            'description' => 'Blouse satin jatuh dengan siluet longgar untuk acara maupun harian.',
        ],
        [
            'name' => 'Rok Batik Cap Lilit',
            'category' => 'Rok',
            'price' => 259000,
            'sizes' => ['S', 'M', 'L'],
            'colors' => [['Sogan', '8A5A2B'], ['Hitam', '111111']],
            'description' => 'Rok batik cap dengan detail lilitan di pinggang.',
        ],
        [
            'name' => 'Cardigan Rajut Batik',
            'category' => 'Cardigan',
            'price' => 329000,
            'sizes' => ['M', 'L'],
            'colors' => [['Krem', 'E8DFC8'], ['Terracotta', 'B4552D']],
            'description' => 'Cardigan rajut ringan dengan motif batik pada bagian lengan.',
        ],
        [
            'name' => 'Blazer Tenun Ikat',
            'category' => 'Blazer',
            'price' => 589000,
            'sizes' => ['M', 'L'],
            'colors' => [['Indigo', '2B3A67'], ['Marun', '6B1E2A']],
            'description' => 'Blazer tenun ikat dengan struktur bahu yang tegas.',
        ],
        [
            'name' => 'Celana Tenun Slim',
            'category' => 'Celana Panjang',
            'price' => 319000,
            'sizes' => ['M', 'L', 'XL'],
            'colors' => [['Hitam', '111111'], ['Khaki', 'A79277']],
            'description' => 'Celana tenun potongan slim dengan bahan yang tidak mudah kusut.',
        ],
    ];

    /**
     * @var array<int, array{variant: ProductVariant, product: Product, brand: Brand, warehouse_id: string}>
     */
    private array $sellables = [];

    /**
     * @var array<int, array{id: string, name: string, phone: string, signup: CarbonImmutable, address: array<string, string>}>
     */
    private array $customers = [];

    private CarbonImmutable $now;

    public function run(): void
    {
        if (Order::query()->exists()) {
            $this->command?->warn('Historical data already present; nothing to seed.');

            return;
        }

        $this->now = CarbonImmutable::now();

        Model::unguarded(function (): void {
            $staff = User::query()->where('email', 'gudang@gmail.com')->firstOrFail();

            $warehouses = $this->seedWarehouses();

            $this->seedCollections();
            $this->seedCustomers();
            $this->seedOpeningStock($warehouses, $staff);
            $this->seedOrders($warehouses, $staff);
            $this->finaliseReorderPoints();
        });

        $this->command?->info(sprintf(
            'Seeded %d orders, %d order items and %d returns over %d months.',
            Order::query()->count(),
            OrderItem::query()->count(),
            OrderReturn::query()->count(),
            self::MONTHS_OF_HISTORY,
        ));
    }

    /**
     * The warehouse definitions are owned by {@see CatalogSeeder}; this resolves
     * them into the keyed map the historical seeders expect.
     *
     * @return array<string, Warehouse>
     */
    private function seedWarehouses(): array
    {
        $warehouses = [];

        foreach (CatalogSeeder::WAREHOUSES as $definition) {
            $warehouses[$definition['code']] = Warehouse::query()->firstOrCreate(
                ['code' => $definition['code']],
                $definition,
            );
        }

        return $warehouses;
    }

    /**
     * Add the store's wider collections, all under the single store brand.
     */
    private function seedCollections(): void
    {
        $brand = Brand::query()->where('slug', 'qaireen-collection')->firstOrFail();
        $start = $this->historyStart();

        foreach (self::COLLECTIONS as $index => $definition) {
            $publishedAt = $start->addDays($index * 3);

            $category = Category::query()->where('name', $definition['category'])->first();

            $product = Product::query()->firstOrCreate(
                ['slug' => Str::slug($definition['name'])],
                [
                    'brand_id' => $brand->id,
                    'category_id' => $category?->id,
                    'name' => $definition['name'],
                    'description' => $definition['description'],
                    'material' => 'Katun',
                    'care_instructions' => 'Cuci tangan dengan air dingin, jangan gunakan pemutih.',
                    'base_price' => $definition['price'],
                    'is_active' => true,
                    'is_featured' => $index < 2,
                    'published_at' => $publishedAt,
                    'created_at' => $publishedAt,
                    'updated_at' => $publishedAt,
                ],
            );

            foreach ($definition['sizes'] as $size) {
                foreach ($definition['colors'] as $color) {
                    ProductVariant::query()->firstOrCreate(
                        ['sku' => $this->variantSku($definition['name'], $size, $color[0])],
                        [
                            'product_id' => $product->id,
                            'size' => $size,
                            'color' => $color[0],
                            'color_hex' => '#'.$color[1],
                            'price' => $definition['price'],
                            'weight_grams' => 350,
                            'is_active' => true,
                            'created_at' => $publishedAt,
                            'updated_at' => $publishedAt,
                        ],
                    );
                }
            }
        }
    }

    private function seedCustomers(): void
    {
        $firstNames = [
            'Andi', 'Budi', 'Citra', 'Dian', 'Eka', 'Fajar', 'Gita', 'Hendra', 'Indah', 'Joko',
            'Kartika', 'Lukman', 'Maya', 'Nanda', 'Oki', 'Putri', 'Rangga', 'Sari', 'Taufik', 'Umi',
            'Vina', 'Wahyu', 'Yuni', 'Zaki', 'Ayu', 'Bagas', 'Cahya', 'Dimas', 'Erika', 'Farhan',
            'Galuh', 'Hana',
        ];

        $lastNames = [
            'Pratama', 'Wijaya', 'Saputra', 'Nugroho', 'Halim', 'Kusuma', 'Ramadhan', 'Santoso',
            'Maulana', 'Purnama', 'Lestari', 'Hidayat', 'Anggraini', 'Setiawan', 'Firmansyah',
            'Maharani',
        ];

        $start = $this->historyStart();
        $monthsSpan = max(1, self::MONTHS_OF_HISTORY - 2);

        for ($index = 0; $index < self::CUSTOMER_COUNT; $index++) {
            $firstName = $firstNames[$index % count($firstNames)];
            $lastName = $lastNames[intdiv($index, count($firstNames)) % count($lastNames)];
            $destination = self::DESTINATIONS[$index % count(self::DESTINATIONS)];

            $signupMonth = (int) floor($index / self::CUSTOMER_COUNT * $monthsSpan);
            $signup = $start->addMonthsNoOverflow($signupMonth)
                ->startOfMonth()
                ->addDays(random_int(0, 20))
                ->setTime(random_int(7, 22), random_int(0, 59));

            $name = $firstName.' '.$lastName;
            $phone = '08'.random_int(11, 89).random_int(10000000, 99999999);
            $email = Str::lower($firstName).'.'.Str::lower($lastName).$index.'@gmail.com';

            $user = User::query()->firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => 'password',
                    'phone' => $phone,
                    'role' => UserRole::Customer,
                    'is_active' => true,
                    'email_verified_at' => $signup,
                    'created_at' => $signup,
                    'updated_at' => $signup,
                ],
            );

            $address = [
                'label' => 'Rumah',
                'recipient_name' => $name,
                'phone' => $phone,
                'address_line_1' => 'Jl. '.$lastName.' No. '.random_int(1, 180).', RT '.random_int(1, 12).'/RW '.random_int(1, 9),
                'address_line_2' => 'Kelurahan '.$destination['district'],
                'district' => $destination['district'],
                'city' => $destination['city'],
                'province' => $destination['province'],
                'postal_code' => $destination['postal_code'],
                'rajaongkir_destination_id' => $destination['destination_id'],
                'is_default' => true,
            ];

            Address::query()->firstOrCreate(
                ['user_id' => $user->id, 'label' => 'Rumah'],
                $address + ['created_at' => $signup, 'updated_at' => $signup],
            );

            $this->customers[] = [
                'id' => $user->id,
                'name' => $name,
                'phone' => $phone,
                'signup' => $signup,
                'address' => $address,
            ];
        }
    }

    /**
     * @param  array<string, Warehouse>  $warehouses
     */
    private function seedOpeningStock(array $warehouses, User $staff): void
    {
        $start = $this->historyStart();
        $default = $warehouses['GDG-JKT'];
        $regional = $warehouses['GDG-SBY'];

        $this->buildSellables($default);

        // Opening stock lands the day before the store starts trading, so the
        // very first order already has something to sell.
        $openedAt = $start->subDay()->setTime(9, 30);

        $this->createReceipt($default, $this->sellables, $openedAt, $staff, true);

        $this->createReceipt(
            $regional,
            array_slice($this->sellables, 0, 8),
            $start->addMonthsNoOverflow(6)->addDays(4)->setTime(10, 0),
            $staff,
            true,
            ReceiptSourceType::Purchase,
        );
    }

    /**
     * Set each pool's reorder point once trading has finished.
     *
     * A reorder point is a per-SKU policy number, not a warehouse-wide one, and
     * it has to be measured against the balance the store actually ends on.
     * Most pools sit comfortably above theirs; roughly one in eight has already
     * dipped past it and is waiting on a delivery, which is what a two-year-old
     * store's restock list actually looks like.
     */
    private function finaliseReorderPoints(): void
    {
        $pools = InventoryStock::query()->get()->values();
        $reorderSoon = $pools->shuffle()->take(max(1, intdiv($pools->count(), 8)))->modelKeys();

        foreach ($pools as $pool) {
            $available = (int) $pool->quantity_available;

            $pool->update([
                'low_stock_threshold' => in_array($pool->id, $reorderSoon, true)
                    ? $available + random_int(1, 3)
                    : max(2, $available - random_int(3, 6)),
            ]);
        }
    }

    /**
     * Top up every variant that is running thin before the month trades.
     *
     * A store does not receive on a fixed calendar, it reorders when the shelf
     * empties. Replenishing from the live pool balance keeps the movement
     * ledger honest: no sale is ever booked against stock that was not there.
     */
    private function replenishPools(CarbonImmutable $receivedAt, Warehouse $warehouse, User $staff): void
    {
        $low = array_values(array_filter(
            $this->sellables,
            fn (array $entry): bool => $this->availableUnits($entry) < self::RESTOCK_TARGET,
        ));

        if ($low === []) {
            return;
        }

        $this->createReceipt($warehouse, $low, $receivedAt, $staff, false);
    }

    /**
     * @param  array{variant: ProductVariant, product: Product, brand: Brand, warehouse_id: string}  $entry
     */
    private function availableUnits(array $entry): int
    {
        return (int) InventoryStock::query()
            ->forPool($entry['variant']->id, $entry['warehouse_id'])
            ->sum('quantity_available');
    }

    private function buildSellables(Warehouse $warehouse): void
    {
        $brand = Brand::query()->where('slug', 'qaireen-collection')->firstOrFail();

        $variants = ProductVariant::query()
            ->whereHas('product', fn ($query) => $query->where('brand_id', $brand->id))
            ->with('product')
            ->get();

        foreach ($variants as $variant) {
            $this->sellables[] = [
                'variant' => $variant,
                'product' => $variant->product,
                'brand' => $brand,
                'warehouse_id' => $warehouse->id,
            ];
        }
    }

    /**
     * @param  array<int, array{variant: ProductVariant, product: Product, brand: Brand, warehouse_id: string}>  $entries
     */
    private function createReceipt(
        Warehouse $warehouse,
        array $entries,
        CarbonImmutable $receivedAt,
        User $staff,
        bool $opening,
        ReceiptSourceType $source = ReceiptSourceType::Production,
        ?string $notes = null,
    ): void {
        $items = [];

        foreach ($entries as $entry) {
            $scarce = crc32($entry['variant']->id) % 7 === 0;

            $quantity = $opening
                ? ($scarce ? 14 : random_int(16, 20))
                : ($scarce ? 6 : random_int(6, 10));

            $items[] = [
                'variant_id' => $entry['variant']->id,
                'quantity' => $quantity,
                'unit_cost' => round((float) $entry['variant']->price * 0.6, 2),
                'condition' => StockCondition::Good->value,
            ];
        }

        $service = app(StockReceiptService::class);

        $receipt = $service->create([
            'warehouse_id' => $warehouse->id,
            'source_type' => $source,
            'received_at' => $receivedAt,
            'notes' => $notes ?? ($opening ? 'Penerimaan stok awal' : 'Penerimaan stok musiman'),
            'items' => $items,
        ], $staff->id);

        $service->confirm($receipt, $staff->id);

        $receipt->update([
            'receipt_number' => 'SR-'.$receivedAt->format('Ymd').'-'.Str::upper(Str::random(6)),
            'created_at' => $receivedAt,
            'updated_at' => $receivedAt,
        ]);

        StockMovement::query()
            ->where('reference_type', 'stock_receipt')
            ->where('reference_id', $receipt->id)
            ->update(['created_at' => $receivedAt, 'updated_at' => $receivedAt]);
    }

    /**
     * @param  array<string, Warehouse>  $warehouses
     */
    private function seedOrders(array $warehouses, User $staff): void
    {
        $default = $warehouses['GDG-JKT'];
        $start = $this->historyStart();

        for ($offset = 0; $offset < self::MONTHS_OF_HISTORY; $offset++) {
            $monthStart = $start->addMonthsNoOverflow($offset);

            if ($monthStart->greaterThan($this->now)) {
                break;
            }

            $multiplier = self::SEASONALITY[$monthStart->format('Y-m')] ?? 1.0;
            $growth = 1 + ($offset * 0.05);
            $orderCount = (int) round(13 * $growth * $multiplier);

            if ($offset > 0) {
                // Deliveries arrive early in the month, before any order is placed.
                $this->replenishPools($monthStart->setTime(5, 30), $default, $staff);
            }

            $isPartialMonth = $monthStart->endOfMonth()->greaterThan($this->now);
            $lastDay = $isPartialMonth
                ? (int) $monthStart->diffInDays($this->now)
                : (int) $monthStart->daysInMonth - 1;

            if ($isPartialMonth) {
                // The running month has only partly elapsed. Spreading the full
                // month's volume over it would leave every order in the future, so
                // scale it down and keep a visible trickle on the days that exist.
                $orderCount = max(3, (int) round($orderCount * (($lastDay + 1) / $monthStart->daysInMonth)));
            }

            for ($index = 0; $index < $orderCount; $index++) {
                $createdAt = $this->clamp(
                    $monthStart
                        ->addDays(random_int(0, max(0, $lastDay)))
                        ->setTime(random_int(6, 22), random_int(0, 59)),
                );

                $customer = $this->pickCustomer($createdAt);

                if ($customer === null) {
                    continue;
                }

                $this->createOrder($customer, $createdAt, $default, $staff);
            }
        }
    }

    /**
     * @return array{id: string, name: string, phone: string, signup: CarbonImmutable, address: array<string, string>}|null
     */
    private function pickCustomer(CarbonImmutable $createdAt): ?array
    {
        $eligible = array_values(array_filter(
            $this->customers,
            fn (array $customer): bool => $customer['signup']->lessThanOrEqualTo($createdAt),
        ));

        if ($eligible === []) {
            return null;
        }

        return $eligible[random_int(0, count($eligible) - 1)];
    }

    /**
     * @param  array{id: string, name: string, phone: string, signup: CarbonImmutable, address: array<string, string>}  $customer
     */
    private function createOrder(array $customer, CarbonImmutable $createdAt, Warehouse $warehouse, User $staff): void
    {
        $chosen = $this->pickDistinctSellables(random_int(1, 3));

        if ($chosen === []) {
            return;
        }

        $quantities = [];

        foreach ($chosen as $entry) {
            $quantities[$entry['variant']->id] = random_int(1, 3) === 3 ? 2 : 1;
        }

        $subtotal = 0.0;

        foreach ($chosen as $entry) {
            $subtotal += (float) $entry['variant']->price * $quantities[$entry['variant']->id];
        }

        [$couponCode, $discount, $freeShipping] = $this->resolvePromotion($subtotal);

        $courier = self::COURIERS[random_int(0, count(self::COURIERS) - 1)];
        $shippingCost = $freeShipping ? 0.0 : (float) random_int(15000, 32000);
        $grandTotal = $subtotal - $discount + $shippingCost;

        $status = $this->pickStatus($createdAt);
        [$paidAt, $shippedAt, $deliveredAt, $completedAt, $cancelledAt] = $this->timelineFor($status, $createdAt);

        $lastEvent = $completedAt ?? $deliveredAt ?? $shippedAt ?? $paidAt ?? $cancelledAt ?? $createdAt;

        $order = Order::query()->create([
            'order_number' => $this->uniqueOrderNumber($createdAt),
            'user_id' => $customer['id'],
            'status' => $status,
            'subtotal' => $subtotal,
            'discount_total' => $discount,
            'shipping_cost' => $shippingCost,
            'tax_amount' => 0,
            'grand_total' => $grandTotal,
            'coupon_code' => $couponCode,
            'courier_code' => $courier['code'],
            'courier_name' => $courier['name'],
            'courier_service' => $courier['service'],
            'shipping_destination_id' => $customer['address']['rajaongkir_destination_id'],
            'shipping_name' => $customer['address']['recipient_name'],
            'shipping_phone' => $customer['phone'],
            'shipping_address' => $customer['address']['address_line_1'].', '.$customer['address']['address_line_2'],
            'shipping_district' => $customer['address']['district'],
            'shipping_city' => $customer['address']['city'],
            'shipping_province' => $customer['address']['province'],
            'shipping_postal_code' => $customer['address']['postal_code'],
            'billing_name' => $customer['name'],
            'paid_at' => $paidAt,
            'shipped_at' => $shippedAt,
            'delivered_at' => $deliveredAt,
            'completed_at' => $completedAt,
            'cancelled_at' => $cancelledAt,
            'cancellation_reason' => $cancelledAt === null ? null : 'Pembayaran tidak diselesaikan pembeli.',
            'created_at' => $createdAt,
            'updated_at' => $lastEvent,
        ]);

        $remainingDiscount = $discount;
        $items = [];

        foreach ($chosen as $position => $entry) {
            $quantity = $quantities[$entry['variant']->id];
            $gross = (float) $entry['variant']->price * $quantity;

            $share = $subtotal > 0 ? round($discount * $gross / $subtotal, 2) : 0.0;

            if ($position === count($chosen) - 1) {
                $share = round($remainingDiscount, 2);
            }

            $remainingDiscount = round($remainingDiscount - $share, 2);

            $items[] = OrderItem::query()->create([
                'order_id' => $order->id,
                'variant_id' => $entry['variant']->id,
                'brand_id' => $entry['brand']->id,
                'product_name' => $entry['product']->name,
                'variant_sku' => $entry['variant']->sku,
                'variant_size' => $entry['variant']->size,
                'variant_color' => $entry['variant']->color,
                'brand_name' => $entry['brand']->name,
                'unit_price' => (float) $entry['variant']->price,
                'quantity' => $quantity,
                'discount_amount' => $share,
                'line_total' => $gross - $share,
                'warehouse_id' => $warehouse->id,
                'stock_reserved' => false,
                'stock_deducted' => $paidAt !== null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
        }

        $this->createPayment($order, $paidAt, $cancelledAt, $createdAt);

        if ($shippedAt !== null) {
            $this->createShipment($order, $courier, $shippedAt, $deliveredAt, $grandTotal);
        }

        if ($paidAt !== null) {
            $this->deductStock($items, $order, $paidAt, $staff);
        }

        if ($deliveredAt !== null && random_int(1, 100) <= 7) {
            $this->createReturn($order, $items, $deliveredAt, $staff);
        }
    }

    /**
     * @return array<int, array{variant: ProductVariant, product: Product, brand: Brand, warehouse_id: string}>
     */
    private function pickDistinctSellables(int $count): array
    {
        $pool = $this->sellables;
        shuffle($pool);

        $picked = [];
        $seen = [];

        foreach ($pool as $entry) {
            if (isset($seen[$entry['variant']->id])) {
                continue;
            }

            $seen[$entry['variant']->id] = true;
            $picked[] = $entry;

            if (count($picked) === $count) {
                break;
            }
        }

        return $picked;
    }

    /**
     * @return array{0: string|null, 1: float, 2: bool}
     */
    private function resolvePromotion(float $subtotal): array
    {
        $roll = random_int(1, 100);

        if ($roll <= 12 && $subtotal >= 100000) {
            return ['FASHION10', round(min(50000.0, $subtotal * 0.10), 2), false];
        }

        if ($roll <= 20 && $subtotal >= 250000) {
            return ['DISKON50K', 50000.0, false];
        }

        if ($roll <= 45 && $subtotal >= 150000) {
            return ['GRATISONGKIR', 0.0, true];
        }

        return [null, 0.0, false];
    }

    private function pickStatus(CarbonImmutable $createdAt): OrderStatus
    {
        $ageDays = (int) $createdAt->diffInDays($this->now);

        $key = $ageDays >= 20
            ? $this->weightedPick([
                'completed' => 76.0,
                'delivered' => 7.0,
                'shipped' => 4.0,
                'processing' => 2.0,
                'paid' => 1.0,
                'cancelled' => 7.0,
                'refunded' => 3.0,
            ])
            : $this->weightedPick([
                'pending_payment' => 10.0,
                'paid' => 14.0,
                'processing' => 20.0,
                'shipped' => 24.0,
                'delivered' => 20.0,
                'completed' => 4.0,
                'cancelled' => 8.0,
            ]);

        return OrderStatus::from($key);
    }

    /**
     * @return array{0: CarbonImmutable|null, 1: CarbonImmutable|null, 2: CarbonImmutable|null, 3: CarbonImmutable|null, 4: CarbonImmutable|null}
     */
    private function timelineFor(OrderStatus $status, CarbonImmutable $createdAt): array
    {
        if ($status === OrderStatus::PendingPayment) {
            return [null, null, null, null, null];
        }

        if ($status === OrderStatus::Cancelled) {
            return [null, null, null, null, $this->clamp($createdAt->addMinutes(random_int(10, 240)))];
        }

        $paidAt = $this->clamp($createdAt->addMinutes(random_int(5, 180)));

        if ($status === OrderStatus::Paid) {
            return [$paidAt, null, null, null, null];
        }

        if ($status === OrderStatus::Processing) {
            return [$paidAt, null, null, null, null];
        }

        $shippedAt = $this->clamp($paidAt->addHours(random_int(6, 40)));

        if ($status === OrderStatus::Shipped) {
            return [$paidAt, $shippedAt, null, null, null];
        }

        $deliveredAt = $this->clamp($shippedAt->addDays(random_int(2, 6)));

        if ($status === OrderStatus::Delivered) {
            return [$paidAt, $shippedAt, $deliveredAt, null, null];
        }

        $completedAt = $this->clamp($deliveredAt->addDays(random_int(1, 9)));

        return [$paidAt, $shippedAt, $deliveredAt, $completedAt, null];
    }

    private function clamp(CarbonImmutable $moment): CarbonImmutable
    {
        return $moment->greaterThan($this->now) ? $this->now->subMinutes(random_int(5, 120)) : $moment;
    }

    private function createPayment(Order $order, ?CarbonImmutable $paidAt, ?CarbonImmutable $cancelledAt, CarbonImmutable $createdAt): void
    {
        $method = ['bank_transfer', 'ewallet', 'cod'][random_int(0, 2)];

        if ($paidAt !== null) {
            Payment::query()->create([
                'order_id' => $order->id,
                'payment_method' => $method,
                'payment_gateway' => 'midtrans',
                'gateway_transaction_id' => 'SNAP-'.Str::upper(Str::random(12)),
                'gateway_response' => ['transaction_status' => 'settlement', 'fraud_status' => 'accept'],
                'amount' => (float) $order->grand_total,
                'status' => PaymentStatus::Paid,
                'paid_at' => $paidAt,
                'created_at' => $createdAt,
                'updated_at' => $paidAt,
            ]);

            return;
        }

        Payment::query()->create([
            'order_id' => $order->id,
            'payment_method' => $method,
            'payment_gateway' => 'midtrans',
            'gateway_transaction_id' => 'SNAP-'.Str::upper(Str::random(12)),
            'gateway_response' => ['transaction_status' => $cancelledAt === null ? 'pending' : 'expire'],
            'amount' => (float) $order->grand_total,
            'status' => $cancelledAt === null ? PaymentStatus::Pending : PaymentStatus::Expired,
            'expired_at' => $createdAt->addDay(),
            'created_at' => $createdAt,
            'updated_at' => $cancelledAt ?? $createdAt,
        ]);
    }

    /**
     * @param  array{code: string, name: string, service: string}  $courier
     */
    private function createShipment(
        Order $order,
        array $courier,
        CarbonImmutable $shippedAt,
        ?CarbonImmutable $deliveredAt,
        float $grandTotal,
    ): void {
        $history = [
            [
                'status' => 'picked_up',
                'description' => 'Paket diterima di drop point',
                'location' => 'Jakarta Pusat',
                'timestamp' => $shippedAt->toIso8601String(),
            ],
        ];

        if ($deliveredAt !== null) {
            $history[] = [
                'status' => 'in_transit',
                'description' => 'Paket dalam perjalanan ke kota tujuan',
                'location' => 'Jakarta Pusat',
                'timestamp' => $shippedAt->addHours(12)->toIso8601String(),
            ];
            $history[] = [
                'status' => 'delivered',
                'description' => 'Paket diterima oleh '.$order->shipping_name,
                'location' => $order->shipping_city,
                'timestamp' => $deliveredAt->toIso8601String(),
            ];
        }

        Shipment::query()->create([
            'order_id' => $order->id,
            'courier_code' => $courier['code'],
            'courier_name' => $courier['name'],
            'courier_service' => $courier['service'],
            'tracking_number' => Str::upper($courier['code']).random_int(1000000000, 9999999999),
            'shipping_cost' => (float) $order->shipping_cost,
            'status' => $deliveredAt === null ? ShipmentStatus::InTransit : ShipmentStatus::Delivered,
            'shipped_at' => $shippedAt,
            'delivered_at' => $deliveredAt,
            'estimated_delivery' => $shippedAt->addDays(3),
            'tracking_history' => $history,
            'last_tracked_at' => $deliveredAt ?? $shippedAt->addHours(12),
            'created_at' => $shippedAt,
            'updated_at' => $deliveredAt ?? $shippedAt,
        ]);
    }

    /**
     * @param  array<int, OrderItem>  $items
     */
    private function deductStock(array $items, Order $order, CarbonImmutable $paidAt, User $staff): void
    {
        $stock = app(StockService::class);

        foreach ($items as $item) {
            $movement = $this->deductItem($stock, $item, $order, $staff);

            if ($movement === null) {
                // The pool ran dry before the sale. A store reorders rather than
                // losing the sale, so receive a batch first and try once more.
                $this->restockForSale($item, $paidAt->subMinutes(random_int(15, 90)), $staff);

                $movement = $this->deductItem($stock, $item, $order, $staff);
            }

            if ($movement === null) {
                $item->update(['stock_deducted' => false]);

                continue;
            }

            $movement->update(['created_at' => $paidAt, 'updated_at' => $paidAt]);
        }
    }

    private function deductItem(StockService $stock, OrderItem $item, Order $order, User $staff): ?StockMovement
    {
        try {
            return $stock->deduct([
                'variant_id' => $item->variant_id,
                'warehouse_id' => $item->warehouse_id,
                'quantity' => $item->quantity,
                'movement_type' => MovementType::Sale,
                'reference_type' => 'order_item',
                'reference_id' => $item->id,
                'notes' => 'Pesanan '.$order->order_number,
                'created_by' => $staff->id,
            ]);
        } catch (InsufficientStockException) {
            return null;
        }
    }

    /**
     * Receive a replacement batch for a variant whose pool ran dry.
     *
     * The receipt is dated just before the sale, the way a store reorders when a
     * shelf empties, so the ledger stays complete and no sale is ever booked
     * against stock that never existed.
     */
    private function restockForSale(OrderItem $item, CarbonImmutable $receivedAt, User $staff): void
    {
        $entry = $this->sellableForVariant($item->variant_id);

        if ($entry === null) {
            return;
        }

        $warehouse = Warehouse::query()->find($item->warehouse_id);

        if ($warehouse === null) {
            return;
        }

        $this->createReceipt(
            $warehouse,
            [$entry],
            $receivedAt,
            $staff,
            false,
            ReceiptSourceType::Purchase,
            'Pengisian ulang stok mendesak',
        );
    }

    /**
     * @return array{variant: ProductVariant, product: Product, brand: Brand, warehouse_id: string}|null
     */
    private function sellableForVariant(string $variantId): ?array
    {
        foreach ($this->sellables as $entry) {
            if ($entry['variant']->id === $variantId) {
                return $entry;
            }
        }

        return null;
    }

    /**
     * @param  array<int, OrderItem>  $items
     */
    private function createReturn(Order $order, array $items, CarbonImmutable $deliveredAt, User $staff): void
    {
        $item = $items[random_int(0, count($items) - 1)];

        $requestedAt = $this->clamp($deliveredAt->addDays(random_int(1, 10)));
        $approvedAt = $this->clamp($requestedAt->addHours(random_int(4, 30)));
        $receivedAt = $this->clamp($approvedAt->addDays(random_int(2, 5)));
        $refundedAt = $this->clamp($receivedAt->addDays(random_int(1, 4)));

        $quantity = 1;
        $refundAmount = round((float) $item->line_total / max(1, $item->quantity) * $quantity, 2);

        $reason = [
            ReturnReason::SizeMismatch,
            ReturnReason::Damaged,
            ReturnReason::NotAsDescribed,
            ReturnReason::ChangedMind,
        ][random_int(0, 3)];

        $orderReturn = OrderReturn::query()->create([
            'order_id' => $order->id,
            'user_id' => $order->user_id,
            'return_number' => 'RET-'.$requestedAt->format('Ymd').'-'.Str::upper(Str::random(6)),
            'reason_category' => $reason,
            'reason' => 'Pelanggan mengajukan retur untuk '.$item->product_name.'.',
            'status' => ReturnStatus::Refunded,
            'requested_at' => $requestedAt,
            'approved_by' => $staff->id,
            'approved_at' => $approvedAt,
            'verified_by' => $staff->id,
            'received_at' => $receivedAt,
            'resolution' => 'Dana dikembalikan ke metode pembayaran awal.',
            'refund_amount' => $refundAmount,
            'refund_method' => RefundMethod::OriginalPayment,
            'refund_reference' => 'REF-'.Str::upper(Str::random(10)),
            'refunded_at' => $refundedAt,
            'created_at' => $requestedAt,
            'updated_at' => $refundedAt,
        ]);

        $returnItem = ReturnItem::query()->create([
            'return_id' => $orderReturn->id,
            'order_item_id' => $item->id,
            'quantity' => $quantity,
            'condition' => StockCondition::Good->value,
            'is_restocked' => true,
            'refund_amount' => $refundAmount,
            'reason' => $reason->value,
            'created_at' => $receivedAt,
            'updated_at' => $receivedAt,
        ]);

        $movement = app(StockService::class)->receive([
            'variant_id' => $item->variant_id,
            'warehouse_id' => $item->warehouse_id,
            'quantity' => $quantity,
            'movement_type' => MovementType::ReturnIn,
            'reference_type' => 'return_item',
            'reference_id' => $returnItem->id,
            'notes' => 'Retur '.$orderReturn->return_number,
            'created_by' => $staff->id,
        ]);

        $movement->update(['created_at' => $receivedAt, 'updated_at' => $receivedAt]);
    }

    /**
     * @param  array<string, float>  $weights
     */
    private function weightedPick(array $weights): string
    {
        $roll = random_int(1, 1000000) / 1000000 * array_sum($weights);

        foreach ($weights as $key => $weight) {
            $roll -= $weight;

            if ($roll <= 0) {
                return $key;
            }
        }

        return (string) array_key_last($weights);
    }

    private function uniqueOrderNumber(CarbonImmutable $createdAt): string
    {
        do {
            $number = 'ORD-'.$createdAt->format('Ymd').'-'.Str::upper(Str::random(6));
        } while (Order::query()->where('order_number', $number)->exists());

        return $number;
    }

    private function historyStart(): CarbonImmutable
    {
        return CarbonImmutable::now()
            ->startOfMonth()
            ->subMonthsNoOverflow(self::MONTHS_OF_HISTORY - 1);
    }

    private function variantSku(string $productName, string $size, string $color): string
    {
        return Str::upper(Str::slug($productName)).'-'.$size.'-'.Str::upper(Str::slug($color));
    }
}
