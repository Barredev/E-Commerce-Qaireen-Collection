<?php

use App\Modules\Promotion\Controllers\Admin\PromotionController;
use App\Modules\Promotion\Controllers\CouponController;
use App\Modules\Promotion\Controllers\NewsletterController;
use App\Modules\Promotion\Controllers\PublicPromotionController;
use Illuminate\Support\Facades\Route;

// Storefront: promosi yang sedang berjalan & pendaftaran newsletter
Route::get('/promotions', [PublicPromotionController::class, 'index']);
Route::post('/newsletter', [NewsletterController::class, 'store'])->middleware('throttle:10,1');

// Customer / Storefront Coupon Validation
Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/checkout/apply-coupon', [CouponController::class, 'apply']);
});

// Admin Promotions Management
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function (): void {
    Route::get('/promotions', [PromotionController::class, 'index']);
    Route::post('/promotions', [PromotionController::class, 'store']);
    Route::get('/promotions/{id}', [PromotionController::class, 'show']);
    Route::put('/promotions/{id}', [PromotionController::class, 'update']);
    Route::delete('/promotions/{id}', [PromotionController::class, 'destroy']);
    Route::patch('/promotions/{id}/toggle-active', [PromotionController::class, 'toggleActive']);
});
