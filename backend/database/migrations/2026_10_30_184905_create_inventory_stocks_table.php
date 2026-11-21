<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_stocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('variant_id')
                ->constrained('product_variants')
                ->cascadeOnDelete();
            $table->foreignUuid('warehouse_id')->constrained()->cascadeOnDelete();
            $table->string('ownership_type', 20)->default('own');
            $table->foreignUuid('brand_partner_id')
                ->nullable()
                ->constrained('brand_partners')
                ->nullOnDelete();
            $table->integer('quantity_on_hand')->default(0);
            $table->integer('quantity_reserved')->default(0);
            // Sellable quantity is derived so it can never drift from the ledger.
            $table->integer('quantity_available')
                ->storedAs('quantity_on_hand - quantity_reserved');
            $table->integer('low_stock_threshold')->default(5);
            $table->timestamps();

            // `nullsNotDistinct` makes the NULL partner id collide for own stock;
            // PostgreSQL otherwise treats NULLs as distinct and allows duplicates.
            $table->unique(
                ['variant_id', 'warehouse_id', 'ownership_type', 'brand_partner_id'],
                'inventory_stocks_pool_unique'
            )->nullsNotDistinct();

            $table->index(['warehouse_id', 'ownership_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_stocks');
    }
};
