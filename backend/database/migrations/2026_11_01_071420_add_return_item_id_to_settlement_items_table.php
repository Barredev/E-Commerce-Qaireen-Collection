<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('settlement_items', function (Blueprint $table) {
            // Return deductions reuse the original order_item_id, so this link
            // keeps a refunded unit from being deducted by two settlements.
            $table->foreignUuid('return_item_id')
                ->nullable()
                ->constrained('return_items')
                ->nullOnDelete();

            $table->index('return_item_id');
        });
    }

    public function down(): void
    {
        Schema::table('settlement_items', function (Blueprint $table) {
            $table->dropIndex(['return_item_id']);
            $table->dropConstrainedForeignId('return_item_id');
        });
    }
};
