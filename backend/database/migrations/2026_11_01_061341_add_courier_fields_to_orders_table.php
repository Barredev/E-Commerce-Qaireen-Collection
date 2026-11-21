<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Courier picked at checkout, frozen on the order so admin
            // fulfilment does not have to retype it.
            $table->string('courier_code', 50)->nullable()->after('coupon_code');
            $table->string('courier_name', 100)->nullable()->after('courier_code');
            $table->string('courier_service', 100)->nullable()->after('courier_name');
            $table->string('shipping_destination_id', 20)->nullable()->after('courier_service');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'courier_code',
                'courier_name',
                'courier_service',
                'shipping_destination_id',
            ]);
        });
    }
};
