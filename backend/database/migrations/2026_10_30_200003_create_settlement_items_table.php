<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settlement_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('settlement_id')->constrained('brand_settlements')->cascadeOnDelete();
            $table->foreignUuid('order_item_id')->constrained('order_items')->cascadeOnDelete();

            $table->string('order_number', 50);
            $table->string('product_name');
            $table->string('variant_sku', 100);
            $table->integer('quantity');

            $table->decimal('gross_amount', 12, 2);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('net_amount', 12, 2);
            $table->decimal('commission_rate', 5, 2); // e.g. 20.00 (%)
            $table->decimal('commission_amount', 12, 2);
            $table->decimal('partner_amount', 12, 2);
            $table->boolean('is_return')->default(false);

            $table->timestamp('created_at')->nullable();

            $table->index(['settlement_id', 'order_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settlement_items');
    }
};
