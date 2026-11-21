<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('size_guides', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('brand_id')
                ->nullable()
                ->constrained()
                ->cascadeOnDelete();
            $table->foreignUuid('product_id')
                ->nullable()
                ->constrained()
                ->cascadeOnDelete();
            $table->string('size_label', 20);
            $table->decimal('chest_cm', 5, 1)->nullable();
            $table->decimal('waist_cm', 5, 1)->nullable();
            $table->decimal('hip_cm', 5, 1)->nullable();
            $table->decimal('length_cm', 5, 1)->nullable();
            $table->timestamps();

            $table->index(['brand_id', 'size_label']);
            $table->index(['product_id', 'size_label']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('size_guides');
    }
};
