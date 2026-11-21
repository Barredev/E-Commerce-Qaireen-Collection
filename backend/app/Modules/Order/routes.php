<?php

use App\Modules\Order\Controllers\AddressController;
use App\Modules\Order\Controllers\Admin\OrderController as AdminOrderController;
use App\Modules\Order\Controllers\Admin\ReturnController as AdminReturnController;
use App\Modules\Order\Controllers\Admin\ShipmentController as AdminShipmentController;
use App\Modules\Order\Controllers\CartController;
use App\Modules\Order\Controllers\CheckoutController;
use App\Modules\Order\Controllers\OrderController;
use App\Modules\Order\Controllers\PaymentWebhookController;
use App\Modules\Order\Controllers\ReturnController;
use App\Modules\Order\Controllers\ShippingRateController;
use App\Modules\Order\Controllers\TrackingWebhookController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public webhooks
|--------------------------------------------------------------------------
*/
Route::post('webhooks/payment/midtrans', [PaymentWebhookController::class, 'handleMidtrans']);
Route::post('webhooks/shipping/tracking', [TrackingWebhookController::class, 'handle']);

/*
|--------------------------------------------------------------------------
| Customer cart, checkout, orders, and addresses
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('cart', [CartController::class, 'show']);
    Route::post('cart/items', [CartController::class, 'store']);
    Route::put('cart/items/{item}', [CartController::class, 'update']);
    Route::delete('cart/items/{item}', [CartController::class, 'destroy']);

    Route::get('shipping/rates', [ShippingRateController::class, 'index']);
    Route::get('shipping/destinations', [ShippingRateController::class, 'destinations']);

    Route::post('checkout', [CheckoutController::class, 'store']);

    Route::get('account/orders', [OrderController::class, 'index']);
    Route::get('account/orders/{order:order_number}', [OrderController::class, 'show']);
    Route::post('account/orders/{order:order_number}/cancel', [OrderController::class, 'cancel']);
    Route::post('account/orders/{order:order_number}/pay', [PaymentWebhookController::class, 'createPaymentToken']);
    Route::post('account/orders/{order:order_number}/simulate-pay', [PaymentWebhookController::class, 'simulatePayment']);

    Route::get('account/returns', [ReturnController::class, 'index']);
    Route::post('account/orders/{order:order_number}/returns', [ReturnController::class, 'store']);
    Route::get('account/returns/{return:return_number}', [ReturnController::class, 'show']);
    Route::post('account/returns/{return:return_number}/cancel', [ReturnController::class, 'cancel']);

    Route::get('account/addresses', [AddressController::class, 'index']);
    Route::post('account/addresses', [AddressController::class, 'store']);
    Route::put('account/addresses/{address}', [AddressController::class, 'update']);
    Route::delete('account/addresses/{address}', [AddressController::class, 'destroy']);
});

/*
|--------------------------------------------------------------------------
| Admin order management
|--------------------------------------------------------------------------
*/
Route::prefix('admin')
    ->middleware(['auth:sanctum', 'role:admin'])
    ->group(function (): void {
        Route::get('orders', [AdminOrderController::class, 'index']);
        Route::get('orders/{order}', [AdminOrderController::class, 'show']);
        Route::put('orders/{order}/status', [AdminOrderController::class, 'updateStatus']);
        Route::post('orders/{order}/ship', [AdminOrderController::class, 'ship']);

        Route::post('shipments/{shipment}/track', [AdminShipmentController::class, 'track']);

        Route::get('returns', [AdminReturnController::class, 'index']);
        Route::get('returns/{return}', [AdminReturnController::class, 'show']);
        Route::put('returns/{return}/approve', [AdminReturnController::class, 'approve']);
        Route::put('returns/{return}/reject', [AdminReturnController::class, 'reject']);
        Route::put('returns/{return}/receive', [AdminReturnController::class, 'receive']);
        Route::put('returns/{return}/refund', [AdminReturnController::class, 'refund']);
    });
