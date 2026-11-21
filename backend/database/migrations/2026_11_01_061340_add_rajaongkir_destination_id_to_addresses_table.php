<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            // RajaOngkir city id chosen in the address form, used to quote
            // shipping tariffs without asking the customer to retype it.
            $table->string('rajaongkir_destination_id', 20)->nullable()->after('postal_code');
        });
    }

    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropColumn('rajaongkir_destination_id');
        });
    }
};
