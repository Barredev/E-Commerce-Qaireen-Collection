<?php

namespace App\Modules\Order\Controllers;

use App\Modules\Order\Requests\CheckoutRequest;
use App\Modules\Order\Resources\OrderResource;
use App\Modules\Order\Services\CheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class CheckoutController
{
    public function __construct(private readonly CheckoutService $checkout) {}

    public function store(CheckoutRequest $request): JsonResponse
    {
        $order = $this->checkout->checkout($request->user(), $request->validated());

        return response()->json(
            ['data' => new OrderResource($order)],
            Response::HTTP_CREATED,
        );
    }
}
