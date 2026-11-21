<?php

namespace App\Modules\Order\Controllers;

use App\Models\Order;
use App\Modules\Order\Enums\OrderStatus;
use App\Modules\Order\Resources\OrderResource;
use App\Modules\Order\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class OrderController
{
    public function __construct(private readonly OrderService $orders) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $orders = Order::query()
            ->forUser($request->user()->id)
            ->with(['items'])
            ->withCount('items')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 10), 1), 50))
            ->withQueryString();

        return OrderResource::collection($orders);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $this->ensureOwnedBy($request, $order);

        $order->load(['items.variant.product', 'payments', 'shipments', 'returns.items.orderItem']);

        return response()->json(['data' => new OrderResource($order)]);
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        $this->ensureOwnedBy($request, $order);

        if (! in_array($order->status, OrderStatus::cancellable(), true)) {
            throw ValidationException::withMessages([
                'status' => ['Pesanan ini sudah tidak dapat dibatalkan.'],
            ]);
        }

        $cancelled = $this->orders->cancel(
            $order,
            $request->string('reason')->trim()->toString() ?: 'Dibatalkan oleh pelanggan.',
        );

        return response()->json(['data' => new OrderResource($cancelled)]);
    }

    private function ensureOwnedBy(Request $request, Order $order): void
    {
        abort_unless($order->user_id === $request->user()->id, 404);
    }
}
