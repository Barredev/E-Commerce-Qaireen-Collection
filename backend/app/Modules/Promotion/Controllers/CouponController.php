<?php

namespace App\Modules\Promotion\Controllers;

use App\Modules\Order\Services\CartService;
use App\Modules\Promotion\Requests\ApplyCouponRequest;
use App\Modules\Promotion\Services\PromotionService;
use Illuminate\Http\JsonResponse;

class CouponController
{
    public function __construct(
        private readonly PromotionService $promotions,
        private readonly CartService $carts,
    ) {}

    public function apply(ApplyCouponRequest $request): JsonResponse
    {
        $user = $request->user();
        $cart = $this->carts->forUser($user);

        $result = $this->promotions->validateAndCalculate(
            $request->input('code'),
            $cart,
            $user,
        );

        return response()->json([
            'data' => $result,
        ]);
    }
}
