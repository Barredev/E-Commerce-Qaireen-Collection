<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('returns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->restrictOnDelete();
            $table->string('return_number', 50)->unique();

            $table->string('reason_category', 30); // wrong_item | damaged | not_as_described | ...
            $table->text('reason');
            $table->string('status', 20)->default('requested'); // requested | approved | rejected | received | refunded | cancelled

            $table->timestamp('requested_at')->nullable();
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignUuid('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('received_at')->nullable();
            $table->text('resolution')->nullable();

            $table->decimal('refund_amount', 14, 2)->default(0);
            $table->string('refund_method', 30)->nullable(); // bank_transfer | ewallet | store_credit | original_payment
            $table->string('refund_reference')->nullable();
            $table->timestamp('refunded_at')->nullable();

            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('returns');
    }
};
