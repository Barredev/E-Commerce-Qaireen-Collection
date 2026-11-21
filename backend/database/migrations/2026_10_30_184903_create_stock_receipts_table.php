<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_receipts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('receipt_number', 50)->unique();
            $table->foreignUuid('warehouse_id')->constrained()->restrictOnDelete();
            $table->string('source_type', 30);
            $table->foreignUuid('brand_partner_id')
                ->nullable()
                ->constrained('brand_partners')
                ->nullOnDelete();
            // Foreign key is added once the consignment module exists.
            $table->uuid('consignment_agreement_id')->nullable()->index();
            $table->foreignUuid('received_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('received_at')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['warehouse_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_receipts');
    }
};
