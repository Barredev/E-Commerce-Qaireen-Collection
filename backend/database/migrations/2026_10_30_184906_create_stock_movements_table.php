<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('variant_id')
                ->constrained('product_variants')
                ->cascadeOnDelete();
            $table->foreignUuid('warehouse_id')->constrained()->cascadeOnDelete();
            $table->string('movement_type', 30);
            $table->string('reference_type', 50)->nullable();
            $table->uuid('reference_id')->nullable();
            // Positive = stock in, negative = stock out.
            $table->integer('quantity');
            $table->integer('balance_after');
            $table->string('ownership_type', 20);
            $table->foreignUuid('brand_partner_id')
                ->nullable()
                ->constrained('brand_partners')
                ->nullOnDelete();
            $table->string('notes')->nullable();
            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['variant_id', 'warehouse_id', 'created_at']);
            $table->index(['reference_type', 'reference_id']);
            $table->index(['movement_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
