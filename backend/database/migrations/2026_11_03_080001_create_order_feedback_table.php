<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_feedback', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // One service feedback per order.
            $table->foreignUuid('order_id')->unique()->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();

            $table->smallInteger('shipping_rating')->nullable();
            $table->smallInteger('service_rating')->nullable();
            $table->text('comment')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['shipping_rating', 'created_at']);
            $table->index(['service_rating', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_feedback');
    }
};
