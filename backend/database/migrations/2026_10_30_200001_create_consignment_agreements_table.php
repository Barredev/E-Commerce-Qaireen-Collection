<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consignment_agreements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('agreement_number', 50)->unique();
            $table->foreignUuid('brand_id')->constrained('brands')->cascadeOnDelete();
            $table->foreignUuid('brand_partner_id')->constrained('brand_partners')->cascadeOnDelete();

            $table->string('commission_type', 20)->default('percentage'); // percentage | fixed_per_unit
            $table->decimal('commission_value', 8, 2); // e.g. 20.00 (%) or fixed nominal per unit
            $table->string('commission_basis', 30)->default('net_after_discount'); // net_after_discount | gross_sale

            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('settlement_period', 20)->default('monthly'); // weekly | biweekly | monthly
            $table->unsignedSmallInteger('settlement_day')->nullable();

            $table->unsignedSmallInteger('return_window_days')->default(14);
            $table->string('damage_liability', 20)->default('platform'); // platform | partner | shared

            $table->string('status', 20)->default('active'); // draft | active | suspended | expired | terminated
            $table->text('notes')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'brand_id', 'brand_partner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consignment_agreements');
    }
};
