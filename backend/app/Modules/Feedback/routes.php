<?php

use App\Modules\Feedback\Controllers\Admin\ReviewController as AdminReviewController;
use App\Modules\Feedback\Controllers\OrderFeedbackController;
use App\Modules\Feedback\Controllers\ProductReviewController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public product reviews
|--------------------------------------------------------------------------
*/
Route::get('products/{product:slug}/reviews', [ProductReviewController::class, 'index']);

/*
|--------------------------------------------------------------------------
| Customer feedback for their own orders
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('account/orders/{order:order_number}/feedback', [OrderFeedbackController::class, 'show']);
    Route::post('account/orders/{order:order_number}/feedback', [OrderFeedbackController::class, 'store']);
});

/*
|--------------------------------------------------------------------------
| Admin review moderation
|--------------------------------------------------------------------------
*/
Route::prefix('admin')
    ->middleware(['auth:sanctum', 'role:admin'])
    ->group(function (): void {
        Route::get('reviews', [AdminReviewController::class, 'index']);
        Route::patch('reviews/{review}/toggle-visibility', [AdminReviewController::class, 'toggleVisibility']);
    });
