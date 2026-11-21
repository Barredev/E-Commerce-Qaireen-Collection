<?php

namespace App\Modules\Inventory\Controllers;

use App\Models\StockReceipt;
use App\Modules\Inventory\Requests\StoreStockReceiptRequest;
use App\Modules\Inventory\Requests\UpdateStockReceiptRequest;
use App\Modules\Inventory\Resources\StockReceiptResource;
use App\Modules\Inventory\Services\StockReceiptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class StockReceiptController
{
    public function __construct(private readonly StockReceiptService $receipts) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $receipts = StockReceipt::query()
            ->with(['warehouse', 'receiver:id,name'])
            ->withCount('items')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('source_type'), fn ($query) => $query->where('source_type', $request->string('source_type')))
            ->when($request->filled('warehouse_id'), fn ($query) => $query->where('warehouse_id', $request->string('warehouse_id')))
            ->when($request->filled('from'), fn ($query) => $query->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($query) => $query->whereDate('created_at', '<=', $request->date('to')))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 20), 1), 100))
            ->withQueryString();

        return StockReceiptResource::collection($receipts);
    }

    public function store(StoreStockReceiptRequest $request): JsonResponse
    {
        $receipt = $this->receipts->create($request->validated(), $request->user()?->id);

        return response()->json(
            ['data' => new StockReceiptResource($receipt)],
            Response::HTTP_CREATED,
        );
    }

    public function show(StockReceipt $receipt): JsonResponse
    {
        $receipt->load([
            'warehouse',
            'receiver:id,name',
            'items.variant.product.brand',
        ])->loadCount('items');

        return response()->json(['data' => new StockReceiptResource($receipt)]);
    }

    public function update(UpdateStockReceiptRequest $request, StockReceipt $receipt): JsonResponse
    {
        $updated = $this->receipts->update($receipt, $request->validated());

        return response()->json(['data' => new StockReceiptResource($updated)]);
    }

    public function confirm(Request $request, StockReceipt $receipt): JsonResponse
    {
        $confirmed = $this->receipts->confirm($receipt, $request->user()?->id);

        return response()->json(['data' => new StockReceiptResource($confirmed)]);
    }

    public function cancel(StockReceipt $receipt): JsonResponse
    {
        $cancelled = $this->receipts->cancel($receipt);

        return response()->json(['data' => new StockReceiptResource($cancelled)]);
    }
}
