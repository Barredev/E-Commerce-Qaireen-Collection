<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('variant_id')
                ->constrained('product_variants')
                ->restrictOnDelete();
            $table->foreignUuid('brand_id')->constrained()->restrictOnDelete();

            // Snapshot fields, frozen at checkout time.
            $table->string('product_name');
            $table->string('variant_sku', 100);
            $table->string('variant_size', 20);
            $table->string('variant_color', 50);
            $table->string('brand_name');
            $table->string('brand_type', 20);

            $table->decimal('unit_price', 12, 2);
            $table->integer('quantity');
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('line_total', 14, 2);

            // Inventory ownership of the stock pool reserved for this line.
            $table->string('ownership_type', 20)->default('own');
            $table->foreignUuid('brand_partner_id')
                ->nullable()
                ->constrained('brand_partners')
                ->nullOnDelete();
            $table->foreignUuid('warehouse_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            $table->boolean('stock_reserved')->default(false);
            $table->boolean('stock_deducted')->default(false);

            $table->timestamps();

            $table->index('order_id');
            $table->index(['brand_id', 'created_at']);
            $table->index('brand_partner_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
