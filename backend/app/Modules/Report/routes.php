<?php

use App\Modules\Report\Controllers\Admin\ReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin/reports')->group(function (): void {
    Route::get('/overview', [ReportController::class, 'overview']);
    Route::get('/sales', [ReportController::class, 'sales']);
    Route::get('/inventory', [ReportController::class, 'inventory']);
});
