<?php

namespace App\Modules\Inventory\Controllers;

use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Requests\StoreStockAdjustmentRequest;
use App\Modules\Inventory\Resources\StockMovementResource;
use App\Modules\Inventory\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class StockAdjustmentController
{
    public function __construct(private readonly StockService $stock) {}

    public function store(StoreStockAdjustmentRequest $request): JsonResponse
    {
        $data = $request->validated();

        $movement = $this->stock->adjust([
            'variant_id' => $data['variant_id'],
            'warehouse_id' => $data['warehouse_id'],
            'new_quantity' => $data['new_quantity'],
            'low_stock_threshold' => $data['low_stock_threshold'] ?? null,
            'movement_type' => MovementType::Adjustment,
            'reference_type' => 'stock_adjustment',
            'notes' => $data['notes'],
            'created_by' => $request->user()?->id,
        ]);

        $movement->load(['warehouse', 'variant.product.brand', 'author:id,name']);

        return response()->json(
            ['data' => new StockMovementResource($movement)],
            Response::HTTP_CREATED,
        );
    }
}
