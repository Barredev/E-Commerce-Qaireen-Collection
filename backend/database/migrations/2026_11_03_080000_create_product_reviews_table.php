<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // One review per purchased line, and the order it came from.
            $table->foreignUuid('order_item_id')->unique()->constrained('order_items')->cascadeOnDelete();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignUuid('variant_id')
                ->nullable()
                ->constrained('product_variants')
                ->nullOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();

            $table->smallInteger('rating');
            $table->text('comment')->nullable();

            // Aspect ratings kept in their own columns so they stay queryable
            // without parsing free-form text.
            $table->smallInteger('material_rating')->nullable();
            $table->string('size_fit', 20)->nullable(); // too_small | fit | too_large

            $table->boolean('is_hidden')->default(false);
            $table->timestamp('hidden_at')->nullable();
            $table->string('hidden_reason')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['product_id', 'is_hidden', 'created_at']);
            $table->index(['order_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['rating', 'created_at']);
            $table->index('variant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_reviews');
    }
};
