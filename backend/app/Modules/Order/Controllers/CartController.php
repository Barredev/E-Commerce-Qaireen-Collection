<?php

namespace App\Modules\Order\Controllers;

use App\Models\CartItem;
use App\Modules\Order\Requests\AddCartItemRequest;
use App\Modules\Order\Requests\UpdateCartItemRequest;
use App\Modules\Order\Resources\CartResource;
use App\Modules\Order\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CartController
{
    public function __construct(private readonly CartService $carts) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new CartResource($this->carts->forUser($request->user())),
        ]);
    }

    public function store(AddCartItemRequest $request): JsonResponse
    {
        $cart = $this->carts->addItem(
            $request->user(),
            $request->string('variant_id')->toString(),
            $request->integer('quantity'),
        );

        return response()->json(
            ['data' => new CartResource($cart)],
            Response::HTTP_CREATED,
        );
    }

    public function update(UpdateCartItemRequest $request, CartItem $item): JsonResponse
    {
        $cart = $this->carts->updateItem(
            $request->user(),
            $item,
            $request->integer('quantity'),
        );

        return response()->json(['data' => new CartResource($cart)]);
    }

    public function destroy(Request $request, CartItem $item): JsonResponse
    {
        $cart = $this->carts->removeItem($request->user(), $item);

        return response()->json(['data' => new CartResource($cart)]);
    }
}
