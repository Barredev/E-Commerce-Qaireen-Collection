<?php

namespace App\Modules\Order\Controllers\Admin;

use App\Models\Order;
use App\Modules\Order\Enums\OrderStatus;
use App\Modules\Order\Requests\ShipOrderRequest;
use App\Modules\Order\Requests\UpdateOrderStatusRequest;
use App\Modules\Order\Resources\OrderResource;
use App\Modules\Order\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrderController
{
    public function __construct(private readonly OrderService $orders) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $orders = Order::query()
            ->with(['user', 'items'])
            ->withCount('items')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('q'), function ($query) use ($request): void {
                $term = '%'.$request->string('q')->trim().'%';

                $query->where(fn ($inner) => $inner
                    ->where('order_number', 'ilike', $term)
                    ->orWhereHas('user', fn ($user) => $user
                        ->where('name', 'ilike', $term)
                        ->orWhere('email', 'ilike', $term)));
            })
            ->when($request->filled('from'), fn ($query) => $query->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($query) => $query->whereDate('created_at', '<=', $request->date('to')))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 20), 1), 100))
            ->withQueryString();

        return OrderResource::collection($orders);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load(['user', 'items', 'payments', 'shipments', 'returns']);

        return response()->json(['data' => new OrderResource($order)]);
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): JsonResponse
    {
        $status = OrderStatus::from($request->string('status')->toString());

        $updated = $this->orders->transition(
            $order,
            $status,
            $request->input('reason'),
        );

        return response()->json(['data' => new OrderResource($updated)]);
    }

    public function ship(ShipOrderRequest $request, Order $order): JsonResponse
    {
        $shipped = $this->orders->ship($order, $request->validated());

        return response()->json(['data' => new OrderResource($shipped)]);
    }
}
