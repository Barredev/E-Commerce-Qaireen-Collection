<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Retires the multi-brand marketplace domain.
 *
 * The store keeps a single brand row (its own identity) so `products.brand_id`
 * never needs a data migration, but every consignment/partner concept is
 * removed: partner accounts, agreements, settlements, stock ownership and the
 * per-line partner snapshot.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->renameStoreBrand();
        $this->normalisePromotions();
        $this->mergeDuplicatePools();

        Schema::dropIfExists('settlement_items');
        Schema::dropIfExists('brand_settlements');
        Schema::dropIfExists('consignment_agreements');

        Schema::table('stock_receipts', function (Blueprint $table) {
            $table->dropColumn('consignment_agreement_id');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['brand_type', 'ownership_type']);
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropColumn('ownership_type');
        });

        foreach (['users', 'brands', 'inventory_stocks', 'order_items', 'stock_receipts', 'stock_movements'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropConstrainedForeignId('brand_partner_id');
            });
        }

        Schema::table('inventory_stocks', function (Blueprint $table) {
            $table->dropColumn('ownership_type');
        });

        Schema::table('inventory_stocks', function (Blueprint $table) {
            $table->unique(['variant_id', 'warehouse_id'], 'inventory_stocks_pool_unique');
        });

        Schema::table('brands', function (Blueprint $table) {
            $table->dropColumn('type');
        });

        Schema::dropIfExists('brand_partners');
    }

    public function down(): void
    {
        Schema::create('brand_partners', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('company_name');
            $table->string('contact_person')->nullable();
            $table->string('email');
            $table->string('phone', 20)->nullable();
            $table->text('address')->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->string('bank_account_number', 50)->nullable();
            $table->string('bank_account_holder')->nullable();
            $table->string('npwp', 30)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'company_name']);
        });

        Schema::table('brands', function (Blueprint $table) {
            $table->string('type', 20)->default('own')->index();
            $table->foreignUuid('brand_partner_id')
                ->nullable()
                ->constrained('brand_partners')
                ->nullOnDelete();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->uuid('brand_partner_id')->nullable()->index();
            $table->foreign('brand_partner_id')
                ->references('id')
                ->on('brand_partners')
                ->nullOnDelete();
        });

        Schema::table('inventory_stocks', function (Blueprint $table) {
            $table->dropUnique('inventory_stocks_pool_unique');
        });

        Schema::table('inventory_stocks', function (Blueprint $table) {
            $table->string('ownership_type', 20)->default('own');
            $table->foreignUuid('brand_partner_id')
                ->nullable()
                ->constrained('brand_partners')
                ->nullOnDelete();
            $table->unique(
                ['variant_id', 'warehouse_id', 'ownership_type', 'brand_partner_id'],
                'inventory_stocks_pool_unique'
            )->nullsNotDistinct();
            $table->index(['warehouse_id', 'ownership_type']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->string('brand_type', 20)->default('own');
            $table->string('ownership_type', 20)->default('own');
            $table->foreignUuid('brand_partner_id')
                ->nullable()
                ->constrained('brand_partners')
                ->nullOnDelete();
            $table->index('brand_partner_id');
        });

        Schema::table('stock_receipts', function (Blueprint $table) {
            $table->foreignUuid('brand_partner_id')
                ->nullable()
                ->constrained('brand_partners')
                ->nullOnDelete();
            $table->uuid('consignment_agreement_id')->nullable()->index();
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->string('ownership_type', 20)->default('own');
            $table->foreignUuid('brand_partner_id')
                ->nullable()
                ->constrained('brand_partners')
                ->nullOnDelete();
        });

        Schema::create('consignment_agreements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('agreement_number', 50)->unique();
            $table->foreignUuid('brand_id')->constrained('brands')->cascadeOnDelete();
            $table->foreignUuid('brand_partner_id')->constrained('brand_partners')->cascadeOnDelete();

            $table->string('commission_type', 20)->default('percentage');
            $table->decimal('commission_value', 8, 2);
            $table->string('commission_basis', 30)->default('net_after_discount');

            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('settlement_period', 20)->default('monthly');
            $table->unsignedSmallInteger('settlement_day')->nullable();

            $table->unsignedSmallInteger('return_window_days')->default(14);
            $table->string('damage_liability', 20)->default('platform');

            $table->string('status', 20)->default('active');
            $table->text('notes')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'brand_id', 'brand_partner_id']);
        });

        Schema::create('brand_settlements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('settlement_number', 50)->unique();
            $table->foreignUuid('brand_id')->constrained('brands')->cascadeOnDelete();
            $table->foreignUuid('brand_partner_id')->constrained('brand_partners')->cascadeOnDelete();
            $table->foreignUuid('consignment_agreement_id')->constrained('consignment_agreements')->cascadeOnDelete();

            $table->date('period_start');
            $table->date('period_end');

            $table->decimal('total_gross_sales', 14, 2)->default(0);
            $table->decimal('total_discounts', 14, 2)->default(0);
            $table->decimal('total_net_sales', 14, 2)->default(0);
            $table->decimal('total_returns', 14, 2)->default(0);
            $table->decimal('commission_amount', 14, 2)->default(0);
            $table->decimal('partner_amount', 14, 2)->default(0);
            $table->decimal('adjustments', 14, 2)->default(0);
            $table->decimal('final_amount', 14, 2)->default(0);

            $table->string('status', 20)->default('draft');
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignUuid('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'brand_partner_id', 'period_start', 'period_end']);
        });

        Schema::create('settlement_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('settlement_id')->constrained('brand_settlements')->cascadeOnDelete();
            $table->foreignUuid('order_item_id')->constrained('order_items')->cascadeOnDelete();
            $table->foreignUuid('return_item_id')
                ->nullable()
                ->constrained('return_items')
                ->nullOnDelete();

            $table->string('order_number', 50);
            $table->string('product_name');
            $table->string('variant_sku', 100);
            $table->integer('quantity');

            $table->decimal('gross_amount', 12, 2);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('net_amount', 12, 2);
            $table->decimal('commission_rate', 5, 2);
            $table->decimal('commission_amount', 12, 2);
            $table->decimal('partner_amount', 12, 2);
            $table->boolean('is_return')->default(false);

            $table->timestamp('created_at')->nullable();

            $table->index(['settlement_id', 'order_item_id']);
            $table->index('return_item_id');
        });
    }

    /**
     * Point the single own brand at the store identity before its marketplace
     * columns disappear, so every product keeps its existing brand row.
     */
    private function renameStoreBrand(): void
    {
        if (! Schema::hasColumn('brands', 'type')) {
            return;
        }

        $storeBrand = DB::table('brands')
            ->where('type', 'own')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->first();

        if ($storeBrand === null) {
            return;
        }

        $slugTaken = DB::table('brands')
            ->where('slug', 'qaireen-collection')
            ->where('id', '!=', $storeBrand->id)
            ->exists();

        if ($slugTaken) {
            return;
        }

        DB::table('brands')->where('id', $storeBrand->id)->update([
            'name' => 'Qaireen Collection',
            'slug' => 'qaireen-collection',
            'is_active' => true,
        ]);
    }

    /**
     * Promotions no longer know about partners or brand targeting; fold any
     * surviving rows back onto the values the trimmed enums still accept.
     */
    private function normalisePromotions(): void
    {
        DB::table('promotions')->where('discount_bearer', 'partner')->update(['discount_bearer' => 'platform']);
        DB::table('promotions')->where('applies_to', 'brand')->update(['applies_to' => 'all']);
    }

    /**
     * The old unique key allowed one pool per (variant, warehouse, ownership,
     * partner). With ownership gone those rows must collapse into one, otherwise
     * the new unique key cannot be created.
     */
    private function mergeDuplicatePools(): void
    {
        $duplicates = DB::table('inventory_stocks')
            ->select('variant_id', 'warehouse_id')
            ->groupBy('variant_id', 'warehouse_id')
            ->havingRaw('count(*) > 1')
            ->get();

        foreach ($duplicates as $duplicate) {
            $pools = DB::table('inventory_stocks')
                ->where('variant_id', $duplicate->variant_id)
                ->where('warehouse_id', $duplicate->warehouse_id)
                ->orderByDesc('quantity_on_hand')
                ->get();

            $keep = $pools->first();

            DB::table('inventory_stocks')->where('id', $keep->id)->update([
                'quantity_on_hand' => $pools->sum('quantity_on_hand'),
                'quantity_reserved' => $pools->sum('quantity_reserved'),
                'low_stock_threshold' => $pools->max('low_stock_threshold'),
            ]);

            DB::table('inventory_stocks')
                ->whereIn('id', $pools->skip(1)->pluck('id'))
                ->delete();
        }
    }
};
