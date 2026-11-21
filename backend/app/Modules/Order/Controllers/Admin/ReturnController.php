<?php

namespace App\Modules\Order\Controllers\Admin;

use App\Models\OrderReturn;
use App\Modules\Order\Enums\RefundMethod;
use App\Modules\Order\Requests\ApproveReturnRequest;
use App\Modules\Order\Requests\ReceiveReturnRequest;
use App\Modules\Order\Requests\RefundReturnRequest;
use App\Modules\Order\Requests\RejectReturnRequest;
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
            ->with(['order', 'user', 'items.orderItem'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('q'), function ($query) use ($request): void {
                $term = '%'.$request->string('q')->trim().'%';

                $query->where(fn ($inner) => $inner
                    ->where('return_number', 'ilike', $term)
                    ->orWhereHas('order', fn ($order) => $order->where('order_number', 'ilike', $term)));
            })
            ->when($request->filled('from'), fn ($query) => $query->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($query) => $query->whereDate('created_at', '<=', $request->date('to')))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 20), 1), 100))
            ->withQueryString();

        return ReturnResource::collection($returns);
    }

    public function show(OrderReturn $return): JsonResponse
    {
        $return->load(['order', 'user', 'items.orderItem', 'approvedByUser', 'verifiedByUser']);

        return response()->json(['data' => new ReturnResource($return)]);
    }

    public function approve(ApproveReturnRequest $request, OrderReturn $return): JsonResponse
    {
        $approved = $this->returns->approve(
            $return,
            $request->user(),
            $request->input('resolution'),
        );

        return response()->json(['data' => new ReturnResource($approved)]);
    }

    public function reject(RejectReturnRequest $request, OrderReturn $return): JsonResponse
    {
        $rejected = $this->returns->reject(
            $return,
            $request->user(),
            $request->string('resolution')->trim()->toString(),
        );

        return response()->json(['data' => new ReturnResource($rejected)]);
    }

    public function receive(ReceiveReturnRequest $request, OrderReturn $return): JsonResponse
    {
        $received = $this->returns->receive(
            $return,
            $request->user(),
            $request->validated()['items'],
        );

        return response()->json(['data' => new ReturnResource($received)]);
    }

    public function refund(RefundReturnRequest $request, OrderReturn $return): JsonResponse
    {
        $refunded = $this->returns->refund(
            $return,
            RefundMethod::from($request->string('refund_method')->toString()),
            $request->input('refund_reference'),
        );

        return response()->json(['data' => new ReturnResource($refunded)]);
    }
}
