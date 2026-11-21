<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            // Manifest timeline fed by the courier tracking webhook.
            $table->jsonb('tracking_history')->nullable()->after('estimated_delivery');
            $table->timestamp('last_tracked_at')->nullable()->after('tracking_history');
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn(['tracking_history', 'last_tracked_at']);
        });
    }
};
