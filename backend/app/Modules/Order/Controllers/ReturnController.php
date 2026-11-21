<?php

namespace App\Modules\Order\Controllers;

use App\Models\Order;
use App\Models\OrderReturn;
use App\Modules\Order\Requests\StoreReturnRequest;
use App\Modules\Order\Resources\ReturnResource;
use App\Modules\Order\Services\ReturnService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReturnController
{
    public function __construct(private readonly ReturnService $returns) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $returns = OrderReturn::query()
            ->where('user_id', $request->user()->id)
            ->with(['order', 'items.orderItem'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 10), 1), 50))
            ->withQueryString();

        return ReturnResource::collection($returns);
    }

    public function store(StoreReturnRequest $request, Order $order): JsonResponse
    {
        $this->ensureOwnedBy($request, $order);

        $return = $this->returns->request($order, $request->user(), $request->validated());

        return response()->json(['data' => new ReturnResource($return)], 201);
    }

    public function show(Request $request, OrderReturn $return): JsonResponse
    {
        $this->ensureOwnedBy($request, $return->order);

        $return->load(['order', 'items.orderItem']);

        return response()->json(['data' => new ReturnResource($return)]);
    }

    public function cancel(Request $request, OrderReturn $return): JsonResponse
    {
        $this->ensureOwnedBy($request, $return->order);

        $cancelled = $this->returns->cancel($return, $request->user());

        return response()->json(['data' => new ReturnResource($cancelled)]);
    }

    private function ensureOwnedBy(Request $request, ?Order $order): void
    {
        abort_unless($order !== null && $order->user_id === $request->user()->id, 404);
    }
}
