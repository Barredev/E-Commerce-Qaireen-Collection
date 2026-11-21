<?php

use App\Modules\Inventory\Controllers\InventoryLookupController;
use App\Modules\Inventory\Controllers\InventoryStockController;
use App\Modules\Inventory\Controllers\StockAdjustmentController;
use App\Modules\Inventory\Controllers\StockMovementController;
use App\Modules\Inventory\Controllers\StockReceiptController;
use App\Modules\Inventory\Controllers\WarehouseController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Warehouse management (admin only)
|--------------------------------------------------------------------------
*/
Route::prefix('admin')
    ->middleware(['auth:sanctum', 'role:admin'])
    ->group(function (): void {
        Route::apiResource('warehouses', WarehouseController::class);
        Route::put('warehouses/{warehouse}/default', [WarehouseController::class, 'makeDefault']);
    });

/*
|--------------------------------------------------------------------------
| Stock operations (admin and warehouse staff)
|--------------------------------------------------------------------------
*/
Route::prefix('admin/inventory')
    ->middleware(['auth:sanctum', 'role:admin,warehouse'])
    ->group(function (): void {
        Route::get('warehouses', [InventoryLookupController::class, 'warehouses']);
        Route::get('variants', [InventoryLookupController::class, 'variants']);

        Route::get('stocks', [InventoryStockController::class, 'index']);
        Route::get('movements', [StockMovementController::class, 'index']);

        Route::get('receipts', [StockReceiptController::class, 'index']);
        Route::post('receipts', [StockReceiptController::class, 'store']);
        Route::get('receipts/{receipt}', [StockReceiptController::class, 'show']);
        Route::put('receipts/{receipt}', [StockReceiptController::class, 'update']);
        Route::put('receipts/{receipt}/confirm', [StockReceiptController::class, 'confirm']);
        Route::put('receipts/{receipt}/cancel', [StockReceiptController::class, 'cancel']);

        Route::post('adjustments', [StockAdjustmentController::class, 'store']);
    });
