<?php

namespace App\Modules\Inventory\Controllers;

use App\Models\StockMovement;
use App\Modules\Inventory\Resources\StockMovementResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StockMovementController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $movements = StockMovement::query()
            ->with(['warehouse', 'variant.product', 'author:id,name'])
            ->when($request->filled('variant_id'), fn ($query) => $query->where('variant_id', $request->string('variant_id')))
            ->when($request->filled('warehouse_id'), fn ($query) => $query->where('warehouse_id', $request->string('warehouse_id')))
            ->when($request->filled('movement_type'), fn ($query) => $query->where('movement_type', $request->string('movement_type')))
            ->when($request->filled('reference_type'), fn ($query) => $query->where('reference_type', $request->string('reference_type')))
            ->when($request->filled('from'), fn ($query) => $query->whereDate('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($query) => $query->whereDate('created_at', '<=', $request->date('to')))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(min(max($request->integer('per_page', 50), 1), 100))
            ->withQueryString();

        return StockMovementResource::collection($movements);
    }
}
