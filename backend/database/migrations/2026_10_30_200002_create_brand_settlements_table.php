<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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

            $table->string('status', 20)->default('draft'); // draft | calculated | confirmed | paid | disputed
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignUuid('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'brand_partner_id', 'period_start', 'period_end']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_settlements');
    }
};
