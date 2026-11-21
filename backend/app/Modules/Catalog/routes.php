<?php

use App\Modules\Catalog\Controllers\Admin\BrandController as AdminBrandController;
use App\Modules\Catalog\Controllers\Admin\CategoryController as AdminCategoryController;
use App\Modules\Catalog\Controllers\Admin\ProductController as AdminProductController;
use App\Modules\Catalog\Controllers\Admin\ProductImageController as AdminProductImageController;
use App\Modules\Catalog\Controllers\Admin\ProductVariantController as AdminProductVariantController;
use App\Modules\Catalog\Controllers\CategoryController;
use App\Modules\Catalog\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public storefront catalog
|--------------------------------------------------------------------------
*/
Route::get('categories', [CategoryController::class, 'index']);
Route::get('categories/{category:slug}', [CategoryController::class, 'show']);
Route::get('products', [ProductController::class, 'index']);
Route::get('products/{product:slug}', [ProductController::class, 'show']);

/*
|--------------------------------------------------------------------------
| Admin catalog management
|--------------------------------------------------------------------------
*/
Route::prefix('admin')
    ->middleware(['auth:sanctum', 'role:admin'])
    ->group(function (): void {
        Route::apiResource('brands', AdminBrandController::class);
        Route::apiResource('categories', AdminCategoryController::class);
        Route::apiResource('products', AdminProductController::class);

        Route::post('products/{product}/variants', [AdminProductVariantController::class, 'store']);
        Route::put('products/{product}/variants/{variant}', [AdminProductVariantController::class, 'update'])
            ->scopeBindings();
        Route::delete('products/{product}/variants/{variant}', [AdminProductVariantController::class, 'destroy'])
            ->scopeBindings();

        Route::put('products/{product}/images/reorder', [AdminProductImageController::class, 'reorder']);
        Route::post('products/{product}/images', [AdminProductImageController::class, 'store']);
        Route::delete('products/{product}/images/{image}', [AdminProductImageController::class, 'destroy'])
            ->scopeBindings();
    });
